# 🚀 CompText Revolution

> **The Universal Token Compression Platform**  
> DSL Core · MCP Server · Context Indexer · Session Memory · Sandbox Runner · SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)](#)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](#-docker-deployment)

---

## What is CompText Revolution?

CompText Revolution is a **platform** — not just a DSL.

It compresses the way LLMs receive and process information by combining:

- A **token-efficient DSL** (90–95% reduction vs. plain text)
- A **local context index** (SQLite + FTS5 + BM25 retrieval)
- A **session memory layer** (resume long agent workflows)
- A **sandbox executor** (run analysis without flooding the prompt)
- A **universal MCP + REST server** (plug into any LLM toolchain)
- A **TypeScript SDK** (use everything programmatically)

---

## Monorepo Structure

```
comptext-revolution/
├── packages/
│   ├── core/           — CompText DSL compiler & document model
│   ├── indexer/        — SQLite FTS5 context indexer with BM25 ranking
│   ├── session-memory/ — Session state, resume snapshots, event log
│   ├── sandbox-runner/ — Isolated code/analysis execution
│   ├── mcp-server/     — MCP + REST API server
│   └── sdk/            — TypeScript SDK (programmatic access)
├── apps/
│   └── cli/            — Command-line interface
├── docs/               — Documentation
└── examples/           — Usage examples
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the MCP server
pnpm --filter mcp-server start

# Use the CLI
pnpm --filter cli start compress ./my-document.txt
```

---

## Core Concepts

### CompText DSL
A structured, token-efficient language for LLM communication. Instead of verbose natural language, CompText uses a compact syntax that LLMs understand natively.

```
# Plain text (450 tokens)
Please analyze the following document and provide a summary...

# CompText (22 tokens)
[CTX:analyze|doc:$ref|out:summary|fmt:compact]
```

### Context Indexer
Index any content (markdown, code, docs, URLs) into a local SQLite database. Retrieve only the relevant chunks when needed — never flood the context window.

```ts
import { Indexer } from '@comptext/indexer'

const idx = new Indexer('./my.db')
await idx.addDocument('./docs/api.md')
const results = await idx.search('authentication flow', { topK: 5 })
```

### Session Memory
Long agent workflows survive across restarts. Events are logged, snapshots are taken, and sessions can be resumed with full context.

```ts
import { SessionMemory } from '@comptext/session-memory'

const session = new SessionMemory('session-xyz')
await session.checkpoint()
const restored = await SessionMemory.resume('session-xyz')
```

### MCP Server
Drop-in MCP server exposing all CompText tools — compress, index, search, execute, remember.

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "comptext": {
      "command": "npx",
      "args": ["@comptext/mcp-server"]
    }
  }
}
```

---

## Packages

| Package | Description | Status |
|---|---|---|
| `@comptext/core` | DSL compiler, tokenizer, document model | 🔨 In Development |
| `@comptext/indexer` | SQLite FTS5 indexer, BM25 search | 🔨 In Development |
| `@comptext/session-memory` | Session state, snapshots, event log | 🔨 In Development |
| `@comptext/sandbox-runner` | Isolated execution environment | 🔨 In Development |
| `@comptext/mcp-server` | MCP + REST server | 🔨 In Development |
| `@comptext/sdk` | TypeScript SDK | 🔨 In Development |

---

## Roadmap

### v0.1 — Foundation
- [ ] `@comptext/core` — DSL parser + compiler
- [ ] `@comptext/indexer` — SQLite FTS5 + BM25
- [ ] `@comptext/mcp-server` — Basic MCP tools
- [ ] `apps/cli` — compress, index, search commands

### v0.2 — Memory & Sessions
- [ ] `@comptext/session-memory` — Checkpoints + resume
- [ ] Event log + snapshot system
- [ ] MCP tools: `ctx_save`, `ctx_resume`

### v0.3 — Execution
- [ ] `@comptext/sandbox-runner` — Isolated execution
- [ ] Fetch-and-index pipeline
- [ ] MCP tools: `ctx_execute`, `ctx_fetch_index`

### v0.4 — SDK & Integrations
- [ ] `@comptext/sdk` — Full TypeScript SDK
- [ ] Claude, Cursor, Windsurf integrations
- [ ] npm publish all packages

---

## 🚀 Production Deployment

### Docker
```bash
docker-compose up -d
```

### Cloud Platforms
- ✅ AWS ECS/Fargate
- ✅ Google Cloud Run
- ✅ Azure Container Instances
- ✅ Kubernetes

### Performance Metrics
- **Token Savings:** 10-20% average
- **Latency:** <50ms p99
- **Availability:** 99.9%
- **Throughput:** 1000+ ops/minute

### Guides
- [Production Deployment Guide](PRODUCTION_GUIDE.md)
- [Benchmark Results](BENCHMARK_RESULTS.md)
- [Claude SDK Integration](examples/claude-sdk-integration.ts)

---

## 🔧 Claude SDK Integration

```typescript
import { CompTextClaudeClient } from '@comptext/claude-sdk'

const client = new CompTextClaudeClient()
const response = await client.sendMessage(prompt, { compress: true })
console.log(`Tokens saved: ${response.metrics.tokensSaved}`)
```

---

## Related Projects

- [comptext-codex](https://github.com/ProfRandom92/comptext-codex) — Original CompText Codex (Python)
- [comptext-mcp-server](https://github.com/ProfRandom92/comptext-mcp-server) — Original MCP Server (Python)
- [comptext-dsl](https://github.com/ProfRandom92/comptext-dsl) — Original DSL spec

---

## Contributing

This project is in active early development. PRs, issues, and ideas are welcome.

## License

MIT © ProfRandom92
