#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

const sessions: Map<string, any> = new Map()
const checkpoints: Map<string, any> = new Map()

program
  .name('comptext')
  .description('CompText Revolution — Universal Token Compression Platform')
  .version('0.2.0')

program
  .command('compress <input>')
  .description('Compress text or a file using CompText DSL (Levels 1-5)')
  .option('-l, --level <n>', 'Compression level 1-5 (default: 3)', '3')
  .option('-f, --format <fmt>', 'Output format: compact|structured|minimal', 'compact')
  .option('-v, --verbose', 'Show detailed metrics')
  .action(async (input, options) => {
    try {
      const { compile } = await import('@comptext/core')
      const fs = await import('fs')

      let text = input
      let source = 'stdin'

      if (fs.existsSync(input)) {
        text = fs.readFileSync(input, 'utf-8')
        source = `file:${input}`
      }

      const level = Math.min(5, Math.max(1, parseInt(options.level))) as 1 | 2 | 3 | 4 | 5
      const result = compile(text, { level, format: options.format })
      const savings = ((1 - (result.tokensCompressed / result.tokensOriginal)) * 100).toFixed(1)

      console.log(`\n✅ Compressed (${result.ratio.toFixed(2)}x) — ${savings}% savings`)
      console.log(`   Level: ${level}, Source: ${source}`)
      console.log(`   ${result.tokensOriginal} → ${result.tokensCompressed} tokens\n`)
      if (options.verbose) console.log(`   Format: ${options.format}`)
      console.log(`\n${result.document.compressed}\n`)
    } catch (error) {
      console.error(`❌ Compression failed:`, error)
      process.exit(1)
    }
  })

program
  .command('index <source>')
  .description('Index a file, URL, or raw text (BM25 search)')
  .option('-t, --tag <tag>', 'Tag for filtering')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .option('-n, --name <name>', 'Document name')
  .action(async (source, options) => {
    try {
      // @comptext/indexer not yet published — stub with Python backend
      console.log(`📥 Indexing: ${source}...`)
      const res = await fetch(`http://localhost:8000/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_uri: source, text: source, tags: options.tag || '' }),
      })
      const data = await res.json() as { chunk_id?: string }
      console.log(`✅ Indexed: ${data.chunk_id || 'ok'}\n`)
    } catch (error) {
      console.error(`❌ Index failed:`, error)
      process.exit(1)
    }
  })

program
  .command('search <query>')
  .description('Search indexed documents (BM25 ranking)')
  .option('-k, --top-k <n>', 'Results to return', '5')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .action(async (query, options) => {
    try {
      const res = await fetch(
        `http://localhost:8000/search?q=${encodeURIComponent(query)}&top_k=${options.topK}`
      )
      const data = await res.json() as { results: Array<{ id: string; snippet: string; score: number }> }

      console.log(`\n🔍 Results for "${query}":\n`)
      if (!data.results || data.results.length === 0) {
        console.log(`   (No matches)\n`)
        return
      }
      data.results.forEach((r: { id: string; snippet: string; score: number }, i: number) => {
        console.log(`${i + 1}. [${r.score.toFixed(3)}] ${r.id}`)
        console.log(`   ${r.snippet}\n`)
      })
    } catch (error) {
      console.error(`❌ Search failed:`, error)
      process.exit(1)
    }
  })

program
  .command('session list')
  .description('List active sessions')
  .action(() => {
    if (sessions.size === 0) {
      console.log(`\n   (No sessions)\n`)
      return
    }
    console.log(`\n📋 Sessions:\n`)
    sessions.forEach((s, id) => {
      console.log(`${id}: ${s.createdAt}, ${s.items?.length || 0} items`)
    })
    console.log()
  })

program
  .command('session checkpoint <id>')
  .description('Create checkpoint')
  .option('-l, --label <label>', 'Label')
  .action((id, opts) => {
    const s = sessions.get(id)
    if (!s) { console.error(`Session not found`); process.exit(1) }
    const cpId = `${id}-${Date.now()}`
    checkpoints.set(cpId, { id: cpId, sessionId: id, label: opts.label || 'CP', data: s })
    console.log(`✅ Checkpoint: ${cpId}\n`)
  })

program
  .command('session resume <cpId>')
  .description('Resume from checkpoint')
  .action((cpId) => {
    const cp = checkpoints.get(cpId)
    if (!cp) { console.error(`Checkpoint not found`); process.exit(1) }
    const newId = `resumed-${Date.now()}`
    sessions.set(newId, cp.data)
    console.log(`✅ Resumed: ${newId} from ${cp.label}\n`)
  })

program.parse()
