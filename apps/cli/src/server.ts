/**REST API Server für CompText — optional */
import { compressText } from '@comptext/core'

// Quick HTTP server (no external deps)
const http = require('http')

const server = http.createServer(async (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === '/compress' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk: string) => (body += chunk))
    req.on('end', () => {
      try {
        const { text, level } = JSON.parse(body)
        const result = compressText(text, { level: level || 2 })
        res.writeHead(200)
        res.end(
          JSON.stringify({
            success: true,
            compressed: result.compressed,
            ratio: result.ratio,
            savings_pct: Math.round((1 - parseFloat(result.ratio)) * 100),
          })
        )
      } catch (e) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: String(e) }))
      }
    })
    return
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', tools: 15, mcp: 'ready' }))
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 CompText REST API running on http://localhost:${PORT}`)
  console.log(`POST /compress — Compress text`)
  console.log(`GET /health — Check status`)
})
