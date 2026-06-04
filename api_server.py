from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
import os

app = FastAPI(title="PyGUI Wallet API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance (injected by main)
orchestrator = None

class ScanRequest(BaseModel):
    paths: List[str]
    richlist: Optional[str] = None
    workers: int = 4
    deep_scan: bool = True
    check_balances: bool = True
    recovery_tokens: Optional[List[str]] = None

class FeedRequest(BaseModel):
    tokens: Optional[List[str]] = None
    addresses: Optional[List[str]] = None

@app.get("/api/status")
async def get_status():
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    return orchestrator.get_status()

@app.post("/api/scan/start")
async def start_scan(req: ScanRequest):
    if not orchestrator or not orchestrator.computer_scanner:
        return {"error": "Scanner not available"}

    orchestrator.computer_scanner.scan_paths = req.paths
    orchestrator.computer_scanner.skip_balance_check = not req.check_balances
    orchestrator.computer_scanner.deep_scan = req.deep_scan
    orchestrator.computer_scanner.btc_recover_tokens = req.recovery_tokens or []

    if req.richlist:
        # If richlist is a file path that exists, load it
        if os.path.exists(req.richlist):
            orchestrator.computer_scanner.richlist_path = req.richlist
            orchestrator.computer_scanner._load_richlist()
        else:
            # Handle comma-separated addresses or single address
            if len(req.richlist) >= 26:
                orchestrator.computer_scanner.add_to_richlist(req.richlist)

    orchestrator.computer_scanner.start(num_workers=req.workers)
    return {"status": "started", "paths": req.paths}


@app.post("/api/scan/stop")
async def stop_scan():
    if not orchestrator or not orchestrator.computer_scanner:
        return {"error": "Scanner not available"}
    try:
        orchestrator.computer_scanner.stop()
        return {"status": "stopped"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/assistant/feed")
async def feed_assistant_intelligence(req: FeedRequest):
    if not orchestrator:
        return {"error": "Orchestrator not available"}

    # 1. Feed text to KeyReducer for normalization and balance checking
    if req.tokens:
        for token in req.tokens:
            orchestrator.feed_text(token, source="assistant_feed")

    # 2. Feed intelligence to ComputerScanner for future recovery passes
    if orchestrator.computer_scanner:
        orchestrator.computer_scanner.feed_intelligence(
            tokens=req.tokens,
            addresses=req.addresses
        )

    return {"status": "intelligence_ingested", "tokens": len(req.tokens or []), "addresses": len(req.addresses or [])}

@app.post("/api/screenwatcher/snapshot")
async def screenwatcher_snapshot():
    if not orchestrator or not orchestrator.screen_watcher:
        return {"error": "ScreenWatcher not available"}
    try:
        orchestrator.screen_watcher.snapshot()
        return {"status": "snapshot_taken"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/screenwatcher/start")
async def start_screenwatcher():
    if not orchestrator or not orchestrator.screen_watcher:
        return {"error": "ScreenWatcher not available"}
    try:
        orchestrator.screen_watcher.start()
        return {"status": "started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/screenwatcher/stop")
async def stop_screenwatcher():
    if not orchestrator or not orchestrator.screen_watcher:
        return {"error": "ScreenWatcher not available"}
    try:
        orchestrator.screen_watcher.stop()
        return {"status": "stopped"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/scan/results")
async def get_results(limit: int = 100):
    if not orchestrator:
        return {"error": "Orchestrator not available"}
    return {"hits": orchestrator.get_recent_hits(limit)}

@app.get("/api/vault/entries")
async def list_vault():
    if not orchestrator or not orchestrator.vault:
        return {"error": "Vault not available"}
    return orchestrator.vault.list_entries()

@app.get("/api/prices")
async def get_prices():
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    return orchestrator._get_live_prices()

@app.post("/api/assistant/feed")
async def assistant_feed(req: FeedRequest):
    if not orchestrator or not orchestrator.computer_scanner:
        return {"error": "Scanner not available"}

    orchestrator.computer_scanner.feed_intelligence(
        tokens=req.tokens,
        addresses=req.addresses
    )
    return {"status": "ingested", "tokens": len(req.tokens or []), "addresses": len(req.addresses or [])}
