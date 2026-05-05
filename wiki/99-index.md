# Wiki Full-Text Index (FTS5)

**Last Updated:** 2026-05-05  
**Total Articles:** 13  
**Indexed Sections:** 45+  

## Search This Wiki

For semantic search across all articles, run:

```bash
pnpm wiki:search "your query"
```

## Keyword Index

### Architecture & Design
- **System Overview** → architecture, components, data flow, deployment
- **DSL Compiler** → compression, abbreviation, levels 1-5, decompression
- **MCP Server** → 15 tools, routing, Claude Desktop configuration
- **Python Backend** → KVTC, MemPalace, FTS5, indexing

### Operations & Deployment
- **Canary Deployment** → 3-phase rollout, Flagger, ArgoCD
- **Kubernetes Setup** → manifests, ingress, scaling
- **Monitoring** → Prometheus, Grafana, alerts
- **Troubleshooting** → common issues, debug procedures

### Integration
- **Claude Desktop Setup** → MCP configuration, tool discovery
- **Python Bridge** → HTTP routing, service discovery, fallback
- **CLI Reference** → commands, flags, examples

### Performance
- **Benchmarks** → compression ratios, throughput, scalability
- **Token Analysis** → real-world scenarios, savings calculation

---

## Quick Links

| Topic | Article | Section |
|-------|---------|----------|
| Get started | [System Overview](./00-system-overview.md) | Architecture |
| Compress text | [DSL Compiler](./01-dsl-compiler.md) | Compression Levels |
| Use tools | [MCP Server](./02-mcp-server.md) | Tool Categories |
| Deploy prod | [Canary Deployment](./10-canary-deployment.md) | Phase 1 |
| Debug issues | [Troubleshooting](./20-troubleshooting.md) | Common Issues |
| Configure Claude | [Claude Desktop](./30-claude-desktop.md) | Installation |
| View stats | [Benchmarks](./50-benchmarks.md) | Real-World Results |

---

## Search Examples

### Find articles by keyword:
```bash
pnpm wiki:search "kubernetes"
# Returns: Canary Deployment, Kubernetes Setup, Monitoring

pnpm wiki:search "compression"
# Returns: DSL Compiler, MCP Server, Benchmarks, Token Analysis

pnpm wiki:search "debug"
# Returns: Troubleshooting, MCP Server (Debugging section)
```

### Filter by category:
```bash
pnpm wiki:search "deployment" --category operations
pnpm wiki:search "tool" --category integration
pnpm wiki:search "algorithm" --category architecture
```

---

## Full Article Index

1. **00-system-overview.md** — Architecture, components, data flow
2. **01-dsl-compiler.md** — Compression algorithms, API, benchmarks
3. **02-mcp-server.md** — Tool reference, routing, configuration
4. **03-python-backend.md** — KVTC, MemPalace, FTS5, REST API
5. **10-canary-deployment.md** — Deployment strategy, phases, rollback
6. **11-kubernetes-setup.md** — Manifests, ArgoCD, Flagger CRDs
7. **12-monitoring.md** — Prometheus, Grafana, alerting, SLOs
8. **20-troubleshooting.md** — Common issues, debug guide, FAQs
9. **30-claude-desktop.md** — MCP setup, tool discovery, examples
10. **31-python-bridge.md** — HTTP routing, service discovery, fallback
11. **40-cli-reference.md** — Commands, flags, examples, scripting
12. **50-benchmarks.md** — Compression ratios, performance, scalability
13. **51-token-analysis.md** — Real-world token savings, ROI calculation

---

## Metadata

```json
{
  "wiki": {
    "name": "CompText Revolution Wiki",
    "created": "2026-05-05",
    "articles": 13,
    "sections": 45,
    "indexed_keywords": 150,
    "fts5_enabled": true,
    "search_latency_ms": 25,
    "last_reindex": "2026-05-05T00:00:00Z"
  }
}
```

## Contributing

To add new articles:

1. Create file in `wiki/` with pattern `NN-title.md`
2. Use consistent heading hierarchy (# → ## → ###)
3. Add article reference to **README.md** navigation
4. Update this index with keyword mappings
5. Push changes (auto-triggers FTS5 reindex)

See [Contributing Guide](../CONTRIBUTING.md) for details.
