"""REST API Server — FastAPI + Uvicorn (from CT-Vault)"""

import time
import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
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

# Running stats (in-memory, reset on restart)
_stats: dict = {"total_ops": 0, "total_tokens_in": 0, "total_tokens_out": 0, "ops_by_level": {}}

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

class MemoryDeleteRequest(BaseModel):
    palace: str
    wing: str
    room: str
    drawer: Optional[str] = None

class CasStoreRequest(BaseModel):
    content: str

class CheckpointRequest(BaseModel):
    session_id: str
    label: str = "checkpoint"
    include_memory: bool = True

class EncodeRequest(BaseModel):
    text: str
    include_metadata: bool = True

class ParseRequest(BaseModel):
    compressed: str

class CompressOutputRequest(BaseModel):
    output: str
    max_tokens: int = 500

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
        _stats["total_ops"] += 1
        _stats["total_tokens_in"] += result.tokens_in
        _stats["total_tokens_out"] += result.tokens_out
        _stats["ops_by_level"][str(req.level)] = _stats["ops_by_level"].get(str(req.level), 0) + 1
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


@app.get("/mem/list")
async def mem_list(palace_filter: Optional[str] = None):
    """List all memory locations."""
    try:
        items = await palace.list_all(palace_filter)
        return {"items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/mem/delete")
async def mem_delete(req: MemoryDeleteRequest):
    """Delete a memory item."""
    try:
        deleted = await palace.delete(req.palace, req.wing, req.room, req.drawer)
        return {"deleted": deleted, "location": f"{req.palace}:{req.wing}:{req.room}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/ctx/checkpoint")
async def ctx_checkpoint(req: CheckpointRequest):
    """Save a session checkpoint."""
    checkpoint_dir = Path.home() / ".comptext" / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    cp = {
        "session_id": req.session_id,
        "label": req.label,
        "ts": time.time(),
        "memory": await palace.list_all() if req.include_memory else [],
    }
    cp_path = checkpoint_dir / f"{req.session_id}-{int(time.time())}.json"
    cp_path.write_text(json.dumps(cp, indent=2))
    return {"checkpoint_id": cp_path.stem, "path": str(cp_path), "items": len(cp["memory"])}


@app.post("/encode")
async def encode(req: EncodeRequest):
    """Encode text into CompText DSL format with optional metadata header."""
    try:
        result = kvtc.compress(req.text, level=2)
        dsl = f"[CT:v1:L2]\n{result.compressed}\n[/CT]"
        if req.include_metadata:
            meta = f"# ratio:{result.ratio:.3f} savings:{result.savings_pct}% tokens_in:{result.tokens_in} tokens_out:{result.tokens_out}"
            dsl = meta + "\n" + dsl
        _stats["total_ops"] += 1
        _stats["total_tokens_in"] += result.tokens_in
        _stats["total_tokens_out"] += result.tokens_out
        REQUEST_COUNTER.labels(endpoint="encode", status="success").inc()
        return {
            "encoded": dsl,
            "format": "comptext-dsl-v1",
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "savings_pct": result.savings_pct,
        }
    except Exception as e:
        ERROR_COUNTER.labels(error_type="encode_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/parse")
async def parse(req: ParseRequest):
    """Parse CompText DSL string and return structured representation."""
    try:
        text = req.compressed.strip()
        metadata: dict = {}
        content = text

        # Extract metadata comment
        if text.startswith("# ratio:"):
            lines = text.splitlines()
            meta_line = lines[0]
            for part in meta_line.lstrip("# ").split():
                if ":" in part:
                    k, v = part.split(":", 1)
                    metadata[k] = v
            content = "\n".join(lines[1:]).strip()

        # Extract DSL block
        import re
        header_match = re.match(r'\[CT:([^\]]+)\]', content)
        level, version = None, None
        if header_match:
            parts = header_match.group(1).split(":")
            version = parts[0] if len(parts) > 0 else "v1"
            level = parts[1].lstrip("L") if len(parts) > 1 else "2"
            content = re.sub(r'^\[CT:[^\]]+\]\n?', '', content)
            content = re.sub(r'\n?\[/CT\]$', '', content).strip()

        REQUEST_COUNTER.labels(endpoint="parse", status="success").inc()
        return {
            "content": content,
            "format": "comptext-dsl-v1",
            "version": version or "v1",
            "level": int(level) if level and level.isdigit() else 2,
            "metadata": metadata,
            "is_dsl": header_match is not None,
        }
    except Exception as e:
        ERROR_COUNTER.labels(error_type="parse_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/compress-output")
async def compress_output(req: CompressOutputRequest):
    """Compress output text to fit within a token budget (escalates levels 2→5)."""
    try:
        for level in range(2, 6):
            result = kvtc.compress(req.output, level=level)
            if result.tokens_out <= req.max_tokens:
                _stats["total_ops"] += 1
                _stats["total_tokens_in"] += result.tokens_in
                _stats["total_tokens_out"] += result.tokens_out
                REQUEST_COUNTER.labels(endpoint="compress_output", status="success").inc()
                return {
                    "compressed": result.compressed,
                    "tokens_in": result.tokens_in,
                    "tokens_out": result.tokens_out,
                    "savings_pct": result.savings_pct,
                    "level_used": level,
                    "within_limit": True,
                }
        # Level 5 still over budget — return best effort
        result = kvtc.compress(req.output, level=5)
        REQUEST_COUNTER.labels(endpoint="compress_output", status="success").inc()
        return {
            "compressed": result.compressed,
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "savings_pct": result.savings_pct,
            "level_used": 5,
            "within_limit": result.tokens_out <= req.max_tokens,
        }
    except Exception as e:
        ERROR_COUNTER.labels(error_type="compress_output_failed").inc()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/token-stats")
async def token_stats():
    """Return live compression statistics."""
    total_in = _stats["total_tokens_in"]
    total_out = _stats["total_tokens_out"]
    total_saved = total_in - total_out
    avg_savings = round((total_saved / total_in * 100), 1) if total_in else 0.0
    return {
        "total_operations": _stats["total_ops"],
        "total_tokens_in": total_in,
        "total_tokens_out": total_out,
        "total_tokens_saved": total_saved,
        "avg_savings_pct": avg_savings,
        "ops_by_level": _stats["ops_by_level"],
        "status": "ready",
    }


@app.post("/cas/store")
async def cas_store(req: CasStoreRequest):
    """Store in content-addressed store."""
    try:
        sha = await cas.store(req.content.encode())
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
