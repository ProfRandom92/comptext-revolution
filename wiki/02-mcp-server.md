# MCP Server — 15 Tools

## Overview

The CompText MCP Server provides **15 tools** accessible via Claude Desktop or MCP clients. It implements a **Python-first routing strategy** with TypeScript fallback.

## Tool Categories

### 🗜️ Compression (3 Tools)

#### ct_compress
Compress single text passage.

```json
{
  "name": "ct_compress",
  "input_schema": {
    "type": "object",
    "properties": {
      "text": { "type": "string", "description": "Text to compress" },
      "level": { "type": "integer", "enum": [1, 2, 3, 4, 5], "default": 3 }
    },
    "required": ["text"]
  }
}
```

**Returns:**
```json
{
  "compressed": "Fn rtn val DB",
  "original_tokens": 45,
  "compressed_tokens": 20,
  "saved": 25,
  "ratio": 44.4
}
```

#### ct_compress_batch
Compress multiple texts with level matrix.

```json
{
  "name": "ct_compress_batch",
  "input_schema": {
    "type": "object",
    "properties": {
      "texts": { "type": "array", "items": { "type": "string" } },
      "levels": { "type": "array", "items": { "type": "integer" }, "default": [1, 2, 3, 4, 5] }
    },
    "required": ["texts"]
  }
}
```

#### ct_compress_output
Compress Claude's own response to optimize token usage.

```json
{
  "name": "ct_compress_output",
  "input_schema": {
    "type": "object",
    "properties": {
      "output": { "type": "string" },
      "level": { "type": "integer", "enum": [1, 2, 3, 4, 5], "default": 2 },
      "preserve_structure": { "type": "boolean", "default": true }
    },
    "required": ["output"]
  }
}
```

### 📝 Parsing (2 Tools)

#### ct_parse
Parse text structure (code, markdown, JSON).

```json
{
  "name": "ct_parse",
  "input_schema": {
    "type": "object",
    "properties": {
      "text": { "type": "string" },
      "format": { "type": "string", "enum": ["code", "markdown", "json", "auto"], "default": "auto" }
    },
    "required": ["text"]
  }
}
```

#### ct_encode
Encode/decode text with CompText symbols.

```json
{
  "name": "ct_encode",
  "input_schema": {
    "type": "object",
    "properties": {
      "text": { "type": "string" },
      "mode": { "type": "string", "enum": ["encode", "decode"] }
    },
    "required": ["text", "mode"]
  }
}
```

### 🔍 Context (3 Tools)

#### ctx_index
Index content via FTS5 for full-text search.

```json
{
  "name": "ctx_index",
  "input_schema": {
    "type": "object",
    "properties": {
      "content": { "type": "string" },
      "title": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "metadata": { "type": "object" }
    },
    "required": ["content"]
  }
}
```

#### ctx_search
Search indexed content by keywords.

```json
{
  "name": "ctx_search",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer", "default": 10 },
      "offset": { "type": "integer", "default": 0 }
    },
    "required": ["query"]
  }
}
```

**Returns:**
```json
{
  "results": [
    {
      "id": "doc_123",
      "title": "API Reference",
      "content_snippet": "The API provides...",
      "score": 0.95,
      "tags": ["api", "documentation"]
    }
  ],
  "total": 45,
  "query_time_ms": 23
}
```

#### ctx_checkpoint
Snapshot current session state (SQLite + context).

```json
{
  "name": "ctx_checkpoint",
  "input_schema": {
    "type": "object",
    "properties": {
      "label": { "type": "string", "description": "Checkpoint name" },
      "include_memory": { "type": "boolean", "default": true },
      "compress": { "type": "boolean", "default": true }
    },
    "required": ["label"]
  }
}
```

### 💾 Memory (4 Tools)

#### mem_remember
Store fact in MemPalace hierarchy.

```json
{
  "name": "mem_remember",
  "input_schema": {
    "type": "object",
    "properties": {
      "fact": { "type": "string" },
      "palace": { "type": "string", "description": "Palace name" },
      "wing": { "type": "string" },
      "room": { "type": "string" },
      "drawer": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["fact", "palace"]
  }
}
```

#### mem_recall
Retrieve facts from MemPalace.

```json
{
  "name": "mem_recall",
  "input_schema": {
    "type": "object",
    "properties": {
      "palace": { "type": "string" },
      "wing": { "type": "string" },
      "query": { "type": "string" }
    },
    "required": ["palace"]
  }
}
```

#### mem_list
List all MemPalace hierarchies.

#### mem_delete
Delete facts from MemPalace.

### 📦 Storage (2 Tools)

#### cas_store
Store content in CAS (Content-Addressed Store).

```json
{
  "name": "cas_store",
  "input_schema": {
    "type": "object",
    "properties": {
      "content": { "type": "string" },
      "metadata": { "type": "object" }
    },
    "required": ["content"]
  }
}
```

**Returns:**
```json
{
  "sha256": "abc123def456...",
  "size": 1024,
  "stored_at": "2026-05-05T12:00:00Z"
}
```

#### cas_fetch
Retrieve content by SHA-256 hash.

### 📊 Metrics (1 Tool)

#### ct_token_stats
Analyze token usage and compression impact.

```json
{
  "name": "ct_token_stats",
  "input_schema": {
    "type": "object",
    "properties": {
      "text": { "type": "string" },
      "levels": { "type": "array", "items": { "type": "integer" }, "default": [1, 2, 3, 4, 5] }
    },
    "required": ["text"]
  }
}
```

## Tool Routing Strategy

```
MCP Client Request
        ↓
  Is Python tool?
        ↙ Yes
    Check Python bridge (localhost:8000)
    ✓ Online → Forward to Python backend
    ✗ Offline → Use TypeScript fallback
        
        ↘ No (TypeScript tool)
    Execute in Node.js
    Return result
```

## Claude Desktop Configuration

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "comptext": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "PYTHON_BRIDGE": "http://localhost:8000",
        "DEBUG": "false"
      }
    }
  }
}
```

See [Claude Desktop Setup](./30-claude-desktop.md) for detailed configuration.

## Error Handling

### Tool Timeout
- Default: 30 seconds
- Falls back to TypeScript implementation
- Logs error with full stack trace

### Python Bridge Unavailable
- All requests fallback to TypeScript
- No functionality loss
- Logs warning

### Invalid Input
- Returns structured error with suggestions
- Input validation on both MCP and backend level

## Performance

| Tool | Latency | Notes |
|------|---------|-------|
| ct_compress | 5-15ms | Varies by text length |
| ctx_search | 20-50ms | Depends on index size |
| mem_remember | 10-30ms | MemPalace write |
| cas_store | 15-40ms | SHA-256 calculation |
| ctx_checkpoint | 100-500ms | Database snapshot |

## Debugging

Enable debug mode:

```bash
export DEBUG=comptext:*
export PYTHON_BRIDGE_DEBUG=true
node packages/mcp-server/dist/index.js
```

Check logs:

```bash
tail -f ~/.local/share/Claude/logs/mcp-server.log
```
