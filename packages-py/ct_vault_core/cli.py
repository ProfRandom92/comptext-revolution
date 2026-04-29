"""CLI Interface — Typer Commands (from CT-Vault)"""

import asyncio
import typer
from pathlib import Path
from typing import Optional
import json

from .kvtc import KVTCContextController
from .cas import ContentAddressedStore
from .mem_palace import MemPalaceDB
from .database import init_db, index_chunk, search_chunks
from .watcher import WatcherService
from .safety_gate import SafetyGate

app = typer.Typer(help="CT-Vault: Compression + Memory + Search")

kvtc = KVTCContextController()
cas = ContentAddressedStore()
palace = MemPalaceDB()
safety = SafetyGate()

@app.command()
def compress(
    text: str = typer.Argument(..., help="Text to compress"),
    level: int = typer.Option(2, help="Compression level (1-5)"),
    verbose: bool = typer.Option(False, help="Show detailed output"),
):
    """Compress text using KVTC."""
    result = kvtc.compress(text, level)
    output = {
        "compressed": result.compressed,
        "tokens_in": result.tokens_in,
        "tokens_out": result.tokens_out,
        "ratio": f"{result.ratio:.2f}",
        "savings_pct": result.savings_pct,
    }
    if verbose:
        output["original"] = result.original
    typer.echo(json.dumps(output, indent=2))

@app.command()
async def index(
    source: str = typer.Argument(..., help="Source URI"),
    content: str = typer.Option(..., help="Content to index"),
    tags: str = typer.Option("", help="Comma-separated tags"),
):
    """Index content for search."""
    await init_db()
    chunk_id = await index_chunk(f"{source}:0", source, content, tags=tags)
    typer.echo(f"Indexed: {chunk_id}")

@app.command()
async def search(
    query: str = typer.Argument(..., help="Search query"),
    top_k: int = typer.Option(5, help="Number of results"),
):
    """Search indexed content."""
    results = await search_chunks(query, top_k)
    typer.echo(json.dumps(results, indent=2))

@app.command()
async def watch(
    watch_dir: Optional[str] = typer.Option(None, help="Directory to watch"),
):
    """Watch directory for changes and auto-index."""
    path = Path(watch_dir) if watch_dir else Path.home() / ".comptext" / "watch"
    service = WatcherService(path)

    async def on_file_changed(file_path: Path):
        content = file_path.read_text()
        await index_chunk(str(file_path), str(file_path), content)
        typer.echo(f"Indexed: {file_path}")

    await service.start(on_file_changed)
    typer.echo(f"Watching {path}... Press Ctrl+C to stop")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await service.stop()
        typer.echo("Watcher stopped")

@app.command()
async def remember(
    palace_name: str = typer.Argument(..., help="Palace name"),
    wing: str = typer.Option(..., help="Wing name"),
    room: str = typer.Option(..., help="Room name"),
    content: str = typer.Option(..., help="Content to remember"),
    drawer: Optional[str] = typer.Option(None, help="Drawer name"),
):
    """Store memory in palace."""
    key = await palace.remember(palace_name, wing, room, content, drawer)
    typer.echo(f"Stored: {key}")

@app.command()
async def recall(
    query: str = typer.Argument(..., help="Search query"),
    top_k: int = typer.Option(5, help="Number of results"),
):
    """Recall from memory palace."""
    results = await palace.recall(query, top_k)
    typer.echo(json.dumps(results, indent=2))

@app.command()
async def list_palaces():
    """List all memory palaces."""
    palaces = await palace.list_palaces()
    typer.echo(json.dumps({"palaces": palaces}, indent=2))

@app.command()
def store(
    content: str = typer.Argument(..., help="Content to store"),
):
    """Store content in CAS."""
    asyncio.run(_store_async(content))

async def _store_async(content: str):
    sha = await cas.store(content.encode())
    typer.echo(f"SHA256: {sha}")

@app.command()
def retrieve(
    sha256: str = typer.Argument(..., help="SHA256 hash"),
):
    """Retrieve from CAS."""
    asyncio.run(_retrieve_async(sha256))

async def _retrieve_async(sha256: str):
    data = await cas.retrieve(sha256)
    if not data:
        typer.echo("Not found")
        return
    typer.echo(data.decode())

@app.command()
def validate(
    text: str = typer.Argument(..., help="Text to validate"),
):
    """Validate text for safety."""
    risk_level, violations = safety.check_output(text)
    output = {
        "risk_level": risk_level.value,
        "violations": violations,
        "safe": risk_level.value == "safe",
    }
    typer.echo(json.dumps(output, indent=2))

if __name__ == "__main__":
    app()
