import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'

export function getDbPath(): string {
  // Support separate storage device via environment variable
  if (process.env.COMPTEXT_DB_PATH) {
    return process.env.COMPTEXT_DB_PATH
  }
  // Fallback to secondary device if specified
  if (process.env.COMPTEXT_STORAGE_DEVICE === 'secondary') {
    return '/data/sessions/comptext.db'
  }
  // Default to home directory
  const homeDir = homedir()
  return join(homeDir, '.comptext', 'sessions.db')
}

export function initializeDatabase(db: any): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      metadata TEXT
    )
  `)

  // Create session events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
      INDEX idx_session_timestamp (sessionId, timestamp)
    )
  `)

  // Create snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      state TEXT NOT NULL,
      label TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
      INDEX idx_session_created (sessionId, createdAt)
    )
  `)

  // Create full-text search table for session content
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS session_fts USING fts5(
      sessionId,
      content,
      timestamp
    )
  `)
}
