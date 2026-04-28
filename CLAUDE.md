# CompText Revolution — Claude Code Session Rules

## TOKEN RULES (MANDATORY — ALWAYS FOLLOW)
1. NEVER paste file contents — use Read tool or `cat path/to/file`
2. ONLY show changed lines, not full files
3. BATCH: multiple files in one block, not one by one
4. When context >70%: run /compact immediately
5. Prefer Write/Edit tools over full file rewrites
6. Use ctx_execute for large analysis (never Read 50 files)
7. Use ctx_checkpoint after every completed phase

## RESPONSE STYLE
- No explanations unless asked
- No "I will now..." preambles
- Just code + 1-line comment per block
- Errors: show only the relevant line + fix

## PROJECT CONTEXT
- Repo: comptext-revolution (TypeScript PNPM Monorepo)
- Goal: Token-efficient DSL + MCP platform
- Stack: TypeScript 5.x, PNPM 9+, better-sqlite3, MCP SDK
- Packages: core | indexer | session-memory | sandbox-runner | mcp-server | sdk | apps/cli
- Current phase: check TODO.md for active phase

## CHECKPOINT COMMAND
After each phase completion:
ctx_checkpoint session="comptext-rev" label="phase-X-complete" state={files_done, next_task}
