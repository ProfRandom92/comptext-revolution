#!/usr/bin/env node
import * as cryptoLib from 'crypto'
import * as readline from 'readline'

const memory: Record<string, any> = {}

function compressText(text: string, level = 2): { compressed: string; ratio: string } {
  let out = text
  if (level >= 1) out = out.replace(/\s+/g, ' ').trim()
  if (level >= 2) {
    const filler = /\b(basically|essentially|actually|very|just|simply|in order to|please|provide)\b/gi
    out = out.replace(filler, '')
    const abbrevs: Record<string, string> = {
      'function': 'fn', 'parameter': 'p', 'analyze': 'anlz', 'document': 'doc', 'database': 'db'
    }
    for (const [k, v] of Object.entries(abbrevs)) {
      out = out.replace(new RegExp(`\b${k}\b`, 'gi'), v)
    }
  }
  if (level >= 3) {
    out = out.replace(/\b(a|an|the)\b/gi, '')
  }
  const ratio = ((out.length / text.length).toFixed(2))
  return { compressed: out.replace(/\s+/g, ' ').trim(), ratio }
}

const tools = [
  { name: 'ct_compress' },
  { name: 'ct_compress_batch' },
  { name: 'mem_remember' },
  { name: 'mem_recall' },
  { name: 'mem_list' },
  { name: 'ctx_index' },
  { name: 'ctx_search' },
  { name: 'cas_store' },
  { name: 'cas_fetch' },
  { name: 'ctx_checkpoint' },
  { name: 'ct_parse' },
  { name: 'ct_encode' },
  { name: 'ct_compress_output' },
  { name: 'mem_delete' },
  { name: 'ct_token_stats' },
]

async function handleTool(name: string, params: any): Promise<any> {
  if (name === 'ct_compress') {
    return compressText(params.text, params.level || 2)
  }
  if (name === 'ct_compress_batch') {
    return (params.texts || []).map((t: string) => compressText(t, 2))
  }
  if (name === 'mem_remember') {
    const k = `${params.palace}:${params.wing}:${params.room}`
    memory[k] = params.content
    return { stored: k }
  }
  if (name === 'mem_recall') {
    const q = String(params.query).toLowerCase()
    return Object.entries(memory)
      .filter(([_, v]) => String(v).toLowerCase().includes(q))
      .slice(0, params.top_k || 5)
  }
  if (name === 'mem_list') {
    return { count: Object.keys(memory).length }
  }
  if (name === 'ctx_index') {
    memory[`idx:${params.source}`] = params.content
    return { indexed: true }
  }
  if (name === 'ctx_search') {
    const q = String(params.query).toLowerCase()
    return Object.entries(memory)
      .filter(([k, v]) => k.startsWith('idx:') && String(v).toLowerCase().includes(q))
      .slice(0, 5)
  }
  if (name === 'cas_store') {
    const h = cryptoLib.createHash('sha256').update(params.content).digest('hex')
    memory[`cas:${h}`] = params.content
    return { sha256: h }
  }
  if (name === 'cas_fetch') {
    const d = memory[`cas:${params.sha256}`]
    return d ? { content: d } : { error: 'not found' }
  }
  if (name === 'ctx_checkpoint') {
    return { snapshot_id: `${params.session_id}:${Date.now()}` }
  }
  if (name === 'ct_parse') {
    return { command: params.command, parsed: true }
  }
  if (name === 'ct_encode') {
    return compressText(params.text, 2)
  }
  if (name === 'ct_compress_output') {
    const r = compressText((params.output || '').slice(0, 2000), 3)
    return r.compressed.slice(0, params.max_tokens || 500)
  }
  if (name === 'mem_delete') {
    return { deleted: 0 }
  }
  if (name === 'ct_token_stats') {
    return { status: 'ready' }
  }
  return { error: `Unknown: ${name}` }
}

async function main() {
  process.stderr.write('[MCP] CompText Server (15 tools)\n')
  console.log(JSON.stringify({ jsonrpc: '2.0', id: 0, result: { tools } }))

  const rl = readline.createInterface({ input: process.stdin, terminal: false })

  rl.on('line', async (line: string) => {
    try {
      const req = JSON.parse(line)
      if (req.method === 'tools/list') {
        console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools } }))
      } else if (req.method === 'tools/call') {
        const result = await handleTool(req.params.name, req.params.arguments || {})
        console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }))
      }
    } catch (e) {
      console.log(JSON.stringify({ jsonrpc: '2.0', id: 0, error: { code: -32000, message: String(e) } }))
    }
  })
}

main()
