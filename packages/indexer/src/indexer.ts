import type { IndexedDocument, IndexerOptions, SearchResult } from './types'

/**
 * CompText Context Indexer
 * Stores documents in SQLite with FTS5 for fast BM25 retrieval
 */
export class Indexer {
  private dbPath: string
  private options: Required<IndexerOptions>

  constructor(dbPath = ':memory:', options: IndexerOptions = {}) {
    this.dbPath = dbPath
    this.options = {
      dbPath,
      chunkSize: options.chunkSize ?? 512,
      chunkOverlap: options.chunkOverlap ?? 64,
      topK: options.topK ?? 5
    }
    // TODO: initialize better-sqlite3 + FTS5 tables
  }

  /** Add a document from a file path */
  async addFile(filePath: string): Promise<IndexedDocument> {
    // TODO: read file, chunk, embed, store
    throw new Error('Not implemented yet')
  }

  /** Add raw text content */
  async addText(text: string, metadata: Record<string, unknown> = {}): Promise<IndexedDocument> {
    // TODO: chunk text, store in FTS5
    throw new Error('Not implemented yet')
  }

  /** Fetch and index a URL */
  async addUrl(url: string): Promise<IndexedDocument> {
    // TODO: fetch, extract text, chunk, store
    throw new Error('Not implemented yet')
  }

  /** Search using BM25 ranking */
  async search(query: string, topK?: number): Promise<SearchResult[]> {
    // TODO: FTS5 MATCH query with BM25 scoring
    throw new Error('Not implemented yet')
  }

  /** Remove a document by ID */
  async remove(documentId: string): Promise<void> {
    // TODO: delete from FTS5 + chunks table
    throw new Error('Not implemented yet')
  }

  /** Get index stats */
  async stats(): Promise<{ documents: number; chunks: number; dbSizeMb: number }> {
    throw new Error('Not implemented yet')
  }
}
