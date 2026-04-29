import type { IndexedDocument, IndexerOptions, SearchResult } from './types'

/**
 * CompText Context Indexer
 * Stores documents in SQLite with FTS5 for fast BM25 retrieval
 */
/**
 * CompText Context Indexer
 * Stores documents in SQLite with FTS5 for fast BM25 retrieval
 * Phase 4 Implementation: Full BM25 + Chunking
 */

import type { IndexedDocument, IndexerOptions, SearchResult, Chunk } from './types'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export class Indexer {
  private db: Database.Database | null = null
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
    this.initializeDatabase()
  }

  /** Initialize SQLite database with FTS5 tables */
  private initializeDatabase() {
    try {
      this.db = new Database(this.dbPath)
      
      // Create documents table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          path TEXT NOT NULL,
          title TEXT,
          content TEXT,
          indexed_at TEXT,
          metadata TEXT
        )
      `)

      // Create chunks table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          text TEXT,
          position INTEGER,
          tokens INTEGER,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )
      `)

      // Create FTS5 virtual table for full-text search
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
          text,
          document_id UNINDEXED,
          content = chunks,
          content_rowid = rowid
        )
      `)

      // Create trigger for FTS5 sync (on INSERT)
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS chunks_insert AFTER INSERT ON chunks BEGIN
          INSERT INTO chunks_fts (rowid, text, document_id)
          VALUES (new.rowid, new.text, new.document_id);
        END
      `)
    } catch (err) {
      console.error('Database initialization failed:', err)
      throw err
    }
  }

  /** Estimate token count (simple heuristic: ~4 chars per token) */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /** Split text into overlapping chunks */
  private chunkText(text: string): string[] {
    const words = text.split(/\s+/)
    const chunks: string[] = []
    let currentChunk: string[] = []
    let currentSize = 0

    for (const word of words) {
      currentChunk.push(word)
      currentSize += word.length + 1

      if (currentSize >= this.options.chunkSize) {
        chunks.push(currentChunk.join(' '))
        // Overlap: keep last N words for next chunk
        const overlapWords = Math.ceil(
          (this.options.chunkOverlap / this.options.chunkSize) * currentChunk.length
        )
        currentChunk = currentChunk.slice(-overlapWords)
        currentSize = currentChunk.join(' ').length
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
    }

    return chunks
  }

  /** Add raw text content */
  async addText(text: string, metadata: Record<string, unknown> = {}): Promise<IndexedDocument> {
    if (!this.db) throw new Error('Database not initialized')

    const docId = randomUUID()
    const chunks = this.chunkText(text)

    // Create document record
    const doc: IndexedDocument = {
      id: docId,
      path: metadata.name as string || `doc-${docId.slice(0, 8)}`,
      title: metadata.name as string || '',
      content: text,
      chunks: [],
      indexedAt: new Date(),
      metadata
    }

    // Insert document
    const insertDoc = this.db.prepare(`
      INSERT INTO documents (id, path, title, content, indexed_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertDoc.run(docId, doc.path, doc.title, text.slice(0, 1000), new Date().toISOString(), JSON.stringify(metadata))

    // Insert chunks and index in FTS5
    const insertChunk = this.db.prepare(`
      INSERT INTO chunks (id, document_id, text, position, tokens)
      VALUES (?, ?, ?, ?, ?)
    `)

    chunks.forEach((chunkText, position) => {
      const chunkId = randomUUID()
      const tokens = this.estimateTokens(chunkText)
      insertChunk.run(chunkId, docId, chunkText, position, tokens)
      
      doc.chunks.push({
        id: chunkId,
        documentId: docId,
        text: chunkText,
        position,
        tokens
      })
    })

    return doc
  }

  /** Add a document from a file path */
  async addFile(filePath: string): Promise<IndexedDocument> {
    const fs = await import('fs/promises')
    const content = await fs.readFile(filePath, 'utf-8')
    return this.addText(content, { name: filePath, type: 'file' })
  }

  /** Fetch and index a URL */
  async addUrl(url: string): Promise<IndexedDocument> {
    const response = await fetch(url)
    const content = await response.text()
    return this.addText(content, { name: url, type: 'web' })
  }

  /** Search using BM25 ranking (via FTS5) */
  async search(query: string, topK?: number): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized')

    const limit = topK || this.options.topK
    const searchQuery = this.db.prepare(`
      SELECT 
        chunks.id,
        chunks.document_id,
        chunks.text,
        chunks.position,
        chunks.tokens,
        documents.path,
        rank as score
      FROM chunks_fts
      JOIN chunks ON chunks.rowid = chunks_fts.rowid
      JOIN documents ON chunks.document_id = documents.id
      WHERE chunks_fts MATCH ?
      ORDER BY rank DESC
      LIMIT ?
    `)

    const rows = searchQuery.all(query, limit) as any[]
    
    return rows.map(row => ({
      chunk: {
        id: row.id,
        documentId: row.document_id,
        text: row.text,
        position: row.position,
        tokens: row.tokens
      },
      score: Math.abs(row.score), // FTS5 returns negative scores
      documentPath: row.path,
      snippet: row.text.slice(0, 150) + (row.text.length > 150 ? '...' : '')
    }))
  }

  /** Remove a document by ID */
  async remove(documentId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const deleteChunks = this.db.prepare('DELETE FROM chunks WHERE document_id = ?')
    const deleteDoc = this.db.prepare('DELETE FROM documents WHERE id = ?')

    deleteChunks.run(documentId)
    deleteDoc.run(documentId)
  }

  /** Get index stats */
  async stats(): Promise<{ documents: number; chunks: number; dbSizeMb: number }> {
    if (!this.db) throw new Error('Database not initialized')

    const docCount = (this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count
    const chunkCount = (this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as any).count

    const fs = await import('fs/promises')
    let dbSizeMb = 0
    try {
      const stat = await fs.stat(this.dbPath)
      dbSizeMb = stat.size / 1024 / 1024
    } catch {
      dbSizeMb = 0
    }

    return { documents: docCount, chunks: chunkCount, dbSizeMb }
  }

  /** Close database connection */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
