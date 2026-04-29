# CompText Revolution — Integration Guide

**Status**: ✅ **FULLY INTEGRATED**  
**Date**: 2026-04-29

---

## 🎯 What's Integrated

### 1. **TypeScript Monorepo** (packages/)
- ✅ **@comptext/core** — DSL Compiler (Levels 1-5)
- ✅ **@comptext/indexer** — SQLite FTS5 indexing
- ✅ **@comptext/mcp-server** — 15 MCP tools (Python-integrated)
- ✅ **@comptext/cli** — Command-line interface
- ✅ **@comptext/sdk** — Exported utilities
- ✅ **@comptext/session-memory** — Session snapshots + SQLite
- ✅ **@comptext/sandbox-runner** — Isolated Python/Bash execution

### 2. **Python Backend** (packages-py/ct_vault_core/)
- ✅ **KVTC** — Knowledge Vector Token Compression (5 levels)
- ✅ **MemPalace** — [[Palace:Wing:Room:Drawer]] memory system
- ✅ **CAS** — Content-Addressed Store (SHA-256)
- ✅ **Database** — Async SQLite + FTS5
- ✅ **REST API** — FastAPI server (8 endpoints)

### 3. **MCP Server Integration**
- ✅ **15 Complete Tools**:
  - Compression (5): ct_compress, ct_compress_batch, ct_encode, ct_parse, ct_compress_output
  - Memory (4): mem_remember, mem_recall, mem_list, mem_delete
  - Context (3): ctx_index, ctx_search, ctx_checkpoint
  - Storage (2): cas_store, cas_fetch
  - Metrics (1): ct_token_stats

- ✅ **Python Bridge** (python-bridge.ts):
  - HTTP communication with Python backend
  - Automatic fallback to TypeScript implementation
  - Health checks + error recovery

- ✅ **Tool Handler** (tool-handler.ts):
  - Unified execution layer
  - Python-first with in-process fallback
  - Transparent routing

### 4. **Configuration**
- ✅ **claude_desktop.json** — Ready-to-use MCP server config
- ✅ **Environment Variables**:
  - `USE_PYTHON=true` — Enable Python backend
  - `CT_VAULT_API=http://localhost:8000` — Python backend URL
  - `CT_VAULT_PORT=8000` — Python REST API port

---

## 🚀 How Everything Works

```
┌─────────────────────────────────────┐
│     Claude Desktop / Chat          │
│     (uses MCP protocol)             │
└────────────────┬────────────────────┘
                 │ (stdio)
                 ▼
┌─────────────────────────────────────┐
│  MCP Server (TypeScript)            │
│  └─ packages/mcp-server/src/index.ts│
│     15 tools defined + handlers     │
└────────────────┬────────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
   Python Bridge       Fallback
   (if healthy)      (if unavailable)
        │                  │
        ▼                  │
   HTTP Requests           │
   (localhost:8000)        │
        │                  │
        ▼                  │
   CT-Vault Python         │
   Backend                 │
   - KVTC compress         │
   - MemPalace recall      │
   - CAS store             │
   - FTS5 search           │
        │                  │
        └────────┬─────────┘
                 ▼
            Response (JSON)
```

---

## 📦 File Structure

```
comptext-revolution/
├── packages/
│   ├── core/                  # DSL compiler
│   ├── indexer/               # SQLite FTS5 indexing
│   ├── mcp-server/            # 15 MCP tools (Python-integrated)
│   │   └── src/
│   │       ├── index.ts           (main MCP server)
│   │       ├── tools.ts           (tool definitions)
│   │       ├── tool-handler.ts    (Python-first routing)
│   │       ├── python-bridge.ts   (HTTP client)
│   │       └── research-tools.ts  (testing utilities)
│   ├── cli/                   # CLI commands
│   ├── sdk/                   # Exported utilities
│   ├── session-memory/        # Session snapshots
│   └── sandbox-runner/        # Isolated execution
│
├── packages-py/
│   └── ct_vault_core/
│       ├── kvtc.py            # Compression engine
│       ├── mem_palace.py       # Memory system
│       ├── cas.py              # Content-addressed store
│       ├── database.py         # Async SQLite + FTS5
│       ├── safety_gate.py      # Security validation
│       └── rest_api.py         # FastAPI (8 endpoints)
│
├── claude_desktop.json        # MCP server config
├── pnpm-workspace.yaml        # Monorepo config
├── TODO.md                    # Progress tracker
└── INTEGRATION-GUIDE.md       # This file
```

---

## 🔧 Setup & Deployment

### Phase 0: Build
```bash
# Install dependencies
pnpm install

# Build TypeScript packages
pnpm build

# Build Python backend
cd packages-py
pip install -e .
cd ..
```

### Phase 1: Start Python Backend
```bash
# Terminal 1: Start CT-Vault REST API
cd packages-py
python -m uvicorn ct_vault_core.rest_api:app --port 8000 --reload
# Expected: Uvicorn running on http://localhost:8000
```

### Phase 2: Start MCP Server
```bash
# Terminal 2: Build & start MCP server
pnpm build
node packages/mcp-server/dist/index.js
# Expected: [MCP] CompText Revolution Server (15 tools, Python-integrated)
```

### Phase 3: Use in Claude Desktop
```bash
# Copy claude_desktop.json to Claude Desktop config directory
# macOS: ~/Library/Application\ Support/Claude/claude_desktop.json
# Windows: %APPDATA%\Claude\claude_desktop.json
# Linux: ~/.config/Claude/claude_desktop.json

cp claude_desktop.json "~/Library/Application Support/Claude/claude_desktop.json"

# Restart Claude Desktop
# Now you can use all 15 CompText tools in Claude
```

---

## 🧪 Testing Integration

### Test 1: MCP Server Responds
```bash
curl http://localhost:3000/health   # If REST server enabled
# OR check MCP stdio directly
```

### Test 2: Python Backend Connected
```bash
# Start MCP server with debug output
USE_PYTHON=true node packages/mcp-server/dist/index.js 2>&1 | grep "Python backend"
```

### Test 3: Call a Tool (via Claude Desktop)
```
User: "Compress this text: 'This is a very basic example document'"
Claude uses ct_compress tool → routes to Python → returns compressed version
```

---

## 📊 Integration Checklist

- [x] **TypeScript Monorepo**
  - [x] All 7 packages defined
  - [x] Workspace dependencies configured
  - [x] pnpm build succeeds

- [x] **Python Backend**
  - [x] All modules (KVTC, MemPalace, CAS, Database)
  - [x] REST API server (8 endpoints)
  - [x] Async SQLite + FTS5

- [x] **MCP Server**
  - [x] 15 tools defined in tools.ts
  - [x] Python bridge integration
  - [x] Tool handler routing
  - [x] Fallback implementations

- [x] **Configuration**
  - [x] claude_desktop.json created
  - [x] Environment variables documented
  - [x] Python API endpoint configured

- [x] **Documentation**
  - [x] INTEGRATION-GUIDE.md (this file)
  - [x] claude_desktop.json comments
  - [x] python-bridge.ts documented
  - [x] tool-handler.ts documented

---

## 🔄 How Tools Work

### Example: ct_compress
```
1. Claude calls tool: ct_compress(text="...", level=2)
2. MCP Server receives JSON request
3. tool-handler.ts checks: USE_PYTHON=true?
4. Yes → executeTool() calls pythonBridge.compress()
5. pythonBridge makes HTTP POST to http://localhost:8000/compress
6. Python backend (KVTC) processes and returns result
7. JSON response returned to Claude

If Python backend unavailable:
5. executeTool() falls back to compressTextFallback()
6. TypeScript compression engine processes (same algorithm)
7. Result returned (same format)
```

### Example: mem_remember → mem_recall
```
1. mem_remember(palace="math", wing="algebra", room="equations", content="...")
   → sends to Python MemPalaceDB.remember()
   
2. mem_recall(query="algebra", topK=5)
   → searches Python MemPalaceDB via FTS5 BM25 ranking
   → returns top 5 matches
```

---

## 🚨 Troubleshooting

### "Python backend unavailable"
- [ ] Check if ct_vault_core.rest_api is running
- [ ] Verify CT_VAULT_API points to correct URL (default: localhost:8000)
- [ ] Check firewall/networking

### "Unknown tool: ct_compress"
- [ ] Verify pnpm build completed
- [ ] Check tools.ts has all 15 tools defined
- [ ] Restart Claude Desktop

### "Command not found: comptext-mcp"
- [ ] Run pnpm install
- [ ] Run pnpm build
- [ ] Verify packages/mcp-server/dist/bin.js exists

---

## 📝 Next Steps

1. **Deploy**: Kubernetes manifests in k8s/ (from Canary Deployment docs)
2. **Monitor**: Prometheus metrics collection (from k8s/prometheus-config.yaml)
3. **Test**: Load testing with scripts/load-test.js
4. **Optimize**: Profile compression vs. latency tradeoffs

---

**Integration Status**: ✅ COMPLETE  
**All 15 tools**: ✅ AVAILABLE  
**Python backend**: ✅ OPTIONAL (fallback available)  
**Ready for**: ✅ CLAUDE DESKTOP USE  

