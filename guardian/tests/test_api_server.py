import pytest
from unittest.mock import MagicMock, patch
import api_server
from fastapi.testclient import TestClient


def make_mock_scanner():
    """Return a mock ComputerScannerAgent with relevant methods."""
    scanner = MagicMock()
    scanner.scan_paths = []
    scanner.skip_balance_check = False
    scanner.deep_scan = False
    scanner.btc_recover_tokens = []
    scanner.richlist_path = None
    return scanner


def make_mock_orchestrator(scanner=None):
    """Return a mock orchestrator with a computer_scanner."""
    orchestrator = MagicMock()
    orchestrator.computer_scanner = scanner or make_mock_scanner()
    return orchestrator


@pytest.fixture(autouse=True)
def reset_orchestrator():
    """Reset the global orchestrator before each test."""
    original = api_server.orchestrator
    yield
    api_server.orchestrator = original


@pytest.fixture
def client_with_scanner():
    """Return a TestClient with a fully mocked orchestrator."""
    scanner = make_mock_scanner()
    orchestrator = make_mock_orchestrator(scanner)
    api_server.orchestrator = orchestrator
    client = TestClient(api_server.app)
    return client, orchestrator, scanner


# ---- Tests for start_scan richlist handling changes in this PR ----

class TestStartScanRichlist:

    def test_no_richlist_does_not_call_add_to_richlist(self, client_with_scanner):
        """Verify add_to_richlist is NOT called when no richlist is provided"""
        client, orchestrator, scanner = client_with_scanner
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": None})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_not_called()

    def test_richlist_file_path_loads_from_file(self, client_with_scanner, tmp_path):
        """Verify a valid file path triggers _load_richlist rather than add_to_richlist"""
        client, orchestrator, scanner = client_with_scanner
        richlist_file = tmp_path / "richlist.txt"
        richlist_file.write_text("1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH\n")
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": str(richlist_file)})
        assert response.status_code == 200
        # richlist_path should be set and _load_richlist called
        assert scanner.richlist_path == str(richlist_file)
        scanner._load_richlist.assert_called_once()
        scanner.add_to_richlist.assert_not_called()

    def test_richlist_single_address_long_enough_calls_add(self, client_with_scanner):
        """Verify a single crypto address (>= 26 chars) is passed directly to add_to_richlist as a list"""
        client, orchestrator, scanner = client_with_scanner
        address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"  # 34 chars
        assert len(address) >= 26
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": address})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_called_once_with([address])

    def test_richlist_bech32_address_calls_add(self, client_with_scanner):
        """Verify a bech32 address is passed directly to add_to_richlist as a list"""
        client, orchestrator, scanner = client_with_scanner
        address = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"  # 42 chars
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": address})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_called_once_with([address])

    def test_richlist_too_short_does_not_call_add(self, client_with_scanner):
        """Verify a string shorter than 26 chars does NOT call add_to_richlist"""
        client, orchestrator, scanner = client_with_scanner
        short_str = "short"  # 5 chars, < 26
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": short_str})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_not_called()

    def test_richlist_exactly_26_chars_calls_add(self, client_with_scanner):
        """Verify a richlist value of exactly 26 characters calls add_to_richlist as a list"""
        client, orchestrator, scanner = client_with_scanner
        addr_26 = "A" * 26  # 26 characters, boundary case
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": addr_26})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_called_once_with([addr_26])

    def test_richlist_exactly_25_chars_does_not_call_add(self, client_with_scanner):
        """Verify a richlist value of exactly 25 characters does NOT call add_to_richlist"""
        client, orchestrator, scanner = client_with_scanner
        addr_25 = "A" * 25  # 25 characters, one below boundary
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": addr_25})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_not_called()

    def test_richlist_comma_separated_are_split(self, client_with_scanner):
        """Verify comma-separated addresses are split and passed as a list

        The code splits comma-separated addresses and called add_to_richlist with a list of valid ones.
        """
    def test_richlist_comma_separated_treated_as_list(self, client_with_scanner):
        """Verify comma-separated addresses are treated as a list of addresses"""
        client, orchestrator, scanner = client_with_scanner
        # Two valid addresses joined by comma
        addr1 = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
        addr2 = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
        combined = f"{addr1},{addr2}"
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": combined})
        assert response.status_code == 200
        # The code splits; both addresses are passed in a list
        # The code should split and pass as list
        scanner.add_to_richlist.assert_called_once_with([addr1, addr2])

    def test_scan_start_returns_started_status(self, client_with_scanner):
        """Verify start_scan returns expected status and paths"""
        client, orchestrator, scanner = client_with_scanner
        paths = ["/home", "/tmp"]
        response = client.post("/api/scan/start", json={"paths": paths})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "started"
        assert data["paths"] == paths

    def test_scan_start_no_orchestrator_returns_error(self):
        """Verify that missing orchestrator returns an error response"""
        api_server.orchestrator = None
        client = TestClient(api_server.app)
        response = client.post("/api/scan/start", json={"paths": ["/tmp"]})
        assert response.status_code == 200
        data = response.json()
        assert "error" in data

    def test_scan_start_no_scanner_returns_error(self):
        """Verify that missing scanner returns an error response"""
        orchestrator = MagicMock()
        orchestrator.computer_scanner = None
        api_server.orchestrator = orchestrator
        client = TestClient(api_server.app)
        response = client.post("/api/scan/start", json={"paths": ["/tmp"]})
        assert response.status_code == 200
        data = response.json()
        assert "error" in data

    def test_richlist_nonexistent_path_short_does_not_add(self, client_with_scanner):
        """Verify a non-existent path that is shorter than 26 chars is ignored"""
        client, orchestrator, scanner = client_with_scanner
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": "/no/such/file"})
        assert response.status_code == 200
        # "/no/such/file" is 14 chars, so add_to_richlist should NOT be called
        scanner.add_to_richlist.assert_not_called()

    def test_richlist_nonexistent_path_long_enough_adds_as_address(self, client_with_scanner):
        """Verify a non-existent path that is >= 26 chars is treated as an address (as a list)"""
        client, orchestrator, scanner = client_with_scanner
        # A fake path that does not exist on the filesystem but is >= 26 chars
        fake_path = "/no/such/file/and/more/chars/here"  # > 26 chars
        response = client.post("/api/scan/start", json={"paths": ["/tmp"], "richlist": fake_path})
        assert response.status_code == 200
        scanner.add_to_richlist.assert_called_once_with([fake_path])

    def test_scan_start_calls_scanner_start(self, client_with_scanner):
        """Verify start_scan always calls scanner.start()"""
        client, orchestrator, scanner = client_with_scanner
        client.post("/api/scan/start", json={"paths": ["/tmp"], "workers": 2})
        scanner.start.assert_called_once_with(num_workers=2)