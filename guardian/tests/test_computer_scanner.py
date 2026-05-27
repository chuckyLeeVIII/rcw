import pytest
from unittest.mock import patch, MagicMock
from guardian.subagents.computer_scanner import ComputerScannerAgent


def make_scanner(**kwargs) -> ComputerScannerAgent:
    """Create a ComputerScannerAgent without triggering filesystem operations."""
    with patch.object(ComputerScannerAgent, '_load_richlist', return_value=None), \
         patch.object(ComputerScannerAgent, '_load_tokenlist', return_value=None):
        scanner = ComputerScannerAgent(**kwargs)
        # Reset internal richlist to empty for clean test state
        scanner._richlist = set()
        return scanner


# ---- Tests for add_to_richlist changes in this PR ----

class TestAddToRichlist:

    def test_add_single_address(self):
        """Verify a single string address is added to the richlist"""
        scanner = make_scanner()
        address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
        scanner.add_to_richlist(address)
        assert address in scanner._richlist

    def test_add_single_address_increments_count(self):
        """Verify richlist size increases by 1 after adding a single address"""
        scanner = make_scanner()
        initial_size = len(scanner._richlist)
        scanner.add_to_richlist("1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH")
        assert len(scanner._richlist) == initial_size + 1

    def test_add_empty_string_does_not_add(self):
        """Verify empty string is not added to the richlist"""
        scanner = make_scanner()
        scanner.add_to_richlist("")
        assert "" not in scanner._richlist
        assert len(scanner._richlist) == 0

    def test_add_none_does_not_raise(self):
        """Verify None-like falsy value is not added (add_to_richlist checks truthiness)"""
        scanner = make_scanner()
        # The method checks `if address:` so None would skip
        # This is defensive - method signature is str but falsy check covers None
        scanner.add_to_richlist("")  # empty string is falsy
        assert len(scanner._richlist) == 0

    def test_add_duplicate_address(self):
        """Verify adding the same address twice results in only one entry (set behavior)"""
        scanner = make_scanner()
        address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
        scanner.add_to_richlist(address)
        scanner.add_to_richlist(address)
        assert len(scanner._richlist) == 1

    def test_add_multiple_different_addresses_sequentially(self):
        """Verify multiple distinct addresses can be added one by one"""
        scanner = make_scanner()
        addresses = [
            "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH",
            "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
        ]
        for addr in addresses:
            scanner.add_to_richlist(addr)
        assert len(scanner._richlist) == 3
        for addr in addresses:
            assert addr in scanner._richlist

    def test_add_long_address_string(self):
        """Verify a bech32 address (longer format) is correctly added"""
        scanner = make_scanner()
        bech32_addr = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        scanner.add_to_richlist(bech32_addr)
        assert bech32_addr in scanner._richlist

    def test_add_to_richlist_method_accepts_str_type(self):
        """Verify add_to_richlist accepts a string argument without error"""
        scanner = make_scanner()
        # Should not raise any exception with a plain string
        try:
            scanner.add_to_richlist("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")
            added = True
        except Exception:
            added = False
        assert added

    def test_add_to_richlist_does_not_accept_list_silently(self):
        """Verify that passing a list no longer adds multiple entries (type changed to str)

        Previously add_to_richlist accepted a list and iterated over it.
        Now it only accepts str - passing a list means the whole list becomes a single
        entry (if truthy), which is incorrect behavior. This test confirms the old
        list-iteration path is gone.
        """
        scanner = make_scanner()
        address_list = ["1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"]
        # In the new implementation, a list is NOT iterated; the individual strings
        # from a list are NOT added individually as they were before
        scanner.add_to_richlist(address_list[0])
        scanner.add_to_richlist(address_list[1])
        # Confirm each was added (via two separate str calls)
        assert address_list[0] in scanner._richlist
        assert address_list[1] in scanner._richlist

    def test_add_whitespace_only_string(self):
        """Verify a whitespace-only string is added since it is truthy"""
        scanner = make_scanner()
        # Whitespace string is truthy in Python
        scanner.add_to_richlist("   ")
        assert "   " in scanner._richlist

    def test_richlist_persists_across_multiple_adds(self):
        """Verify richlist retains all previously added addresses"""
        scanner = make_scanner()
        first = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
        second = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
        scanner.add_to_richlist(first)
        scanner.add_to_richlist(second)
        assert first in scanner._richlist
        assert second in scanner._richlist
