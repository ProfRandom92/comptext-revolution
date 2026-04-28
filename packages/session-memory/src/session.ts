import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { Session, SessionEvent, Snapshot } from './types'
import { getDbPath, initializeDatabase } from './database'

/**
 * CompText Session Memory with SQLite persistence
 * Enables long agent workflows to survive across restarts with full state recovery
 */
export class SessionMemory {
  readonly sessionId: string
  private db: any

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? randomUUID()
    this.db = new Database(getDbPath())
    initializeDatabase(this.db)
  }

  /** Log an event to the session */
  async log(type: string, payload: unknown): Promise<SessionEvent> {
    const eventId = randomUUID()
    const timestamp = new Date()

    const stmt = this.db.prepare(`
      INSERT INTO session_events (id, sessionId, type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      eventId,
      this.sessionId,
      type,
      JSON.stringify(payload),
      timestamp.toISOString()
    )

    return {
      id: eventId,
      sessionId: this.sessionId,
      type,
      payload,
      timestamp
    }
  }

  /** Take a state snapshot (checkpoint) */
  async checkpoint(state: unknown, label?: string): Promise<Snapshot> {
    const snapshotId = randomUUID()
    const createdAt = new Date()

    const stmt = this.db.prepare(`
      INSERT INTO snapshots (id, sessionId, state, label, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      snapshotId,
      this.sessionId,
      JSON.stringify(state),
      label || null,
      createdAt.toISOString()
    )

    return {
      id: snapshotId,
      sessionId: this.sessionId,
      state,
      createdAt,
      label
    }
  }

  /** Get the latest snapshot */
  async latest(): Promise<Snapshot | null> {
    const stmt = this.db.prepare(`
      SELECT id, sessionId, state, label, createdAt
      FROM snapshots
      WHERE sessionId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `)

    const row = stmt.get(this.sessionId) as any

    if (!row) return null

    return {
      id: row.id,
      sessionId: row.sessionId,
      state: JSON.parse(row.state),
      label: row.label,
      createdAt: new Date(row.createdAt)
    }
  }

  /** Get all snapshots for this session */
  async snapshots(): Promise<Snapshot[]> {
    const stmt = this.db.prepare(`
      SELECT id, sessionId, state, label, createdAt
      FROM snapshots
      WHERE sessionId = ?
      ORDER BY createdAt DESC
    `)

    const rows = stmt.all(this.sessionId) as any[]

    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      state: JSON.parse(row.state),
      label: row.label,
      createdAt: new Date(row.createdAt)
    }))
  }

  /** Get all events for this session */
  async events(): Promise<SessionEvent[]> {
    const stmt = this.db.prepare(`
      SELECT id, sessionId, type, payload, timestamp
      FROM session_events
      WHERE sessionId = ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(this.sessionId) as any[]

    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      type: row.type,
      payload: JSON.parse(row.payload),
      timestamp: new Date(row.timestamp)
    }))
  }

  /** Get full session metadata */
  async metadata(): Promise<Session> {
    const createdAtStmt = this.db.prepare(
      'SELECT MIN(timestamp) as earliest FROM session_events WHERE sessionId = ?'
    )
    const updatedAtStmt = this.db.prepare(
      'SELECT MAX(timestamp) as latest FROM session_events WHERE sessionId = ?'
    )

    const created = (createdAtStmt.get(this.sessionId) as any)?.earliest
    const updated = (updatedAtStmt.get(this.sessionId) as any)?.latest

    const events = await this.events()
    const snapshots = await this.snapshots()

    return {
      id: this.sessionId,
      createdAt: new Date(created || new Date()),
      updatedAt: new Date(updated || new Date()),
      events,
      snapshots,
      metadata: {
        eventCount: events.length,
        snapshotCount: snapshots.length
      }
    }
  }

  /** Resume a session by ID — restores latest snapshot and provides context */
  static async resume(sessionId: string): Promise<SessionMemory> {
    const session = new SessionMemory(sessionId)
    const latest = await session.latest()

    if (!latest) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    return session
  }

  /** Export full session as JSON */
  async export(): Promise<string> {
    const meta = await this.metadata()
    return JSON.stringify(meta, null, 2)
  }

  /** Delete this session and all its data */
  async delete(): Promise<boolean> {
    const deleteEvents = this.db.prepare('DELETE FROM session_events WHERE sessionId = ?')
    const deleteSnapshots = this.db.prepare('DELETE FROM snapshots WHERE sessionId = ?')

    deleteEvents.run(this.sessionId)
    deleteSnapshots.run(this.sessionId)

    return true
  }

  /** Clear old snapshots, keep only N most recent */
  async pruneSnapshots(keep: number = 10): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM snapshots
      WHERE sessionId = ? AND id NOT IN (
        SELECT id FROM snapshots
        WHERE sessionId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      )
    `)

    const result = stmt.run(this.sessionId, this.sessionId, keep)
    return result.changes
  }

  /** List all sessions */
  static listSessions(): string[] {
    const db: any = new Database(getDbPath())
    const stmt = db.prepare(`
      SELECT DISTINCT sessionId FROM session_events
      UNION
      SELECT DISTINCT sessionId FROM snapshots
      ORDER BY sessionId
    `)

    const rows = stmt.all() as any[]
    db.close()

    return rows.map(row => row.sessionId)
  }
}
