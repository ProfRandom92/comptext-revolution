/**
 * MCP Tool definitions for CompText
 */

export const TOOLS = [
  {
    name: 'ctx_compress',
    description: 'Compress text using CompText DSL. Reduces token usage by 90-95%.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to compress' },
        level: { type: 'number', description: 'Compression level 1-5 (default: 3)', minimum: 1, maximum: 5 }
      },
      required: ['text']
    }
  },
  {
    name: 'ctx_index',
    description: 'Index a document, file, or URL into the local context store.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'File path or URL to index' },
        tag: { type: 'string', description: 'Optional tag for filtering' }
      },
      required: ['source']
    }
  },
  {
    name: 'ctx_search',
    description: 'Search the local context index using BM25 ranking.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        topK: { type: 'number', description: 'Number of results (default: 5)' },
        tag: { type: 'string', description: 'Filter by tag' }
      },
      required: ['query']
    }
  },
  {
    name: 'ctx_execute',
    description: 'Execute code in an isolated sandbox. Returns compressed output.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to execute' },
        language: { type: 'string', enum: ['javascript', 'typescript', 'python'] }
      },
      required: ['code', 'language']
    }
  },
  {
    name: 'ctx_save',
    description: 'Save a session checkpoint for later resumption.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        label: { type: 'string', description: 'Human-readable label for this checkpoint' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'ctx_resume',
    description: 'Resume a previous session from its latest checkpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'ctx_fetch_index',
    description: 'Fetch a URL, extract text content, and index it for retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch and index' },
        tag: { type: 'string' }
      },
      required: ['url']
    }
  }
] as const
