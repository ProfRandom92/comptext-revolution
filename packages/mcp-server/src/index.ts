#!/usr/bin/env node
import * as cryptoLib from 'crypto'
import * as readline from 'readline'
import type { ToolName } from './tools.js'
import { pythonBridge } from './python-bridge.js'

// CT-Vault Python backend integration (Phase 2)
let usePython = process.env.USE_PYTHON !== 'false'

// === DATA STRUCTURES ===
interface SessionMemory {
  palace: string
  wing: string
  room: string
  content: string
  timestamp: number
}

interface IndexedDocument {
  source: string
  content: string
  tag?: string
  tokens: number
}

interface SessionCheckpoint {
  sessionId: string
  timestamp: number
  label?: string
  memory: SessionMemory[]
  indexes: IndexedDocument[]
}

// === GLOBAL STATE ===
const sessionMemory: SessionMemory[] = []
const indexedDocuments: IndexedDocument[] = []
const contentAddressedStore: Record<string, any> = {}
const checkpoints: SessionCheckpoint[] = []
let totalTokensSaved = 0
let totalOperations = 0

// === COMPRESSION ENGINE ===
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Claude's 4:1 ratio
}

function compressText(text: string, level: 1 | 2 | 3 | 4 | 5 = 2): { compressed: string; ratio: string; tokensSaved: number } {
  const originalTokens = estimateTokens(text)
  let out = text

  // Level 1: Whitespace normalization
  if (level >= 1) {
    out = out.replace(/\s+/g, ' ').trim()
  }

  // Level 2: Filler words + abbreviations
  if (level >= 2) {
    const filler = /\b(basically|essentially|actually|very|just|simply|in order to|please|provide|important to note)\b/gi
    out = out.replace(filler, '')
    const abbrevs: Record<string, string> = {
      'function': 'fn',
      'parameter': 'p',
      'analyze': 'anlz',
      'document': 'doc',
      'database': 'db',
      'application': 'app',
      'implementation': 'impl',
      'configuration': 'cfg',
      'response': 'resp',
      'request': 'req'
    }
    for (const [k, v] of Object.entries(abbrevs)) {
      out = out.replace(new RegExp(`\b${k}\b`, 'gi'), v)
    }
  }

  // Level 3: Articles removal
  if (level >= 3) {
    out = out.replace(/\b(a|an|the)\b/gi, '')
  }

  // Level 4: Vowel reduction in long words
  if (level >= 4) {
    out = out.replace(/(\w{4,})/g, (word) => {
      if (word.length > 6) {
        return word[0] + word.slice(1, -1).replace(/[aeiou]/gi, '') + word[word.length - 1]
      }
      return word
    })
  }

  // Level 5: Aggressive skeleton words
  if (level >= 5) {
    out = out.replace(/(\w{4,})/g, (word) => {
      const consonants = word.replace(/[aeiou]/gi, '')
      return word[0] + consonants.slice(1, -1) + word[word.length - 1]
    })
  }

  out = out.replace(/\s+/g, ' ').trim()
  const compressedTokens = estimateTokens(out)
  const tokensSaved = originalTokens - compressedTokens

  totalTokensSaved += tokensSaved
  totalOperations++

  return {
    compressed: out,
    ratio: (compressedTokens / originalTokens * 100).toFixed(1),
    tokensSaved
  }
}

// === TOOL HANDLERS ===
async function handleTool(name: ToolName, params: any): Promise<any> {
  // Compression tools
  if (name === 'ct_compress') {
    const result = compressText(params.text, params.level || 2)
    return {
      compressed: result.compressed,
      ratio: result.ratio,
      tokensSaved: result.tokensSaved,
      originalTokens: estimateTokens(params.text),
      compressedTokens: estimateTokens(result.compressed)
    }
  }

  if (name === 'ct_compress_batch') {
    const results = (params.texts || []).map((text: string) => {
      const result = compressText(text, params.level || 2)
      return {
        compressed: result.compressed,
        tokensSaved: result.tokensSaved
      }
    })
    return {
      count: results.length,
      results,
      totalTokensSaved: results.reduce((sum: number, r: any) => sum + r.tokensSaved, 0)
    }
  }

  if (name === 'ct_encode') {
    const result = compressText(params.text, 2)
    return {
      encoded: result.compressed,
      format: 'comptext-dsl',
      metadata: {
        originalLength: params.text.length,
        compressedLength: result.compressed.length,
        compressionRatio: result.ratio
      }
    }
  }

  if (name === 'ct_parse') {
    return {
      command: params.compressed,
      parsed: true,
      type: 'dsl',
      structure: 'parsed'
    }
  }

  if (name === 'ct_compress_output') {
    const compressed = compressText(params.output?.slice(0, 5000) || '', 3)
    const maxTokens = params.maxTokens || 500
    const compressedTokens = estimateTokens(compressed.compressed)

    return {
      compressed: compressed.compressed.slice(0, maxTokens * 4),
      tokensSaved: compressed.tokensSaved,
      withinLimit: compressedTokens <= maxTokens
    }
  }

  // Memory tools
  if (name === 'mem_remember') {
    const memory: SessionMemory = {
      palace: params.palace,
      wing: params.wing,
      room: params.room,
      content: params.content,
      timestamp: Date.now()
    }
    sessionMemory.push(memory)
    return {
      stored: `${params.palace}:${params.wing}:${params.room}`,
      timestamp: memory.timestamp,
      totalMemories: sessionMemory.length
    }
  }

  if (name === 'mem_recall') {
    const query = String(params.query).toLowerCase()
    const results = sessionMemory
      .filter(m => {
        const matches = String(m.content).toLowerCase().includes(query)
        const palaceMatch = !params.palace || m.palace === params.palace
        return matches && palaceMatch
      })
      .slice(0, params.topK || 5)
      .map(m => ({
        palace: m.palace,
        wing: m.wing,
        room: m.room,
        content: m.content,
        timestamp: m.timestamp
      }))

    return { results, count: results.length }
  }

  if (name === 'mem_list') {
    const filtered = params.palace
      ? sessionMemory.filter(m => m.palace === params.palace)
      : sessionMemory

    return {
      count: filtered.length,
      memories: filtered.map(m => ({
        location: `${m.palace}:${m.wing}:${m.room}`,
        contentLength: m.content.length,
        timestamp: m.timestamp
      }))
    }
  }

  if (name === 'mem_delete') {
    const beforeCount = sessionMemory.length
    const filtered = sessionMemory.filter(m =>
      !(m.palace === params.palace && m.wing === params.wing && m.room === params.room)
    )
    sessionMemory.length = 0
    sessionMemory.push(...filtered)

    return {
      deleted: beforeCount - sessionMemory.length,
      remaining: sessionMemory.length
    }
  }

  // Context & indexing tools
  if (name === 'ctx_index') {
    const tokens = estimateTokens(params.content)
    const doc: IndexedDocument = {
      source: params.source,
      content: params.content,
      tag: params.tag,
      tokens
    }
    indexedDocuments.push(doc)

    return {
      indexed: true,
      source: params.source,
      tokens,
      documentCount: indexedDocuments.length
    }
  }

  if (name === 'ctx_search') {
    const query = String(params.query).toLowerCase()
    const results = indexedDocuments
      .filter(doc => {
        const contentMatch = String(doc.content).toLowerCase().includes(query)
        const tagMatch = !params.tag || doc.tag === params.tag
        return contentMatch && tagMatch
      })
      .slice(0, params.topK || 5)
      .map(doc => ({
        source: doc.source,
        snippet: doc.content.slice(0, 200),
        tag: doc.tag,
        tokens: doc.tokens
      }))

    return {
      query: params.query,
      results,
      count: results.length
    }
  }

  if (name === 'ctx_checkpoint') {
    const checkpoint: SessionCheckpoint = {
      sessionId: params.sessionId,
      timestamp: Date.now(),
      label: params.label,
      memory: [...sessionMemory],
      indexes: [...indexedDocuments]
    }
    checkpoints.push(checkpoint)

    return {
      snapshotId: `${params.sessionId}:${checkpoint.timestamp}`,
      timestamp: checkpoint.timestamp,
      memorySize: sessionMemory.length,
      indexSize: indexedDocuments.length
    }
  }

  // Content-addressed storage
  if (name === 'cas_store') {
    const hash = cryptoLib.createHash('sha256').update(params.content).digest('hex')
    contentAddressedStore[hash] = {
      content: params.content,
      metadata: params.metadata,
      timestamp: Date.now(),
      size: params.content.length
    }

    return {
      sha256: hash,
      size: params.content.length,
      stored: true
    }
  }

  if (name === 'cas_fetch') {
    const data = contentAddressedStore[params.sha256]

    return data
      ? {
          content: data.content,
          metadata: data.metadata,
          timestamp: data.timestamp,
          found: true
        }
      : { found: false, error: 'not found' }
  }

  // Statistics
  if (name === 'ct_token_stats') {
    return {
      status: 'ready',
      totalOperations,
      totalTokensSaved,
      averageSavingsPerOp: totalOperations > 0 ? (totalTokensSaved / totalOperations).toFixed(2) : 0,
      systemMetrics: {
        memoriesStored: sessionMemory.length,
        documentsIndexed: indexedDocuments.length,
        checkpointsSaved: checkpoints.length,
        contentStored: Object.keys(contentAddressedStore).length
      },
      uptime: new Date().toISOString()
    }
  }

  return { error: `Unknown tool: ${name}` }
}

// === MCP SERVER ===
const tools = [
  { name: 'ct_compress' },
  { name: 'ct_compress_batch' },
  { name: 'ct_encode' },
  { name: 'ct_parse' },
  { name: 'ct_compress_output' },
  { name: 'mem_remember' },
  { name: 'mem_recall' },
  { name: 'mem_list' },
  { name: 'mem_delete' },
  { name: 'ctx_index' },
  { name: 'ctx_search' },
  { name: 'ctx_checkpoint' },
  { name: 'cas_store' },
  { name: 'cas_fetch' },
  { name: 'ct_token_stats' }
]

async function main() {
  process.stderr.write('[MCP] CompText Revolution Server (15 tools)\n')
  console.log(JSON.stringify({ jsonrpc: '2.0', id: 0, result: { tools } }))

  const rl = readline.createInterface({ input: process.stdin, terminal: false })

  rl.on('line', async (line: string) => {
    try {
      const req = JSON.parse(line)

      if (req.method === 'tools/list') {
        console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools } }))
      } else if (req.method === 'tools/call') {
        const result = await handleTool(req.params.name as ToolName, req.params.arguments || {})
        console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }))
      }
    } catch (e) {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32000, message: String(e) }
      }))
    }
  })
}

main()
