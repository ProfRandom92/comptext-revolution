#!/usr/bin/env node
import { compressText } from '@comptext/core'
import * as crypto from 'crypto'

const memory: Record<string, unknown> = {}
const cas: Record<string, string> = {}

const tools = [
  { name: 'ct_compress', description: 'Compress text (levels 1-5)' },
  { name: 'mem_remember', description: 'Store in MemPalace' },
  { name: 'mem_recall', description: 'Recall from MemPalace' },
  { name: 'ctx_index', description: 'Index content' },
  { name: 'ctx_search', description: 'Search' },
  { name: 'cas_store', description: 'Store (SHA-256)' },
  { name: 'cas_fetch', description: 'Fetch' },
]

async function handleTool(name: string, params: any): Promise<any> {
  if (name === 'ct_compress') {
    const result = compressText(params.text, { level: params.level || 2 })
    return { compressed: result.compressed, ratio: result.ratio }
  }
  if (name === 'mem_remember') {
    const k = `${params.palace}:${params.wing}:${params.room}`
    memory[k] = params.content
    return { stored: k }
  }
  if (name === 'mem_recall') {
    return Object.keys(memory).filter(k => k.includes(params.query))
  }
  if (name === 'ctx_index') {
    memory[`idx:${params.source}`] = params.content
    return { indexed: true }
  }
  if (name === 'ctx_search') {
    return Object.keys(memory).filter(k => String(memory[k]).includes(params.query))
  }
  if (name === 'cas_store') {
    const h = crypto.createHash('sha256').update(params.content).digest('hex')
    cas[h] = params.content
    return { sha256: h }
  }
  if (name === 'cas_fetch') {
    return { content: cas[params.sha256] || null }
  }
  return { error: 'unknown' }
}

async function main() {
  process.stderr.write('[MCP] Ready\n')
  console.log(JSON.stringify({ result: { tools } }))

  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, terminal: false })
  
  rl.on('line', async (line: string) => {
    try {
      const req = JSON.parse(line)
      if (req.method === 'tools/list') {
        console.log(JSON.stringify({ result: { tools } }))
      } else if (req.method === 'tools/call') {
        const res = await handleTool(req.params.name, req.params.arguments)
        console.log(JSON.stringify({ result: res }))
      }
    } catch (e) {
      console.log(JSON.stringify({ error: String(e) }))
    }
  })
}

main()
