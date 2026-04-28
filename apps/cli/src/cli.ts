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

const program = new Command()

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
