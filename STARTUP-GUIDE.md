# CompText Revolution — Production Mode Startup Guide

**Status**: ✅ Ready to Start  
**Mode**: Production (Python Backend + MCP Server)  
**Date**: 2026-04-29

---

## 🚀 QUICK START (3 Steps)

### Step 1: Build MCP Server Only

```bash
cd packages/mcp-server
npx tsc
cd ../..
```

**Expected**: ✅ No errors

---

### Step 2: Start Python Backend (Terminal 1)

```bash
cd packages-py
python -m uvicorn ct_vault_core.rest_api:app --port 8000 --reload
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Verify** (in another terminal):
```bash
curl http://localhost:8000/health
```

---

### Step 3: Start MCP Server (Terminal 2)

```bash
cd /c/Users/contr/comptext-revolution
USE_PYTHON=true node packages/mcp-server/dist/index.js
```

**Expected Output**:
```
[MCP] CompText Revolution Server (15 tools, Python-integrated)
```

---

## 🔌 Integrate with Claude Desktop

### Copy Configuration

Copy `claude_desktop.json` to Claude config directory:

**Windows**:
```bash
copy claude_desktop.json %APPDATA%\Claude\claude_desktop.json
```

**macOS**:
```bash
cp claude_desktop.json ~/Library/Application\ Support/Claude/claude_desktop.json
```

**Linux**:
```bash
cp claude_desktop.json ~/.config/Claude/claude_desktop.json
```

### Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Tools should now be available in MCP tools menu

---

## ✅ VERIFICATION CHECKLIST

### Python Backend
- [ ] Running on localhost:8000
- [ ] Health endpoint responds
- [ ] Logs show "Application startup complete"

### MCP Server
- [ ] Running (stdio JSON-RPC)
- [ ] Logs show "15 tools, Python-integrated"
- [ ] USE_PYTHON=true env var set

### Claude Desktop
- [ ] Config copied to right location
- [ ] Claude Desktop restarted
- [ ] MCP menu shows tools available

---

## 🎯 TEST THE SYSTEM

### Via Command Line (before Claude Desktop)

```bash
# Test compression (calls Python backend)
USE_PYTHON=true node packages/mcp-server/dist/tools-test-suite.js
```

**Expected**: ✅ 15/15 PASS

### Via Claude Desktop

Once integrated:

1. Open Claude Desktop
2. Click Tools icon (bottom right)
3. Select a tool:
   - `ct_compress` — Compress text
   - `mem_remember` — Store memory
   - `ctx_search` — Search indexed content
   - etc.

4. Use the tool by providing input
5. MCP server routes to Python backend
6. Result returned to Claude

---

## 📊 SYSTEM ARCHITECTURE

```
Claude Desktop (MCP Client)
        ↓ (stdio JSON-RPC)
[MCP Server] (TypeScript)
  ├─ Tool Definitions (15)
  ├─ Tool Handler (routing)
  └─ Python Bridge (HTTP client)
        ↓ (HTTP)
Python Backend (FastAPI on :8000)
  ├─ KVTC (compression)
  ├─ MemPalace (memory)
  ├─ CAS (storage)
  ├─ Database (SQLite)
  └─ REST API (8 endpoints)
```

---

## 🔍 TROUBLESHOOTING

### "Python backend unavailable"
```bash
# Check if Python backend is running
curl http://localhost:8000/health

# If fails, restart Python:
cd packages-py
python -m uvicorn ct_vault_core.rest_api:app --port 8000
```

### "Unknown tool: ct_compress"
```bash
# Rebuild MCP server
cd packages/mcp-server
npx tsc
cd ../..

# Restart MCP server
USE_PYTHON=true node packages/mcp-server/dist/index.js
```

### "Module not found: uvicorn"
```bash
# Install Python dependencies
cd packages-py
pip install -e .
```

---

## 📈 MONITORING

### Check Python Backend Logs

Watch for:
- ✅ "Application startup complete"
- ✅ POST /compress (compression requests)
- ✅ POST /remember (memory storage)
- ✅ GET /health (health checks)

### Check MCP Server Logs

Watch for:
- ✅ Tool handler routing
- ✅ Python bridge HTTP calls
- ✅ Tool execution success/failure

### Check Claude Desktop

- Tool execution in conversation
- MCP tool menu shows all 15 tools
- Results appear in Claude's responses

---

## 🎊 YOU'RE READY!

Once all three are running:
- ✅ Python Backend (localhost:8000)
- ✅ MCP Server (stdio)
- ✅ Claude Desktop (configured)

**You can use all 15 tools immediately:**

```
"Compress this text to save tokens"
→ ct_compress tool called
→ Text compressed via Python backend
→ Result returned to Claude
```

---

## 📋 NEXT STEPS AFTER STARTUP

1. **Test each tool category** (Compression, Memory, Context, Storage)
2. **Verify metrics** (token savings, latency)
3. **Continue Phase 2** (50% traffic deployment)
4. **Plan Phase 3** (100% traffic + model upgrade)

---

**Status**: ✅ READY FOR PRODUCTION USE  
**Owner**: DevOps + Platform Team  
**Next**: Phase 2 Deployment (2026-05-05)
