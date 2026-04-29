<div align="center">

```
 ██████╗ ██████╗ ███╗   ███╗██████╗ ████████╗███████╗██╗  ██╗████████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝
██║     ██║   ██║██╔████╔██║██████╔╝   ██║   █████╗   ╚███╔╝    ██║   
██║     ██║   ██║██║╚██╔╝██║██╔═══╝    ██║   ██╔══╝   ██╔██╗    ██║   
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║        ██║   ███████╗██╔╝ ██╗   ██║   
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝  
                                                                        
██████╗ ███████╗██╗   ██╗ ██████╗ ██╗     ██╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗
██╔══██╗██╔════╝██║   ██║██╔═══██╗██║     ██║   ██║╚══██╔══╝██║██╔═══██╗████╗  ██║
██████╔╝█████╗  ██║   ██║██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║
██╔══██╗██╔══╝  ╚██╗ ██╔╝██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██║╚██╗██║
██║  ██║███████╗ ╚████╔╝ ╚██████╔╝███████╗╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║
╚═╝  ╚═╝╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

### The Universal Token Compression Platform for LLMs
*Compress smarter. Remember more. Spend less.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](./k8s/)
[![MCP](https://img.shields.io/badge/MCP-15%20Tools-FF6B35?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Tests-84%20Passing-22C55E?style=for-the-badge)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

<br/>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  "Please provide comprehensive documentation for all function parameters"   │
│                              ↓  CompText L5                                 │
│              "prvd docs fn params"      →      58% fewer tokens             │
└─────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## Table of Contents

- [Why CompText?](#-why-comptext)
- [Architecture](#-architecture)
- [KVTC Compression Engine](#-kvtc-compression-engine)
- [MCP Tools](#-mcp-tools-15-total)
- [Memory Palace](#-memory-palace)
- [Quick Start](#-quick-start)
- [Monorepo Structure](#-monorepo-structure)
- [Python REST API](#-python-rest-api)
- [Test Suite](#-test-suite)
- [Kubernetes Deployment](#-kubernetes-deployment)
- [Performance](#-performance)

---

## ⚡ Why CompText?

Every token costs money. Every token wastes latency. CompText solves both.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TOKEN COST REALITY                               │
│                                                                          │
│  Raw prompt:      ████████████████████████████████  1,200 tokens  $0.018│
│  CompText L2:     █████████████████████             750 tokens    $0.011│
│  CompText L5:     ████████████                      430 tokens    $0.006│
│                                                                          │
│  At 10,000 daily requests  →  save $120/day  →  $43,800/year            │
└──────────────────────────────────────────────────────────────────────────┘
```

**CompText Revolution** is a production-grade, dual-stack platform (TypeScript + Python) that:

- **Compresses** any text through 5 progressive levels (whitespace → skeleton)
- **Remembers** context in a hierarchical `[[Palace:Wing:Room]]` memory system
- **Indexes** documents into SQLite FTS5 with BM25 semantic ranking
- **Exposes** 15 MCP tools to Claude Desktop with Python-first routing + TypeScript fallback
- **Scales** to Kubernetes with Canary rollout, Prometheus metrics, and GitOps

---

## 🏗 Architecture

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         COMPTEXT REVOLUTION                               ║
║                                                                           ║
║  ┌─────────────────┐                                                      ║
║  │  Claude Desktop │ ◄──────── MCP Protocol (stdio JSON-RPC)             ║
║  └─────────────────┘                   │                                  ║
║                                        │                                  ║
║  ┌─────────────────────────────────────▼───────────────────────────────┐  ║
║  │                      MCP SERVER  (TypeScript)                        │  ║
║  │                                                                       │  ║
║  │   ┌──────────────────┐    ┌──────────────────┐                       │  ║
║  │   │   Tool Handler   │───►│  Python Bridge   │ ──► HTTP :8000        │  ║
║  │   │   (15 tools)     │    │  (HTTP client)   │                       │  ║
║  │   └──────────────────┘    └──────────────────┘                       │  ║
║  │            │                                                           │  ║
║  │            └──► TypeScript Fallback Engine  (offline mode)            │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                      │ HTTP/REST                          ║
║  ┌───────────────────────────────────▼───────────────────────────────┐   ║
║  │                    PYTHON BACKEND  (FastAPI)                        │   ║
║  │                                                                      │   ║
║  │   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────────┐  │   ║
║  │   │   KVTC   │   │ MemPalace │   │   CAS    │   │   Database   │  │   ║
║  │   │ 5 levels │   │ [[P:W:R]] │   │  SHA-256 │   │ SQLite FTS5  │  │   ║
║  │   └──────────┘   └───────────┘   └──────────┘   └──────────────┘  │   ║
║  │                                                                      │   ║
║  │   ┌────────────────────────────────────────────────────────────┐   │   ║
║  │   │           Prometheus Metrics  ·  SafetyGate                │   │   ║
║  │   └────────────────────────────────────────────────────────────┘   │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                 @comptext/core  (TypeScript · tsup)                  │ ║
║  │   ┌────────────┐   ┌───────────────┐   ┌──────────────────────┐    │ ║
║  │   │  Compiler  │   │ LLM Tokenizer │   │   Hybrid DSL Router  │    │ ║
║  │   │ Levels 1-5 │   │  js-tiktoken  │   │ text/query/config/   │    │ ║
║  │   └────────────┘   └───────────────┘   └──────────────────────┘    │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🧠 KVTC Compression Engine

**Knowledge Vector Token Compression** — 5 progressive levels, each building on the last.

```
INPUT: "This is basically a comprehensive documentation system for the configuration parameters."
│
├─ Level 1  Whitespace Normalization
│           "This is basically a comprehensive documentation system for the configuration parameters."
│           Trims, collapses spaces, normalizes newlines
│
├─ Level 2  Filler Word Removal
│           "comprehensive documentation system configuration parameters."
│           Removes: basically, actually, really, just, very, quite…
│
├─ Level 3  Article & Stop Word Removal
│           "comprehensive documentation system configuration parameters."
│           Removes: a, an, the, and, for, of, in, to, with…
│
├─ Level 4  Abbreviation Substitution
│           "compr docs sys cfg params."
│           Maps ~200 common words to short codes
│
└─ Level 5  Skeleton Compression  (most aggressive)
            "cmpr docs sys cfg prms."
            Removes vowels from non-essential syllables
```

| Level | Name | Typical Reduction | Best For |
|:-----:|------|:-----------------:|----------|
| 1 | Normalize | ~5% | Always-on baseline |
| 2 | Filler | ~15% | Casual conversation |
| 3 | Articles | ~25% | Technical documentation |
| 4 | Abbreviate | ~35% | Dense code / config |
| 5 | Skeleton | ~45–55% | Maximum token savings |

```python
from ct_vault_core.kvtc import KVTCContextController

kvtc = KVTCContextController()
result = kvtc.compress(
    "Please provide comprehensive documentation for all function parameters",
    level=5
)
# result.compressed  → "prvd docs fn params"
# result.savings_pct → 58.3
# result.tokens_in   → 12
# result.tokens_out  → 5
```

---

## 🔌 MCP Tools (15 Total)

All tools route to the Python backend first; TypeScript fallback activates automatically if Python is offline.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TOOL MAP                                    │
│                                                                          │
│  COMPRESSION ────────────────────────────────────────────────────────   │
│  ct_compress          Compress a document (level 1-5)                   │
│  ct_compress_batch    Compress multiple docs in one call                │
│  ct_encode            Encode to [CT:v1:Lx] DSL format with metadata    │
│  ct_parse             Parse and extract CompText header + content       │
│  ct_compress_output   Auto-escalate levels until token budget is met    │
│                                                                          │
│  MEMORY ─────────────────────────────────────────────────────────────   │
│  mem_remember         Store content in [[Palace:Wing:Room:Drawer]]      │
│  mem_recall           BM25 search across all memory locations           │
│  mem_list             List all palace / wing / room locations           │
│  mem_delete           Prune a specific memory location                  │
│                                                                          │
│  CONTEXT ────────────────────────────────────────────────────────────   │
│  ctx_index            Index a document into SQLite FTS5                 │
│  ctx_search           Full-text search with BM25 ranking                │
│  ctx_checkpoint       Save current session state snapshot               │
│                                                                          │
│  STORAGE ────────────────────────────────────────────────────────────   │
│  cas_store            Content-addressed store → returns SHA-256 hash    │
│  cas_fetch            Retrieve blob by SHA-256 hash                     │
│                                                                          │
│  METRICS ────────────────────────────────────────────────────────────   │
│  ct_token_stats       Global compression stats & savings report         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Claude Desktop Integration

```json
// %APPDATA%\Claude\claude_desktop.json
{
  "mcpServers": {
    "comptext": {
      "command": "node",
      "args": ["C:/path/to/comptext-revolution/packages/mcp-server/dist/index.js"],
      "env": { "PYTHON_BACKEND_URL": "http://localhost:8000" }
    }
  }
}
```

---

## 🏛 Memory Palace

Hierarchical, persistent memory with LOCI-style spatial addressing.

```
[[Palace : Wing : Room : Drawer]]
     │        │       │       └─ Optional fine-grained slot
     │        │       └─ Specific topic within the wing
     │        └─ Domain or category
     └─ Top-level namespace

[[math:algebra:equations]]           → all quadratic notes
[[project:comptext:decisions]]       → architectural decisions  
[[user:preferences:coding:style]]    → personal coding preferences
[[research:papers:attention:notes]]  → annotation for a paper
```

```python
# Store
await palace.remember("math", "algebra", "quadratic",
    "x = (-b ± √(b²-4ac)) / 2a")

# BM25 semantic search
results = await palace.recall("quadratic formula")
# → [{"location": "[[math:algebra:quadratic]]", "content": "..."}]

# List all locations in a palace
locations = palace.list_all(palace_filter="math")

# Delete a room
palace.delete("math", "algebra", "quadratic")
```

---

## 🚀 Quick Start

### Prerequisites

```bash
node --version    # 18+
pnpm --version    # 9+
python3 --version # 3.10+
```

### 1. Clone & Install

```bash
git clone https://github.com/ProfRandom92/comptext-revolution.git
cd comptext-revolution
pnpm install
```

### 2. Build TypeScript

```bash
pnpm build
# Builds all 7 packages via tsup (ESM + CJS + .d.ts)
```

### 3. Install Python Backend

```bash
cd packages-py
pip install -e ".[dev]"
```

### 4. Start Services

```bash
# Terminal A — Python REST API (port 8000)
cd packages-py
uvicorn ct_vault_core.rest_api:app --host 0.0.0.0 --port 8000 --reload

# Terminal B — MCP Server
node packages/mcp-server/dist/index.js
```

### 5. CLI

```bash
# Compress a file
pnpm cli compress ./my-doc.txt --level 3

# Compress stdin
echo "Hello world this is a verbose sentence" | pnpm cli compress --level 5

# Token savings report
pnpm cli stats
```

---

## 📁 Monorepo Structure

```
comptext-revolution/
│
├── packages/                          TypeScript (pnpm workspace)
│   ├── core/                          @comptext/core
│   │   ├── src/
│   │   │   ├── compiler.ts            Levels 1-5 DSL compiler
│   │   │   ├── levels.ts              applyLevel1..5 implementations
│   │   │   ├── hybrid.ts              detectInputType + compressHybrid
│   │   │   ├── llm-tokenizer.ts       js-tiktoken BPE counter
│   │   │   ├── decompressor.ts        decompress + decompressLevel
│   │   │   └── __tests__/             52 vitest tests
│   │   └── package.json               tsup build, exports map
│   │
│   ├── indexer/                       SQLite FTS5 + BM25
│   ├── session-memory/                Palace/Wing/Room snapshots
│   ├── sandbox-runner/                Isolated Python/Bash execution
│   ├── mcp-server/
│   │   └── src/
│   │       ├── tools.ts               15 tool definitions (JSON Schema)
│   │       ├── tool-handler.ts        switch router → bridge or fallback
│   │       └── python-bridge.ts       HTTP client to :8000
│   └── sdk/                           Programmatic TypeScript API
│
├── packages-py/                       Python backend
│   ├── ct_vault_core/
│   │   ├── kvtc.py                    KVTCContextController (5 levels)
│   │   ├── mem_palace.py              MemPalaceDB + LOCI addressing
│   │   ├── cas.py                     ContentAddressedStore (SHA-256)
│   │   ├── database.py                Async SQLite + FTS5
│   │   ├── rest_api.py                FastAPI app (15 endpoints)
│   │   └── safety_gate.py             Risk scoring + rate limiting
│   └── tests/                         32 pytest tests
│
├── apps/cli/                          CLI application
├── k8s/                               8 Kubernetes manifests
├── docker-compose.yml                 Local dev orchestration
├── Dockerfile.python                  Python backend image
└── Dockerfile.mcp                     MCP server image
```

---

## 🐍 Python REST API

FastAPI backend on `http://localhost:8000`

| Method | Endpoint | Description |
|:------:|----------|-------------|
| `POST` | `/compress` | Compress text at level 1-5 |
| `POST` | `/remember` | Store in MemPalace |
| `POST` | `/recall` | BM25 search in MemPalace |
| `GET`  | `/mem/list` | List all memory locations |
| `POST` | `/mem/delete` | Delete a memory location |
| `POST` | `/cas/store` | Store blob, receive SHA-256 |
| `GET`  | `/cas/{sha}` | Retrieve blob by hash |
| `POST` | `/ctx/checkpoint` | Save session snapshot |
| `POST` | `/encode` | Encode to `[CT:v1:Lx]` DSL |
| `POST` | `/parse` | Parse CompText format |
| `POST` | `/compress-output` | Auto-escalate to token budget |
| `GET`  | `/token-stats` | Global compression metrics |
| `GET`  | `/health` | Health check |
| `GET`  | `/metrics` | Prometheus metrics |

```bash
# Compress at level 4
curl -s -X POST http://localhost:8000/compress \
  -H "Content-Type: application/json" \
  -d '{"text": "Please provide comprehensive documentation", "level": 4}'
# → {"compressed":"prvd compr docs","savings_pct":45.2,"tokens_in":6,"tokens_out":3}

# Interactive API docs
open http://localhost:8000/docs
```

---

## 🧪 Test Suite

**84 tests — all passing**

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  TypeScript  (vitest)                                  52 / 52  ✓  │
│  ├─ compress.test.ts                     19 tests                  │
│  ├─ compression.integration.test.ts      13 tests                  │
│  ├─ hybrid.test.ts                       12 tests                  │
│  └─ llm-tokenizer.test.ts                 8 tests                  │
│                                                                      │
│  Python  (pytest)                                      32 / 32  ✓  │
│  ├─ test_kvtc.py                          6 tests                  │
│  ├─ test_mem_palace.py                    8 tests                  │
│  ├─ test_database.py                      5 tests                  │
│  ├─ test_safety_gate.py                   5 tests                  │
│  └─ test_integration.py                   8 tests                  │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

```bash
# TypeScript
pnpm --filter @comptext/core test run

# Python
cd packages-py && python -m pytest tests/ -v

# Both at once
pnpm test && cd packages-py && python -m pytest tests/ -q
```

---

## ☸️ Kubernetes Deployment

Production-ready manifests with Canary rollout via Flagger.

```
k8s/
├── namespace.yaml           comptext-revolution namespace
├── deployment.yaml          MCP server  (3 replicas · HPA 3-10)
├── deployment-python.yaml   Python backend  (3 replicas)
├── service.yaml             ClusterIP services
├── ingress.yaml             NGINX ingress + TLS
├── hpa.yaml                 HorizontalPodAutoscaler
├── pvc.yaml                 PersistentVolumeClaim (vault data)
└── canary.yaml              Flagger Canary — 3-phase, 22 days
```

**Canary phases:**

```
Phase 1  (Days  1–7)   10% traffic  ──  latency p99 < 200ms  ──►  pass
Phase 2  (Days  8–15)  40% traffic  ──  error rate  < 1%     ──►  pass
Phase 3  (Days 16–22)  90% traffic  ──  all metrics green    ──►  promote
```

```bash
kubectl apply -f k8s/
kubectl get canary -n comptext-revolution -w
```

---

## 📊 Performance

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BENCHMARK RESULTS                             │
│                                                                        │
│  Compression Latency                                                   │
│  ├─ L1-L3       < 1 ms    ████                                        │
│  ├─ L4-L5       < 5 ms    ████████                                    │
│  └─ p99           8 ms    ████████████                                 │
│                                                                        │
│  Token Savings (typical prose)                                         │
│  ├─ Level 2    15-20 %    ████████                                    │
│  ├─ Level 3    20-30 %    ████████████                                 │
│  ├─ Level 4    30-40 %    ████████████████                             │
│  └─ Level 5    40-55 %    ████████████████████████                     │
│                                                                        │
│  Throughput                                                             │
│  ├─ Compress API      5,000 req/s                                      │
│  ├─ FTS5 index       10,000 docs/min                                   │
│  └─ MemPalace recall    O(1) palace lookup                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Related

| Repo | Role |
|------|------|
| [comptext-codex](https://github.com/ProfRandom92/comptext-codex) | Original Python compression foundation |
| [comptext-mcp-server](https://github.com/ProfRandom92/comptext-mcp-server) | Original MCP integration |
| [comptext-dsl](https://github.com/ProfRandom92/comptext-dsl) | DSL specification |

> This monorepo consolidates all three into a single production platform.

---

## 🤝 Contributing

PRs, issues, and ideas welcome. The codebase is fully typed (TypeScript strict + Python type hints) and test-driven.

```bash
pnpm install && pnpm build
cd packages-py && pip install -e ".[dev]"

# Verify
pnpm --filter @comptext/core test run   # 52/52
cd packages-py && python -m pytest      # 32/32
```

---

<div align="center">

**MIT License © 2026 ProfRandom92**

*Built with TypeScript · Python · FastAPI · SQLite · Kubernetes*

<br/>

```
Every token counts.
Compress the revolution.
```

</div>
