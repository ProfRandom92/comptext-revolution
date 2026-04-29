#!/usr/bin/env node

/**
 * CompText Revolution MCP Server Binary
 * Entry point for the MCP server executable
 */

// Start the MCP server (imported from index.ts)
import('./index.js').catch((err) => {
  console.error('Failed to start CompText MCP server:', err)
  process.exit(1)
})
