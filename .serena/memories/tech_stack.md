## CompText Revolution - Tech Stack

**Frontend/Core**:
- TypeScript 5.4+ (strict mode, ES2022 target)
- Node.js 18+
- PNPM 8+ (workspace monorepo)

**Backend/Storage**:
- SQLite3 with better-sqlite3 driver
- FTS5 (Full-Text Search)
- Python 3.8+ for backend services

**Testing & Quality**:
- Vitest 1.0+ (unit testing)
- ESLint 8+ (linting)
- Prettier 3+ (formatting)

**MCP Integration**:
- MCP SDK (Model Context Protocol)
- 15+ tools planned for Claude integration
- claude_desktop.json configuration

**Workspace Structure**:
```
packages/
  ├── core/           # Compression engine (TypeScript)
  ├── indexer/        # SQLite indexing + FTS5
  ├── mcp-server/     # MCP protocol implementation
  ├── sdk/            # Public API
  ├── session-memory/ # Snapshot/restore logic
  └── sandbox-runner/ # Isolated execution

apps/
  └── cli/            # Command-line interface

research/
  ├── autoresearch-runner.js    # 5-hour autonomous optimization
  ├── advanced-monitoring-server.js
  └── [experimental setups]
```