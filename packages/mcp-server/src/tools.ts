/**
 * MCP Tool Definitions for CompText Revolution
 * Complete schema definitions for all 15 tools
 */

export const TOOLS = [
  // === COMPRESSION TOOLS (5) ===
  {
    name: 'ct_compress',
    description: 'Compress text using CompText DSL. Achieves 80-95% token reduction.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to compress' },
        level: { type: 'number', description: 'Compression level 1-5 (default: 2)', minimum: 1, maximum: 5 },
        preserveReadability: { type: 'boolean', description: 'Keep text human-readable (default: true)' }
      },
      required: ['text']
    }
  },
  {
    name: 'ct_compress_batch',
    description: 'Compress multiple texts in a single batch operation.',
    inputSchema: {
      type: 'object',
      properties: {
        texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts to compress' },
        level: { type: 'number', description: 'Compression level for all texts', minimum: 1, maximum: 5 }
      },
      required: ['texts']
    }
  },
  {
    name: 'ct_encode',
    description: 'Encode text into CompText DSL format.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to encode' },
        includeMetadata: { type: 'boolean', description: 'Include compression metadata' }
      },
      required: ['text']
    }
  },
  {
    name: 'ct_parse',
    description: 'Parse CompText DSL syntax and return structured representation.',
    inputSchema: {
      type: 'object',
      properties: {
        compressed: { type: 'string', description: 'CompText DSL formatted string' }
      },
      required: ['compressed']
    }
  },
  {
    name: 'ct_compress_output',
    description: 'Compress LLM output/response text to fit token limits.',
    inputSchema: {
      type: 'object',
      properties: {
        output: { type: 'string', description: 'Output text to compress' },
        maxTokens: { type: 'number', description: 'Maximum tokens allowed (default: 500)' }
      },
      required: ['output']
    }
  },

  // === MEMORY TOOLS (5) ===
  {
    name: 'mem_remember',
    description: 'Store information in session memory using Method of Loci (palace/wing/room).',
    inputSchema: {
      type: 'object',
      properties: {
        palace: { type: 'string', description: 'Memory palace name' },
        wing: { type: 'string', description: 'Wing/section in the palace' },
        room: { type: 'string', description: 'Specific room/location' },
        content: { type: 'string', description: 'Content to remember' }
      },
      required: ['palace', 'wing', 'room', 'content']
    }
  },
  {
    name: 'mem_recall',
    description: 'Retrieve information from session memory by query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        topK: { type: 'number', description: 'Number of results (default: 5)' },
        palace: { type: 'string', description: 'Optional filter by palace' }
      },
      required: ['query']
    }
  },
  {
    name: 'mem_list',
    description: 'List all stored memories with metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        palace: { type: 'string', description: 'Optional filter by palace' }
      }
    }
  },
  {
    name: 'mem_delete',
    description: 'Delete a memory from the session.',
    inputSchema: {
      type: 'object',
      properties: {
        palace: { type: 'string', description: 'Palace name' },
        wing: { type: 'string', description: 'Wing name' },
        room: { type: 'string', description: 'Room name' }
      },
      required: ['palace', 'wing', 'room']
    }
  },

  // === CONTEXT & INDEXING TOOLS (3) ===
  {
    name: 'ctx_index',
    description: 'Index a document, file, or text content for retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'File path, URL, or identifier' },
        content: { type: 'string', description: 'Text content to index' },
        tag: { type: 'string', description: 'Optional tag for categorization' }
      },
      required: ['source', 'content']
    }
  },
  {
    name: 'ctx_search',
    description: 'Search indexed content using BM25 full-text search.',
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
    name: 'ctx_checkpoint',
    description: 'Save a session checkpoint/snapshot for resumption.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session identifier' },
        label: { type: 'string', description: 'Human-readable checkpoint label' },
        includeMemory: { type: 'boolean', description: 'Include session memory (default: true)' }
      },
      required: ['sessionId']
    }
  },

  // === CONTENT-ADDRESSED STORAGE (2) ===
  {
    name: 'cas_store',
    description: 'Store content in content-addressed store (SHA-256 dedup).',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to store' },
        metadata: { type: 'object', description: 'Optional metadata' }
      },
      required: ['content']
    }
  },
  {
    name: 'cas_fetch',
    description: 'Fetch content from CAS by SHA-256 hash.',
    inputSchema: {
      type: 'object',
      properties: {
        sha256: { type: 'string', description: 'SHA-256 hash of content' }
      },
      required: ['sha256']
    }
  },

  // === TOKEN STATS & UTILITY (1) ===
  {
    name: 'ct_token_stats',
    description: 'Get token compression statistics and system status.',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: { type: 'boolean', description: 'Include detailed metrics' }
      }
    }
  }
] as const

export type ToolName = typeof TOOLS[number]['name']
