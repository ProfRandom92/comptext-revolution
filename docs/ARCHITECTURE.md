# CompText Revolution — Architecture

## Overview

CompText Revolution is a monorepo platform built around a single core idea:
**compress the interface between humans/agents and LLMs.**

## Layer Stack

```
┌─────────────────────────────────────────────┐
│              Applications                   │
│         CLI  ·  REST API  ·  IDE Plugins     │
├─────────────────────────────────────────────┤
│                  SDK                        │
│           @comptext/sdk (unified)           │
├──────────────┬──────────────────────────────┤
│  MCP Server  │  REST Server                 │
│  (stdio)     │  (HTTP/JSON)                 │
├──────┬───────┴───────┬──────────────────────┤
│ Core │   Indexer     │ Session Memory        │
│ DSL  │   SQLite FTS5 │ Snapshots + Events    │
├──────┴───────────────┴──────────────────────┤
│            Sandbox Runner                   │
│       Isolated Code Execution               │
└─────────────────────────────────────────────┘
```

## Data Flow

### Compression Flow
```
raw text → tokenizer → compression engine → CompText DSL → LLM
```

### Retrieval Flow
```
document/URL → chunker → FTS5 index → BM25 search → top-K snippets → LLM
```

### Session Flow
```
agent start → log events → checkpoint → [crash/restart] → resume → continue
```

## Design Principles

1. **Local-first** — SQLite, no external services required
2. **Token-efficient** — every output is as compact as possible
3. **Platform-agnostic** — works with Claude, GPT, Gemini, any LLM
4. **Composable** — each package works standalone or together
5. **TypeScript-native** — full types, ESM, no legacy cruft
