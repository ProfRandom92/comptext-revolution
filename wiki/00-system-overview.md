# System Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│          Claude Desktop / User               │
└────────────────────┬────────────────────────┘
                     │ MCP Protocol
                     │
        ┌────────────▼────────────┐
        │   MCP Server (Node.js)  │
        │  15 Tools + Routing     │
        └────────────┬────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
   ┌────▼─────┐            ┌───────▼──────┐
   │TypeScript│            │ Python REST  │
   │  Tools   │            │ API (uvicorn)│
   └────┬─────┘            └───────┬──────┘
        │                          │
   ┌────▼──────────────────────────▼───┐
   │   SQLite DB + FTS5 Index           │
   │   - MemPalace hierarchies          │
   │   - Content-Addressed Store        │
   │   - Session snapshots              │
   └────────────────────────────────────┘
```

## Components

### 1. **Core DSL Compiler** (`packages/core`)
- `compressText()` — 5 levels of token compression
- 60+ abbreviation dictionary
- `decompress()` — bidirectional transformation
- **Token Savings:** 10.9% avg, up to 25% on documentation

### 2. **MCP Server** (`packages/mcp-server`)
- **15 Tools** organized in 5 categories:
  - Compression (3): `ct_compress`, `ct_compress_batch`, `ct_compress_output`
  - Parsing (2): `ct_parse`, `ct_encode`
  - Context (3): `ctx_index`, `ctx_search`, `ctx_checkpoint`
  - Memory (4): `mem_remember`, `mem_recall`, `mem_list`, `mem_delete`
  - Storage (2): `cas_store`, `cas_fetch`
  - Metrics (1): `ct_token_stats`
- Tool-Handler routing (Python-first strategy)
- HTTP bridge to Python backend

### 3. **Python Backend** (`packages-py/ct_vault_core`)
- **KVTC Context Sandwich:** Sink/Middle/Window pattern
- **MemPalace:** Palace → Wing → Room → Drawer hierarchies
- **CAS (Content-Addressed Store):** SHA-256 based storage
- **FTS5 Indexing:** Full-text search across all indexed content
- REST API (8 endpoints)
- Async SQLite with schema migration

### 4. **Session Memory** (`packages/session-memory`)
- SQLite snapshot/restore mechanism
- Event logging system
- Integrated checkpoint commands

### 5. **Sandbox Runner** (`packages/sandbox-runner`)
- Isolated Python/Bash execution
- Resource limits (CPU, memory, timeout)
- Output capture and error handling

### 6. **CLI** (`apps/cli`)
- compress, index, search commands
- session checkpoint/resume
- memory remember/recall/list
- storage cas store/fetch

## Data Flow

1. **Compression Request**
   - User calls `ct_compress` via Claude/CLI
   - MCP Server routes to TypeScript handler
   - Returns compressed text + token delta

2. **Indexing & Search**
   - `ctx_index` sends content to Python backend
   - Python indexes via FTS5
   - `ctx_search` queries the index

3. **Memory Operations**
   - `mem_remember` stores in MemPalace hierarchy
   - `mem_recall` retrieves with context
   - All backed by SQLite

4. **Session Persistence**
   - `ctx_checkpoint` snapshots SQLite state
   - `ctx_resume` restores from snapshot
   - Full reproducibility across sessions

## Deployment Strategy

- **Local:** Node.js + Python uvicorn + SQLite
- **Production:** Kubernetes with:
  - Flagger canary orchestration
  - ArgoCD GitOps
  - Prometheus monitoring
  - 3-phase rollout (10% → 50% → 100%)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Compression Ratio | 89.1% |
| Token Savings | 10.9% avg |
| MCP Tool Latency | <100ms |
| FTS5 Query | <50ms (1000 docs) |
| Session Checkpoint | <500ms |

## Technology Stack

- **Frontend:** Claude Desktop + MCP Protocol
- **Node.js:** TypeScript 5.x, Pnpm 9+
- **Python:** uvicorn, aiohttp, SQLite
- **Database:** SQLite + FTS5
- **Container:** Docker + Kubernetes
- **Orchestration:** ArgoCD + Flagger
- **Monitoring:** Prometheus + Grafana
