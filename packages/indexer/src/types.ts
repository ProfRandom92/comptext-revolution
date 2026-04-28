export interface IndexedDocument {
  id: string
  path: string
  title: string
  content: string
  chunks: Chunk[]
  indexedAt: Date
  metadata: Record<string, unknown>
}

export interface Chunk {
  id: string
  documentId: string
  text: string
  position: number
  tokens: number
}

export interface SearchResult {
  chunk: Chunk
  score: number
  documentPath: string
  snippet: string
}

export interface IndexerOptions {
  dbPath?: string
  chunkSize?: number     // tokens per chunk, default 512
  chunkOverlap?: number  // overlap between chunks, default 64
  topK?: number          // default search results, default 5
}
