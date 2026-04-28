export interface Session {
  id: string
  createdAt: Date
  updatedAt: Date
  events: SessionEvent[]
  snapshots: Snapshot[]
  metadata: Record<string, unknown>
}

export interface SessionEvent {
  id: string
  sessionId: string
  type: string
  payload: unknown
  timestamp: Date
}

export interface Snapshot {
  id: string
  sessionId: string
  state: unknown
  createdAt: Date
  label?: string
}
