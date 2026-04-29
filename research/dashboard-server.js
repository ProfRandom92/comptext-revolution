#!/usr/bin/env node

/**
 * CompText Dashboard Server
 * Serves the dashboard and provides WebSocket real-time updates
 */

import http from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import ExperimentManager from './experiment-manager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.DASHBOARD_PORT || 3333

// Create experiment manager
const manager = new ExperimentManager()

// Register default experiments
manager.registerExperiment('compression', {
  name: 'Compression Variants',
  variants: ['level1', 'level2', 'level3', 'level4', 'level5'],
  duration: 300000,
  target: 55
})

manager.registerExperiment('dsl', {
  name: 'DSL Integration',
  variants: ['dsl-baseline', 'dsl-db', 'dsl-context'],
  duration: 180000,
  target: 85
})

manager.registerExperiment('hybrid', {
  name: 'Hybrid (DSL + Levels)',
  variants: ['hybrid', 'hybrid-optimized'],
  duration: 600000,
  target: 70
})

manager.registerExperiment('dictionary', {
  name: 'Dictionary Expansion',
  variants: ['dict-50', 'dict-100', 'dict-150'],
  duration: 240000,
  target: 57
})

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // API Routes
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(manager.getStatus()))
    return
  }

  if (req.url === '/api/start' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { experimentId } = JSON.parse(body)
        manager.startExperiment(experimentId).catch(e => {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, message: `Started ${experimentId}` }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.url === '/api/pause' && req.method === 'POST') {
    manager.pauseExperiment()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (req.url === '/api/stop' && req.method === 'POST') {
    manager.stopExperiment()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (req.url === '/api/config' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const config = JSON.parse(body)
        manager.updateConfig(config)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, config: manager.config }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.url === '/api/queue' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { experimentId } = JSON.parse(body)
        manager.queueExperiment(experimentId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, queue: manager.queue }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  // Serve dashboard HTML
  if (req.url === '/' || req.url === '/dashboard') {
    try {
      const dashboardPath = join(__dirname, 'dashboard.html')
      const content = readFileSync(dashboardPath, 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(content)
      return
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Dashboard not found')
      return
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

// WebSocket support (simple implementation)
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    // Simple WebSocket implementation
    console.log('WebSocket client connected')

    socket.write('HTTP/1.1 101 Switching Protocols\r\n')
    socket.write('Upgrade: websocket\r\n')
    socket.write('Connection: Upgrade\r\n')
    socket.write('Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n')
    socket.write('\r\n')

    // Listen to manager events
    const onProgress = exp => {
      const msg = JSON.stringify({ type: 'progress', data: exp })
      sendWebSocketFrame(socket, msg)
    }

    const onLog = log => {
      const msg = JSON.stringify({ type: 'log', data: log })
      sendWebSocketFrame(socket, msg)
    }

    const onCompleted = exp => {
      const msg = JSON.stringify({ type: 'completed', data: exp })
      sendWebSocketFrame(socket, msg)
    }

    manager.on('experiment:progress', onProgress)
    manager.on('log', onLog)
    manager.on('experiment:completed', onCompleted)

    socket.on('close', () => {
      manager.removeListener('experiment:progress', onProgress)
      manager.removeListener('log', onLog)
      manager.removeListener('experiment:completed', onCompleted)
      console.log('WebSocket client disconnected')
    })
  }
})

// Simple WebSocket frame encoder
function sendWebSocketFrame(socket, data) {
  const buf = Buffer.from(data)
  const frame = Buffer.alloc(2 + buf.length)

  frame[0] = 0x81 // FIN + TEXT opcode
  frame[1] = buf.length

  buf.copy(frame, 2)
  socket.write(frame)
}

// Start server
server.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗')
  console.log('║  CompText AutoResearch Dashboard                      ║')
  console.log('╚═══════════════════════════════════════════════════════╝\n')

  console.log(`📊 Dashboard: http://localhost:${PORT}`)
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`)
  console.log(`🔌 API Base: http://localhost:${PORT}/api\n`)

  console.log('Available Experiments:')
  for (const [id, exp] of manager.experiments) {
    console.log(`  • ${id}: ${exp.name}`)
  }

  console.log('\n✓ Server running. Open http://localhost:' + PORT + ' in your browser\n')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...')
  if (manager.running) {
    manager.stopExperiment()
  }
  server.close()
  process.exit(0)
})

export { manager, server }
