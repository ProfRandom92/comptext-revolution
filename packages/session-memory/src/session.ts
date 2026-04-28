import type { Session, SessionEvent, Snapshot } from './types'

/**
 * CompText Session Memory
 * Enables long agent workflows to survive across restarts
 */
export class SessionMemory {
  readonly sessionId: string

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? crypto.randomUUID()
  }

  /** Log an event to the session */
  async log(type: string, payload: unknown): Promise<SessionEvent> {
    // TODO: persist to SQLite
    throw new Error('Not implemented yet')
  }

  /** Take a state snapshot (checkpoint) */
  async checkpoint(state: unknown, label?: string): Promise<Snapshot> {
    // TODO: save snapshot to SQLite
    throw new Error('Not implemented yet')
  }

  /** Get the latest snapshot */
  async latest(): Promise<Snapshot | null> {
    throw new Error('Not implemented yet')
  }

  /** Resume a session by ID — restores latest snapshot */
  static async resume(sessionId: string): Promise<SessionMemory> {
    const session = new SessionMemory(sessionId)
    // TODO: load from SQLite, restore state
    return session
  }

  /** Export full session as CompText-compressed JSON */
  async export(): Promise<string> {
    throw new Error('Not implemented yet')
  }
}
