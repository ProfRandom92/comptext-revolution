/**
 * @comptext/mcp-server
 * MCP + REST server exposing all CompText tools
 *
 * Available MCP Tools:
 *   ctx_compress   — Compress text using CompText DSL
 *   ctx_index      — Index a document/URL into the context store
 *   ctx_search     — Search the context index (BM25)
 *   ctx_execute    — Execute code in the sandbox
 *   ctx_save       — Save a session checkpoint
 *   ctx_resume     — Resume a previous session
 *   ctx_fetch_index — Fetch a URL and index it
 */

import { compile } from '@comptext/core'
import { Indexer } from '@comptext/indexer'
import { SessionMemory } from '@comptext/session-memory'

export { compile, Indexer, SessionMemory }

// TODO: wire up MCP SDK server with all tools
// TODO: add REST API layer (fetch/Hono)

console.log('[CompText MCP Server] Starting...')
