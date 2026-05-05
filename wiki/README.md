# CompText Revolution Wiki

**Token-efficient DSL kernel for LLM agents** — Complete knowledge base for deployment, integration, and architecture.

## 🗂️ Navigation

### Core Architecture
- **[System Overview](./00-system-overview.md)** — Architecture, components, data flow
- **[DSL Compiler](./01-dsl-compiler.md)** — compressText(), abbreviations, decompression
- **[MCP Server](./02-mcp-server.md)** — 15 tools, tool routing, integration
- **[Python Backend](./03-python-backend.md)** — KVTC, MemPalace, FTS5 indexing

### Deployment & Operations
- **[Canary Deployment](./10-canary-deployment.md)** — 3-phase rollout strategy
- **[Kubernetes Setup](./11-kubernetes-setup.md)** — Manifests, ArgoCD, Flagger
- **[Monitoring](./12-monitoring.md)** — Prometheus, alerts, dashboards
- **[Troubleshooting](./20-troubleshooting.md)** — Common issues, debug guide

### Integration Guides
- **[Claude Desktop Setup](./30-claude-desktop.md)** — MCP configuration
- **[Python Bridge](./31-python-bridge.md)** — HTTP routing, service discovery
- **[CLI Reference](./40-cli-reference.md)** — Commands, flags, examples

### Performance & Benchmarks
- **[Benchmarks](./50-benchmarks.md)** — Compression ratios, speed, scalability
- **[Token Savings Analysis](./51-token-analysis.md)** — Real-world scenarios

## 📊 Wiki Metadata

| Field | Value |
|-------|-------|
| **Created** | 2026-05-05 |
| **Last Updated** | 2026-05-05 |
| **Indexed Articles** | 13 |
| **Total Sections** | 45+ |
| **Search Index** | FTS5-enabled |

## 🔍 Search Index

This wiki is indexed via FTS5 full-text search. Use the **[Wiki Index](./99-index.md)** to discover content by keyword.

## ⚡ Quick Start

```bash
# Deploy to Kubernetes with canary strategy
./scripts/phase-orchestration.sh canary-phase-1

# Check MCP server health
pnpm mcp:health

# Search knowledge base
pnpm wiki:search "compression benchmarks"
```

## 🤝 Contributing

Wiki updates should follow the [Contributing Guide](../CONTRIBUTING.md). All documentation changes trigger automatic FTS5 re-indexing.
