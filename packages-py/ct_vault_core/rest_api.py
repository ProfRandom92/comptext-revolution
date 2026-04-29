"""REST API Server — FastAPI + Uvicorn (from CT-Vault)"""

import time
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge, Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from .kvtc import KVTCContextController
from .cas import ContentAddressedStore
from .mem_palace import MemPalaceDB
from .database import init_db, index_chunk, search_chunks
from .safety_gate import SafetyGate

logger = logging.getLogger(__name__)

app = FastAPI(title="CT-Vault", version="0.2.0")

# ============================================================================
# Prometheus Metrics
# ============================================================================

TOKEN_SAVINGS_RATE = Gauge(
    'comptext_token_savings_rate',
    'Rolling average token savings rate (0.0-100.0)',
    ['compression_level'],
)

COMPRESSION_LATENCY = Histogram(
    'comptext_compression_duration_seconds',
    'Compression latency in seconds',
    ['method'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

REQUEST_COUNTER = Counter(
    'comptext_requests_total',
    'Total compression requests',
    ['endpoint', 'status'],
)

ERROR_COUNTER = Counter(
    'comptext_errors_total',
    'Total errors by type',
    ['error_type'],
)

# Auto-instrument all FastAPI routes (excludes /health and /metrics)
Instrumentator(
    should_group_status_codes=False,
    excluded_handlers=['/health', '/metrics', '/prometheus'],
).instrument(app).expose(app, endpoint='/prometheus')

# ============================================================================
# Component init
# ============================================================================

kvtc = KVTCContextController()
cas = ContentAddressedStore()
palace = MemPalaceDB()
safety = SafetyGate()

# ============================================================================
# Request Models
# ============================================================================

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

# ============================================================================
# Routes
# ============================================================================

@app.get("/health")
async def health():
    """Health check with live Prometheus metric snapshot."""
    return {
        "status": "healthy",
        "version": "0.2.0",
        "metrics": {
            "avg_token_savings_pct": {
                level: TOKEN_SAVINGS_RATE.labels(compression_level=level)._value.get()
                for level in ["1", "2", "3", "4", "5"]
            },
            "total_compress_requests": REQUEST_COUNTER.labels(
                endpoint="compress", status="success"
            )._value.get(),
            "total_errors": ERROR_COUNTER.labels(
                error_type="compress_failed"
            )._value.get(),
        },
    }


@app.get("/metrics")
async def metrics():
    """Prometheus text-format metrics endpoint for scraping."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/compress")
async def compress(req: CompressRequest):
    """Compress text using KVTC — tracks latency and token savings in Prometheus."""
    start = time.perf_counter()
    level_label = str(req.level)

    try:
        result = kvtc.compress(req.text, req.level)

        duration = time.perf_counter() - start
        COMPRESSION_LATENCY.labels(method=f"level{req.level}").observe(duration)
        REQUEST_COUNTER.labels(endpoint="compress", status="success").inc()

        if hasattr(result, 'savings_pct') and result.savings_pct is not None:
            TOKEN_SAVINGS_RATE.labels(compression_level=level_label).set(result.savings_pct)

        return {
            "compressed": result.compressed,
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "ratio": result.ratio,
            "savings_pct": result.savings_pct,
        }
    except Exception as e:
        ERROR_COUNTER.labels(error_type="compress_failed").inc()
        REQUEST_COUNTER.labels(endpoint="compress", status="error").inc()
        logger.error("Compression failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/index")
async def index(req: IndexRequest):
    """Index content for search."""
    try:
        await init_db()
        chunk_id = await index_chunk(
            f"{req.source}:0", req.source, req.content, tags=req.tags
        )
        REQUEST_COUNTER.labels(endpoint="index", status="success").inc()
        return {"indexed": chunk_id, "source": req.source}
    except Exception as e:
        ERROR_COUNTER.labels(error_type="index_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/search")
async def search(req: SearchRequest):
    """Search indexed content."""
    try:
        results = await search_chunks(req.query, req.top_k)
        REQUEST_COUNTER.labels(endpoint="search", status="success").inc()
        return {"results": results, "query": req.query}
    except Exception as e:
        ERROR_COUNTER.labels(error_type="search_failed").inc()
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
        ERROR_COUNTER.labels(error_type="remember_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/recall")
async def recall(query: str, top_k: int = 5):
    """Recall from memory palace."""
    try:
        results = await palace.recall(query, top_k)
        return {"results": results}
    except Exception as e:
        ERROR_COUNTER.labels(error_type="recall_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/cas/store")
async def cas_store(content: str):
    """Store in content-addressed store."""
    try:
        sha = await cas.store(content.encode())
        return {"sha256": sha}
    except Exception as e:
        ERROR_COUNTER.labels(error_type="cas_store_failed").inc()
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
        ERROR_COUNTER.labels(error_type="cas_fetch_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
