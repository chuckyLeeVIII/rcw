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
    if req.richlist:
        orchestrator.computer_scanner.richlist_path = req.richlist
        orchestrator.computer_scanner._load_richlist()

    orchestrator.computer_scanner.start(num_workers=req.workers)
    return {"status": "started", "paths": req.paths}

@app.post("/api/mixhunter/start")
async def start_mixhunter(workers: int = 2):
    if not orchestrator or not orchestrator.mixhunter:
        return {"error": "MixHunter not available"}
    orchestrator.mixhunter.start(num_workers=workers)
    return {"status": "started"}

@app.post("/api/mixhunter/stop")
async def stop_mixhunter():
    if not orchestrator or not orchestrator.mixhunter:
        return {"error": "MixHunter not available"}
    orchestrator.mixhunter.stop()
    return {"status": "stopped"}

@app.post("/api/scan/stop")
async def stop_scan():
    if not orchestrator or not orchestrator.computer_scanner:
        return {"error": "Scanner not available"}
    orchestrator.computer_scanner.stop()
    return {"status": "stopped"}

@app.get("/api/scan/results")
async def get_results(limit: int = 100):
    if not orchestrator:
        return {"error": "Orchestrator not available"}

    with orchestrator._hits_lock:
        hits = list(orchestrator.discovered_hits)
        if limit > 0:
            hits = hits[-limit:]
    return {"hits": hits}

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
