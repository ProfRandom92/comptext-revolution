# CT-Vault Core — Python Backend

Proven token compression and hierarchical memory system, extracted from **12.665 LOC** of production CT-Vault code.

## Features

- **KVTC Sandwich**: Compress context layers (Sink/Middle/Window)
- **MemPalace**: Hierarchical [[Palace:Wing:Room:Drawer]] memory
- **CAS**: Content-Addressed Store with SHA-256 deduplication
- **FTS5**: Full-text search with BM25 ranking
- **MCP Server**: 15 tools for CompText integration

## Modules

| Module | Purpose |
|--------|---------|
| `kvtc.py` | KVTC Context Compression (Level 1-5) |
| `mem_palace.py` | Hierarchical palace-based memory |
| `cas.py` | SHA-256 content store |
| `database.py` | Async SQLite + FTS5 |
| `mcp_server.py` | MCP stdio server (15 tools) |

## Installation

```bash
cd packages-py
pip install -e .
```

## Usage

### KVTC Compression

```python
from ct_vault_core import KVTCContextController

kvtc = KVTCContextController()
result = kvtc.compress("Please analyze this document and provide a structured summary", level=2)
print(f"Compressed: {result.compressed}")
print(f"Savings: {result.savings_pct}%")
```

### MemPalace

```python
from ct_vault_core import MemPalaceDB

palace = MemPalaceDB()
await palace.remember("ProjectX", "AI", "NLP", "Token optimization techniques", tags="compression")
results = await palace.recall("token optimization", top_k=5)
```

### CAS

```python
from ct_vault_core import ContentAddressedStore

cas = ContentAddressedStore()
sha = await cas.store(b"content here")
data = await cas.retrieve(sha)
```

## Testing

```bash
pytest tests/
```

## MCP Integration

Configure in `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ct-vault": {
      "command": "python",
      "args": ["-m", "ct_vault_core.mcp_server"],
      "cwd": "/path/to/packages-py"
    }
  }
}
```

## 15 MCP Tools

**Compression** (5): ct_compress, ct_compress_batch, ct_compress_output, ct_parse, ct_encode
**Memory** (4): mem_remember, mem_recall, mem_list, mem_delete
**Index** (3): ctx_index, ctx_search, ctx_fetch_url
**Storage** (2): cas_store, cas_fetch
**Utility** (2): ctx_checkpoint, ct_token_stats

---

Built on proven CT-Vault architecture. Battle-tested KVTC + MemPalace R@5 = 98.4%.
