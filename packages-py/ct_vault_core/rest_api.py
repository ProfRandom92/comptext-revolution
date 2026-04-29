"""REST API Server — FastAPI + Uvicorn (from CT-Vault)"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging

from .kvtc import KVTCContextController
from .cas import ContentAddressedStore
from .mem_palace import MemPalaceDB
from .database import init_db, index_chunk, search_chunks
from .safety_gate import SafetyGate

logger = logging.getLogger(__name__)

app = FastAPI(title="CT-Vault", version="0.2.0")

# Initialize components
kvtc = KVTCContextController()
cas = ContentAddressedStore()
palace = MemPalaceDB()
safety = SafetyGate()

class CompressRequest(BaseModel):
    text: str
    level: int = 2

class IndexRequest(BaseModel):
    source: str
    content: str
    tags: str = ""

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class MemoryRequest(BaseModel):
    palace: str
    wing: str
    room: str
    content: str
    drawer: Optional[str] = None
    tags: str = ""

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.2.0"}

@app.post("/compress")
async def compress(req: CompressRequest):
    """Compress text using KVTC."""
    try:
        result = kvtc.compress(req.text, req.level)
        return {
            "compressed": result.compressed,
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "ratio": result.ratio,
            "savings_pct": result.savings_pct,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/index")
async def index(req: IndexRequest):
    """Index content for search."""
    try:
        await init_db()
        chunk_id = await index_chunk(
            f"{req.source}:0",
            req.source,
            req.content,
            tags=req.tags
        )
        return {"indexed": chunk_id, "source": req.source}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/search")
async def search(req: SearchRequest):
    """Search indexed content."""
    try:
        results = await search_chunks(req.query, req.top_k)
        return {"results": results, "query": req.query}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/remember")
async def remember(req: MemoryRequest):
    """Store memory in palace."""
    try:
        key = await palace.remember(
            req.palace, req.wing, req.room,
            req.content, req.drawer, req.tags
        )
        return {"stored": key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/recall")
async def recall(query: str, top_k: int = 5):
    """Recall from memory palace."""
    try:
        results = await palace.recall(query, top_k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cas/store")
async def cas_store(content: str):
    """Store in content-addressed store."""
    try:
        sha = await cas.store(content.encode())
        return {"sha256": sha}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cas/fetch/{sha256}")
async def cas_fetch(sha256: str):
    """Retrieve from CAS."""
    try:
        data = await cas.retrieve(sha256)
        if not data:
            raise HTTPException(status_code=404, detail="Not found")
        return {"content": data.decode()[:5000], "sha256": sha256}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/metrics")
async def metrics():
    """Get compression metrics."""
    stats = await cas.get_stats()
    return {
        "cas_stats": stats,
        "status": "ready",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
