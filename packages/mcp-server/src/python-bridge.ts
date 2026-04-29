/**
 * Python Bridge — TypeScript ↔ CT-Vault Python Backend
 * Calls Python backend via subprocess or HTTP
 */

import { spawn, type ChildProcess } from 'child_process'
import fetch from 'node-fetch'

const PYTHON_REST_URL = process.env.CT_VAULT_API || 'http://localhost:8000'
const PYTHON_PORT = parseInt(process.env.CT_VAULT_PORT || '8000')

interface CompressResult {
  compressed: string
  tokens_in: number
  tokens_out: number
  ratio: number
  savings_pct: number
}

interface IndexResult {
  indexed: string
  source: string
}

interface SearchResult {
  id: string
  source: string
  text: string
  snippet: string
  score: number
}

interface MemoryResult {
  palace: string
  wing: string
  room: string
  drawer: string
  snippet: string
  score: number
}

export class PythonBridge {
  private serverUrl: string
  private serverProcess: ChildProcess | null = null

  constructor(port: number = PYTHON_PORT) {
    this.serverUrl = `http://localhost:${port}`
  }

  async startServer(pythonScriptPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.serverProcess = spawn('python3', [
          '-m', 'uvicorn',
          'ct_vault_core.rest_api:app',
          `--port=${PYTHON_PORT}`,
          '--host=localhost'
        ])

        this.serverProcess.on('error', reject)
        this.serverProcess.on('exit', () => {
          this.serverProcess = null
        })

        // Wait for server to be ready
        setTimeout(() => resolve(), 2000)
      } catch (err) {
        reject(err)
      }
    })
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill()
      await new Promise(r => setTimeout(r, 500))
    }
  }

  async compress(text: string, level: number = 2): Promise<CompressResult> {
    const res = await fetch(`${this.serverUrl}/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, level })
    })
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    return (await res.json()) as CompressResult
  }

  async index(source: string, content: string, tags: string = ''): Promise<IndexResult> {
    const res = await fetch(`${this.serverUrl}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, content, tags })
    })
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    return (await res.json()) as IndexResult
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const res = await fetch(`${this.serverUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK })
    })
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    const data = (await res.json()) as { results: SearchResult[] }
    return data.results
  }

  async remember(
    palace: string,
    wing: string,
    room: string,
    content: string,
    drawer?: string,
    tags: string = ''
  ): Promise<{ stored: string }> {
    const res = await fetch(`${this.serverUrl}/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ palace, wing, room, content, drawer, tags })
    })
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    return (await res.json()) as { stored: string }
  }

  async recall(query: string, topK: number = 5): Promise<MemoryResult[]> {
    const res = await fetch(`${this.serverUrl}/recall?query=${encodeURIComponent(query)}&top_k=${topK}`)
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    const data = (await res.json()) as { results: MemoryResult[] }
    return data.results
  }

  async casStore(content: string): Promise<{ sha256: string }> {
    const res = await fetch(`${this.serverUrl}/cas/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    return (await res.json()) as { sha256: string }
  }

  async casFetch(sha256: string): Promise<string> {
    const res = await fetch(`${this.serverUrl}/cas/fetch/${sha256}`)
    if (!res.ok) throw new Error(`Python: ${res.statusText}`)
    const data = (await res.json()) as { content: string }
    return data.content
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/health`)
      return res.ok
    } catch {
      return false
    }
  }
}

export const pythonBridge = new PythonBridge()
