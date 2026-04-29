#!/usr/bin/env node
/**
 * CompText Revolution CLI
 *
 * Commands:
 *   compress <text|file>  — Compress text using CompText DSL
 *   index <path|url>      — Index a document or URL
 *   search <query>        — Search the context index
 *   session list          — List all sessions
 *   session resume <id>   — Resume a session
 */

import { Command } from 'commander'

const const program = new Command()

// Global session storage
const sessions: Map<string, any> = new Map()
const checkpoints: Map<string, any> = new Map()

program
  .name('comptext')
  .description('CompText Revolution — Universal Token Compression Platform')
  .version('0.2.0')

// COMPRESS: Enhanced with file detection
program
  .command('compress <input>')
  .description('Compress text or a file using CompText DSL (Levels 1-5)')
  .option('-l, --level <n>', 'Compression level 1-5 (default: 3)', '3')
  .option('-f, --format <fmt>', 'Output format: compact|structured|minimal', 'compact')
  .option('-v, --verbose', 'Show detailed metrics')
  .action(async (input, options) => {
    try {
      const { compressText } = await import('@comptext/core')
      const fs = await import('fs')
      
      let text = input
      let source = 'stdin'
      
      if (fs.existsSync(input)) {
        text = fs.readFileSync(input, 'utf-8')
        source = `file:${input}`
      }

      const level = Math.min(5, Math.max(1, parseInt(options.level)))
      const result = compressText(text, { level, format: options.format })
      const savings = ((1 - (result.tokensCompressed / result.tokensOriginal)) * 100).toFixed(1)
      
      console.log(`\n✅ Compressed (${result.ratio}) — ${savings}% savings`)
      console.log(`   Level: ${level}, Source: ${source}`)
      console.log(`   ${result.tokensOriginal} → ${result.tokensCompressed} tokens\n`)
      if (options.verbose) console.log(`   Format: ${options.format}`)
      console.log(`\n${result.compressed}\n`)
    } catch (error) {
      console.error(`❌ Compression failed:`, error)
      process.exit(1)
    }
  })

// INDEX: Document indexing with BM25
program
  .command('index <source>')
  .description('Index a file, URL, or raw text (BM25 search)')
  .option('-t, --tag <tag>', 'Tag for filtering')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .option('-n, --name <name>', 'Document name')
  .action(async (source, options) => {
    try {
      const { Indexer } = await import('@comptext/indexer')
      const indexer = new Indexer(options.db, { chunkSize: 512, chunkOverlap: 64 })

      let content: string
      let docType = 'unknown'

      if (source.startsWith('http')) {
        console.log(`🌐 Fetching: ${source}`)
        const res = await fetch(source)
        content = await res.text()
        docType = 'web'
      } else {
        const fs = await import('fs')
        if (fs.existsSync(source)) {
          content = fs.readFileSync(source, 'utf-8')
          docType = 'file'
        } else {
          content = source
          docType = 'text'
        }
      }

      const doc = await indexer.addText(content, { type: docType, tag: options.tag })
      console.log(`✅ Indexed: ${doc.id} (${doc.chunks.length} chunks, ${options.db})\n`)
    } catch (error) {
      console.error(`❌ Index failed:`, error)
      process.exit(1)
    }
  })

// SEARCH: BM25 full-text search
program
  .command('search <query>')
  .description('Search indexed documents (BM25 ranking)')
  .option('-k, --top-k <n>', 'Results to return', '5')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .action(async (query, options) => {
    try {
      const { Indexer } = await import('@comptext/indexer')
      const indexer = new Indexer(options.db)
      const results = await indexer.search(query, parseInt(options.topK))

      console.log(`\n🔍 Results for "${query}":\n`)
      if (results.length === 0) {
        console.log(`   (No matches)\n`)
        return
      }

      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.documentPath}`)
        console.log(`   Snippet: ${r.snippet}\n`)
      })
    } catch (error) {
      console.error(`❌ Search failed:`, error)
      process.exit(1)
    }
  })

// SESSION: Checkpoint & Resume
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

program
  .name('comptext')
  .description('CompText Revolution — Universal Token Compression Platform')
  .version('0.1.0')

program
  .command('compress <input>')
  .description('Compress text or a file using CompText DSL')
  .option('-l, --level <n>', 'Compression level 1-5', '3')
  .option('-f, --format <fmt>', 'Output format: compact|structured|minimal', 'compact')
  .action(async (input, options) => {
    const { compile } = await import('@comptext/core')
    const text = input // TODO: detect file path and read
    const result = compile(text, { level: parseInt(options.level), format: options.format })
    console.log(`\n✅ Compressed (${result.ratio.toFixed(1)}x)`)
    console.log(`   Original:   ${result.tokensOriginal} tokens`)
    console.log(`   Compressed: ${result.tokensCompressed} tokens`)
    console.log(`\n${result.document.compressed}\n`)
  })

program
  .command('index <source>')
  .description('Index a file or URL into the context store')
  .option('-t, --tag <tag>', 'Tag for filtering')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .action(async (source, options) => {
    console.log(`📥 Indexing: ${source}...`)
    // TODO: wire up @comptext/indexer
    console.log('⚠️  Indexer not yet implemented in v0.1')
  })

program
  .command('search <query>')
  .description('Search the context index')
  .option('-k, --top-k <n>', 'Number of results', '5')
  .option('-d, --db <path>', 'Database path', './comptext.db')
  .action(async (query, options) => {
    console.log(`🔍 Searching: "${query}"...`)
    // TODO: wire up @comptext/indexer
    console.log('⚠️  Indexer not yet implemented in v0.1')
  })

program.parse()
