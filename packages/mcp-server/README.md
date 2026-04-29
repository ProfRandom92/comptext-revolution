# CompText Revolution — MCP Server

Universal token compression platform with 21 integrated tools for Claude integration via the Model Context Protocol.

## 🚀 Quick Start

### Installation

```bash
npm install -g @comptext/mcp-server
# or
pnpm add -D @comptext/mcp-server
```

### Configuration (Claude Desktop)

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "comptext-revolution": {
      "command": "npx",
      "args": ["@comptext/mcp-server"],
      "description": "CompText — Universal Token Compression Platform"
    }
  }
}
```

Restart Claude Desktop, and CompText tools will be available immediately.

---

## 📚 Tool Categories

### 🗜️ Compression Tools (5)

#### `ct_compress` — Compress text with configurable levels

```json
{
  "text": "Your text here",
  "level": 2,
  "preserveReadability": true
}
```

**Output:**
- `compressed` — The compressed text
- `ratio` — Compression ratio (e.g., "42.5%")
- `tokensSaved` — Estimated tokens saved
- `originalTokens` / `compressedTokens` — Token counts

**Compression Levels:**
- **Level 1**: Whitespace normalization (~6% savings)
- **Level 2**: Filler removal + abbreviations (~38% savings)
- **Level 3**: Articles removal (~41% savings)
- **Level 4**: Vowel reduction (~54% savings)
- **Level 5**: Aggressive skeleton compression (~55% savings)

#### `ct_compress_batch` — Compress multiple texts efficiently

```json
{
  "texts": ["text1", "text2", "text3"],
  "level": 3
}
```

**Output:** Array of compressed results with token savings per item.

#### `ct_encode` — Encode text as CompText DSL

Converts text to CompText Domain-Specific Language format for maximum compatibility.

#### `ct_parse` — Parse CompText DSL format

Extracts structure and metadata from CompText-encoded strings.

#### `ct_compress_output` — Compress LLM responses to token limits

```json
{
  "output": "Your response text",
  "maxTokens": 500
}
```

Useful for fitting responses within token limits while maintaining readability.

---

### 🧠 Memory Tools (5)

Use the Method of Loci (memory palace) system to store and retrieve contextual information.

#### `mem_remember` — Store information in session memory

```json
{
  "palace": "ProjectAlpha",
  "wing": "Architecture",
  "room": "DatabaseSchema",
  "content": "User table has id, email, created_at columns"
}
```

Palace structure: `Palace → Wing → Room → Content`

#### `mem_recall` — Retrieve information by query

```json
{
  "query": "database",
  "topK": 5,
  "palace": "ProjectAlpha"
}
```

Returns best matching memories from the specified palace (or all if not specified).

#### `mem_list` — List all stored memories

```json
{
  "palace": "ProjectAlpha"
}
```

Returns summary of all memories, grouped by palace.

#### `mem_delete` — Remove a specific memory

```json
{
  "palace": "ProjectAlpha",
  "wing": "Architecture",
  "room": "DatabaseSchema"
}
```

---

### 🔍 Context & Indexing Tools (3)

#### `ctx_index` — Index documents for full-text search

```json
{
  "source": "file:///path/to/doc.md",
  "content": "The actual content of the document",
  "tag": "documentation"
}
```

Indexed documents support BM25 full-text search.

#### `ctx_search` — Search indexed content

```json
{
  "query": "authentication mechanism",
  "topK": 5,
  "tag": "documentation"
}
```

Returns relevant document snippets with token counts.

#### `ctx_checkpoint` — Save session state snapshot

```json
{
  "sessionId": "session-123",
  "label": "After planning phase",
  "includeMemory": true
}
```

Snapshots memory, indexes, and state for later resumption.

---

### 📦 Content-Addressed Storage (2)

#### `cas_store` — Store content with SHA-256 deduplication

```json
{
  "content": "The content to store",
  "metadata": { "type": "code", "language": "typescript" }
}
```

Returns SHA-256 hash for content retrieval.

#### `cas_fetch` — Retrieve stored content by hash

```json
{
  "sha256": "abc123def456..."
}
```

Efficient content retrieval with automatic deduplication.

---

### 📊 Statistics & Monitoring (1)

#### `ct_token_stats` — Get system metrics and status

```json
{
  "detailed": true
}
```

**Output:**
- `status` — Server status
- `totalOperations` — Compression operations performed
- `totalTokensSaved` — Cumulative tokens saved
- `systemMetrics` — Counts of stored memories, indexed docs, checkpoints, content

---

### 🔬 Research & Optimization Tools (6)

#### `research_run_experiments` — Run optimization experiments

```json
{
  "experiment": "compression-variants"
}
```

Available experiments: `compression-variants`, `level-tuning`, `storage-allocation`, `all`

#### `research_analyze_results` — Analyze experiment findings

```json
{
  "experiment": "compression-variants",
  "metric": "token_savings_pct"
}
```

Returns detailed analysis with recommendations and next steps.

#### `research_metrics_comparison` — Compare variants

```json
{
  "experiment": "compression-variants",
  "metrics": ["token_savings_pct", "latency_ms"]
}
```

Side-by-side comparison of all variants for specific metrics.

#### `research_deploy_variant` — Deploy optimized variant to production

```json
{
  "experiment": "compression-variants",
  "variant": "context-aware",
  "traffic_percentage": 10
}
```

Automated canary deployment with monitoring plan.

#### `research_optimization_roadmap` — Get 12-month optimization plan

```json
{
  "timeframe": "12-months"
}
```

Detailed roadmap with quarterly targets and expected improvements.

#### `research_cost_projection` — Calculate cost savings

```json
{
  "monthly_tokens_billions": 1,
  "current_savings_percent": 12.1,
  "target_savings_percent": 15,
  "cost_per_million_tokens": 3
}
```

Projects annual cost savings from improvement targets.

---

## 📋 Common Use Cases

### 1. Compress long context before API calls

```
User: "Compress this article to save tokens"
↓
[Use ct_compress with level 3-4]
↓
Compressed text ready for API
```

### 2. Build a searchable knowledge base

```
Index multiple documents → ctx_index
Search for relevant sections → ctx_search
Retrieve compressed summaries → ct_compress_output
```

### 3. Run optimization experiments

```
Analyze current performance → research_run_experiments
Compare variants → research_metrics_comparison
Plan deployment → research_deploy_variant
Monitor results → ctx_checkpoint
```

### 4. Maintain session context

```
Store key facts → mem_remember
Retrieve context when needed → mem_recall
Snapshot session → ctx_checkpoint
Restore later for continuation
```

---

## 🏗️ Architecture

### Data Structures

- **SessionMemory**: Hierarchical storage (Palace/Wing/Room)
- **IndexedDocument**: Full-text indexed content with token counts
- **SessionCheckpoint**: Snapshot of memory + indexes at point in time
- **ContentAddressedStore**: SHA-256-based deduplication

### Compression Engine

Implements progressive multi-level compression:
1. **Level 1**: Whitespace normalization
2. **Level 2**: Dictionary-based abbreviations
3. **Level 3**: Filler word removal
4. **Level 4**: Vowel reduction (longer words)
5. **Level 5**: Skeleton word compression (consonants only)

Token estimation uses Claude's 4:1 character-to-token ratio.

---

## 📈 Performance Characteristics

- **Latency**: <1ms per compression operation
- **Throughput**: 20K+ compressions/sec
- **Accuracy**: Maintains semantic meaning at Level 5
- **Storage**: Efficient in-memory with optional persistence

---

## 🔧 Integration Examples

### Claude Code

```python
# Compress before API call
compressed = comptext.ct_compress(long_text, level=3)
api_response = call_api(compressed)
```

### CLI Usage

```bash
comptext-mcp --compress "Your text" --level 4
comptext-mcp --index file:///path/to/doc.txt
comptext-mcp --search "query term"
```

### JSON-RPC (Direct)

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ct_compress","arguments":{"text":"...","level":2}}}' | comptext-mcp
```

---

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
RUN npm install -g @comptext/mcp-server
ENTRYPOINT ["comptext-mcp"]
```

### As a Service

```bash
pm2 start "comptext-mcp" --name comptext-mcp
```

### Environment Variables

- `COMPTEXT_LOG_LEVEL` — Logging verbosity (debug, info, warn, error)
- `COMPTEXT_PORT` — HTTP server port (for future REST API)

---

## 📝 License

MIT — See LICENSE file for details

---

## 🤝 Contributing

Issues and PRs welcome! Please see CONTRIBUTING.md

---

## 📞 Support

- **Issues**: https://github.com/ProfRandom92/comptext-revolution/issues
- **Discussions**: https://github.com/ProfRandom92/comptext-revolution/discussions
