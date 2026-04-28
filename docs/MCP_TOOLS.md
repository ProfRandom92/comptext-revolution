# CompText MCP Tools Reference

All tools exposed by `@comptext/mcp-server`.

## ctx_compress
Compress text using CompText DSL.
- Input: `text` (string), `level` (1-5, optional)
- Output: compressed text + stats

## ctx_index
Index a document, file path, or URL.
- Input: `source` (string), `tag` (optional)
- Output: document ID + chunk count

## ctx_search
Search the local context index with BM25.
- Input: `query` (string), `topK` (optional), `tag` (optional)
- Output: ranked list of text snippets with scores

## ctx_execute
Execute code in an isolated sandbox.
- Input: `code` (string), `language` (js/ts/python)
- Output: stdout, stderr, exit code

## ctx_save
Save a session checkpoint.
- Input: `sessionId` (string), `label` (optional)
- Output: snapshot ID

## ctx_resume
Resume a session from its latest checkpoint.
- Input: `sessionId` (string)
- Output: restored session state

## ctx_fetch_index
Fetch a URL, extract text, and index it.
- Input: `url` (string), `tag` (optional)
- Output: document ID + indexed chunk count
