#!/usr/bin/env node

/**
 * CompText AutoResearch Launcher
 * Starts the 5-hour autonomous session and serves live monitoring
 */

import { spawn } from 'child_process'
import http from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 4444

console.log('\n╔════════════════════════════════════════════════════════════════╗')
console.log('║  CompText AutoResearch - 5-Hour Autonomous Session Launcher  ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// Start AutoResearch process
console.log('🚀 Starting AutoResearch process...\n')

const autoresearchProcess = spawn('node', ['autoresearch-runner.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
})

// Capture output
let autoresearchOutput = []
autoresearchProcess.stdout.on('data', data => {
  const text = data.toString()
  console.log(text)
  autoresearchOutput.push(text)
  if (autoresearchOutput.length > 1000) {
    autoresearchOutput = autoresearchOutput.slice(-500)
  }
})

autoresearchProcess.stderr.on('data', data => {
  console.error(data.toString())
})

// HTTP Server for live monitoring
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.url === '/') {
    try {
      const monitorPath = join(__dirname, 'live-monitor.html')
      const content = readFileSync(monitorPath, 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(content)
    } catch (e) {
      res.writeHead(404)
      res.end('Monitor not found')
    }
    return
  }

  if (req.url === '/api/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ logs: autoresearchOutput }))
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║                   🎯 READY TO MONITOR                         ║')
  console.log('║                                                                ║')
  console.log(`║  📊 Open in Browser:  http://localhost:${PORT}`)
  console.log('║                                                                ║')
  console.log('║  Running:                                                      ║')
  console.log('║  ✓ AutoResearch process (5 hours, fully autonomous)           ║')
  console.log('║  ✓ Live monitoring dashboard                                  ║')
  console.log('║  ✓ Real-time metrics and discoveries                          ║')
  console.log('║                                                                ║')
  console.log('║  Phases:                                                       ║')
  console.log('║  1️⃣  Hybrid Compression Variants (1h)                         ║')
  console.log('║  2️⃣  Dictionary Expansion (1h)                                ║')
  console.log('║  3️⃣  Document-Type Optimization (1h)                          ║')
  console.log('║  4️⃣  Advanced Levels 6-9 (1h)                                 ║')
  console.log('║  5️⃣  Integration & Validation (1h)                            ║')
  console.log('║                                                                ║')
  console.log('║  Sessions can watch live progress and discoveries!             ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹  Shutting down...')
  autoresearchProcess.kill()
  server.close()
  process.exit(0)
})

// Handle process exit
autoresearchProcess.on('exit', code => {
  console.log(`\n✅ AutoResearch session completed (exit code: ${code})`)
  console.log('📊 Monitoring dashboard still available at http://localhost:' + PORT)
  console.log('📁 Results saved to: research/autoresearch-logs/\n')
})

export { server, autoresearchProcess }
