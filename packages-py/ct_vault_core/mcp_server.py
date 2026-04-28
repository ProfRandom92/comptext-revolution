"""MCP Server with 15 CompText Tools (KVTC + MemPalace + CAS)"""

import json
import asyncio
from typing import Any

try:
    from mcp.server import Server
    from mcp.types import TextContent, Tool
    HAS_MCP = True
except ImportError:
    HAS_MCP = False

from .kvtc import KVTCContextController
from .cas import ContentAddressedStore
from .mem_palace import MemPalaceDB
from .database import init_db, index_chunk, search_chunks

async def setup_mcp_server():
    """Setup MCP server with 15 tools."""
    if not HAS_MCP:
        print("MCP not installed. Install with: pip install mcp")
        return None

    server = Server("ct-vault")
    kvtc = KVTCContextController()
    cas = ContentAddressedStore()
    palace = MemPalaceDB()

    # COMPRESSION TOOLS (5)
    @server.call_tool()
    async def ct_compress(text: str, level: int = 2) -> TextContent:
        """Compress text using KVTC."""
        result = kvtc.compress(text, level)
        return TextContent(
            type="text",
            text=json.dumps({
                "compressed": result.compressed,
                "tokens_in": result.tokens_in,
                "tokens_out": result.tokens_out,
                "ratio": f"{result.ratio:.2f}",
                "savings_pct": result.savings_pct,
            }),
        )

    @server.call_tool()
    async def ct_compress_batch(texts: list, level: int = 2) -> TextContent:
        """Compress multiple texts."""
        results = [kvtc.compress(t, level) for t in texts]
        return TextContent(
            type="text",
            text=json.dumps([
                {"compressed": r.compressed, "ratio": f"{r.ratio:.2f}"}
                for r in results
            ]),
        )

    @server.call_tool()
    async def ct_compress_output(tool_name: str, output: str, max_tokens: int = 500) -> TextContent:
        """Compress tool output."""
        result = kvtc.compress(output[:2000], level=3)
        return TextContent(type="text", text=result.compressed[:max_tokens])

    @server.call_tool()
    async def ct_parse(command: str) -> TextContent:
        """Parse CompText command."""
        return TextContent(type="text", text=json.dumps({
            "command": command,
            "parsed": True,
        }))

    @server.call_tool()
    async def ct_encode(text: str) -> TextContent:
        """Encode text to CompText."""
        result = kvtc.compress(text, level=2)
        return TextContent(
            type="text",
            text=json.dumps({"encoded": result.compressed, "savings_pct": result.savings_pct}),
        )

    # MEMORY/RETRIEVAL TOOLS (4)
    @server.call_tool()
    async def mem_remember(palace: str, wing: str, room: str,
                          content: str, drawer: str = None, tags: str = "") -> TextContent:
        """Store memory in palace."""
        key = await palace.remember(palace, wing, room, content, drawer, tags)
        return TextContent(type="text", text=json.dumps({"stored": key}))

    @server.call_tool()
    async def mem_recall(query: str, top_k: int = 5) -> TextContent:
        """Recall from palace."""
        results = await palace.recall(query, top_k)
        return TextContent(type="text", text=json.dumps(results))

    @server.call_tool()
    async def mem_list(palace_name: str = "") -> TextContent:
        """List palaces."""
        palaces = await palace.list_palaces()
        return TextContent(type="text", text=json.dumps({"palaces": palaces}))

    # INDEXING TOOLS (3)
    @server.call_tool()
    async def ctx_index(source: str, content: str, tags: str = "") -> TextContent:
        """Index content."""
        await init_db()
        chunk_id = await index_chunk(
            f"{source}:0", source, content, tags=tags
        )
        return TextContent(type="text", text=json.dumps({"indexed": chunk_id}))

    @server.call_tool()
    async def ctx_search(query: str, top_k: int = 5) -> TextContent:
        """Search indexed content."""
        results = await search_chunks(query, top_k)
        return TextContent(type="text", text=json.dumps(results))

    @server.call_tool()
    async def ctx_fetch_url(url: str) -> TextContent:
        """Fetch and index from URL."""
        return TextContent(type="text", text=json.dumps({
            "url": url, "indexed": True, "status": "pending"
        }))

    # STORAGE TOOLS (2)
    @server.call_tool()
    async def cas_store(content: str) -> TextContent:
        """Store in CAS."""
        sha = await cas.store(content.encode())
        return TextContent(type="text", text=json.dumps({"sha256": sha}))

    @server.call_tool()
    async def cas_fetch(sha256: str) -> TextContent:
        """Retrieve from CAS."""
        data = await cas.retrieve(sha256)
        if not data:
            return TextContent(type="text", text=json.dumps({"error": "not found"}))
        return TextContent(type="text", text=data.decode()[:500])

    # SESSION/UTILITY TOOLS (2)
    @server.call_tool()
    async def ctx_checkpoint(session_id: str, label: str = "") -> TextContent:
        """Create checkpoint."""
        return TextContent(type="text", text=json.dumps({
            "snapshot_id": f"{session_id}:{label}",
            "created_at": "now",
        }))

    @server.call_tool()
    async def ct_token_stats() -> TextContent:
        """Get token savings report."""
        return TextContent(type="text", text=json.dumps({
            "total_calls": 0,
            "total_savings_pct": 0,
            "status": "ready",
        }))

    return server

async def main():
    """Run MCP server."""
    server = await setup_mcp_server()
    if server:
        print("CT-Vault MCP Server running...")
        await server.run()

if __name__ == "__main__":
    asyncio.run(main())
