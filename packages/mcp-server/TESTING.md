# CompText MCP Server — Testing Guide

## Unit Testing

### Run tests

```bash
pnpm -C packages/mcp-server test
```

### Test MCP Protocol Directly

```bash
# Start server and pipe test requests
cat << 'EOF' | node packages/mcp-server/dist/index.js
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ct_compress","arguments":{"text":"Hello world, this is a test","level":2}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"mem_remember","arguments":{"palace":"Test","wing":"Unit","room":"Testing","content":"This is a test memory"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"ct_token_stats","arguments":{}}}
EOF
```

Expected: 4 JSON-RPC responses with results.

## Claude Desktop Integration

### Step 1: Configure

Edit `~/.claude/claude_desktop_config.json`:

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

### Step 2: Start Claude Desktop

- Restart Claude Desktop application
- Open a new chat

### Step 3: Verify Tools Appear

Look for CompText tools in the tool selector:
- `ct_compress` ✅
- `mem_remember` ✅
- `ctx_index` ✅
- `research_run_experiments` ✅

### Step 4: Test Basic Compression

**Prompt:** "Compress the following text to save tokens: 'The implementation of the authentication mechanism requires proper configuration of the security parameters and validation of the credentials against the database to ensure that only authorized users can access the protected resources and functionality of the application system.'"

**Expected:** Compressed version with ~40-50% fewer tokens

### Step 5: Test Memory System

**Prompt:** "Remember for me: The database uses PostgreSQL 14 with replication enabled"

**Expected:** Tool called with palace/wing/room structure

### Step 6: Test Research Tools

**Prompt:** "What compression variants should we test for production?"

**Expected:** Suggestion to use `research_run_experiments` tool

## Performance Testing

### Throughput Test

```bash
time (for i in {1..1000}; do
  echo '{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"ct_compress","arguments":{"text":"Test text for compression","level":2}}}'
done | node packages/mcp-server/dist/index.js > /dev/null)
```

**Target:** Complete 1000 compressions in <50ms

### Memory Usage Test

```bash
# Monitor memory while indexing large documents
watch -n 0.1 'ps aux | grep comptext-mcp'
```

**Target:** <100MB memory for 10K indexed documents

## Integration Test Scenarios

### Scenario 1: Document Compression Pipeline

1. Index a large document: `ctx_index`
2. Search for sections: `ctx_search`
3. Compress results: `ct_compress`
4. Checkpoint: `ctx_checkpoint`

**Expected:** All tools work together seamlessly

### Scenario 2: Research-Driven Optimization

1. Run experiments: `research_run_experiments`
2. Analyze results: `research_analyze_results`
3. Compare metrics: `research_metrics_comparison`
4. Plan deployment: `research_deploy_variant`
5. Project savings: `research_cost_projection`

**Expected:** Full optimization workflow

### Scenario 3: Session Resumption

1. Create memories: `mem_remember` (multiple)
2. Create indexes: `ctx_index` (multiple)
3. Checkpoint: `ctx_checkpoint`
4. New session: Retrieve snapshot and resume

**Expected:** Can restore full session state

## Troubleshooting

### "Command not found: comptext-mcp"

```bash
npm install -g @comptext/mcp-server
# OR
npx @comptext/mcp-server  # Use npx instead
```

### MCP Server crashes

Check stderr output:
```bash
node packages/mcp-server/dist/index.js 2>&1
```

### Tools not appearing in Claude

1. Check claude_desktop_config.json syntax (JSON validation)
2. Restart Claude Desktop completely
3. Check MCP logs in Claude's settings

### Compression not working

Verify test:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ct_compress","arguments":{"text":"test text","level":2}}}' | node packages/mcp-server/dist/index.js
```

Should return valid JSON-RPC result.

## Deployment Checklist

- [ ] All tests pass locally
- [ ] MCP protocol tests successful
- [ ] Claude Desktop integration verified
- [ ] Performance targets met
- [ ] Documentation reviewed
- [ ] Error handling tested
- [ ] Memory limits verified
- [ ] Ready for production use

---

See README.md for tool documentation and usage examples.
