## CompText MCP — Quick Tool Reference

### Most Useful Compression Tools

**ct_compress** - Main compression tool
- Levels 1-5 (default: 2)
- Level 2: ~38% savings (abbreviations)
- Level 5: ~55% savings (skeleton compression)
- Example: `{"text": "...", "level": 3}`

**ct_token_stats** - System health check
- Shows operations count, tokens saved, system metrics
- Use to verify MCP server is running

### Most Useful Research Tools

**research_run_experiments** - Run optimization tests
- Experiments: "compression-variants", "level-tuning", "storage-allocation", "all"
- Returns variant comparisons with metrics

**research_cost_projection** - Calculate savings
- Input: monthly tokens, current/target savings %, cost per token
- Output: cost reduction analysis and payoff period

**research_optimization_roadmap** - Get optimization plan
- Timeframes: "3-months", "12-months"
- Returns phased optimization strategy

### Most Useful Memory Tools

**mem_remember** - Store context
- Structure: palace → wing → room → content
- Example palace: "ProjectAlpha", wing: "Architecture", room: "Database"

**mem_recall** - Retrieve context
- Query-based search across stored memories
- Returns top K matches (default: 5)

### Most Useful Search Tools

**ctx_index** - Index document for searching
- Stores content with metadata tag
- Supports full-text BM25 search

**ctx_search** - Search indexed documents
- Returns snippets with token counts
- Can filter by tag

## Configuration for Claude

```json
{
  "mcpServers": {
    "comptext": {
      "command": "npx",
      "args": ["@comptext/mcp-server"],
      "description": "CompText Revolution — Token Compression"
    }
  }
}
```

File location: ~/.claude/claude_desktop_config.json