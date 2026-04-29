"""Unified Server Entry Point — REST API + MCP (from CT-Vault)"""

import asyncio
import uvicorn
from .rest_api import app as rest_app
from .mcp_server import setup_mcp_server

async def run_rest_server(host: str = "0.0.0.0", port: int = 8000):
    """Run REST API server."""
    config = uvicorn.Config(
        rest_app,
        host=host,
        port=port,
        log_level="info",
    )
    server = uvicorn.Server(config)
    await server.serve()

async def run_mcp_server():
    """Run MCP server."""
    server = await setup_mcp_server()
    if server:
        await server.run()

async def run_both(rest_host: str = "0.0.0.0", rest_port: int = 8000):
    """Run both REST and MCP servers concurrently."""
    mcp_task = asyncio.create_task(run_mcp_server())
    rest_task = asyncio.create_task(run_rest_server(rest_host, rest_port))

    try:
        await asyncio.gather(mcp_task, rest_task)
    except KeyboardInterrupt:
        mcp_task.cancel()
        rest_task.cancel()

if __name__ == "__main__":
    print("Starting CT-Vault servers...")
    asyncio.run(run_both())
