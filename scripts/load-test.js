#!/usr/bin/env node
/**
 * CompText Revolution - Load Testing Script
 * Validates performance under production load
 * Phase: Production Readiness
 */

const http = require('http')
const { performance } = require('perf_hooks')

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000'
const CONCURRENT_REQUESTS = process.env.CONCURRENT || 50
const TOTAL_REQUESTS = process.env.TOTAL || 1000
const DURATION_SECONDS = process.env.DURATION || 60

// Test metrics
const metrics = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  totalLatency: 0,
  minLatency: Infinity,
  maxLatency: 0,
  startTime: 0,
  endTime: 0,
  throughput: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  latencies: []
}

async function makeRequest(payload) {
  return new Promise((resolve) => {
    const startTime = performance.now()

    const options = {
      hostname: new URL(TARGET_URL).hostname,
      port: new URL(TARGET_URL).port || 80,
      path: '/compress',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        const latency = performance.now() - startTime
        metrics.latencies.push(latency)
        metrics.totalLatency += latency
        metrics.minLatency = Math.min(metrics.minLatency, latency)
        metrics.maxLatency = Math.max(metrics.maxLatency, latency)

        if (res.statusCode === 200) {
          metrics.successCount++
        } else {
          metrics.errorCount++
        }
        resolve({ success: res.statusCode === 200, latency })
      })
    })

    req.on('error', () => {
      metrics.errorCount++
      resolve({ success: false, latency: performance.now() - startTime })
    })

    req.write(payload)
    req.end()
  })
}

async function runLoadTest() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   CompText Revolution - Load Testing                       ║
║   Target: ${TARGET_URL}
║   Concurrent: ${CONCURRENT_REQUESTS} | Total: ${TOTAL_REQUESTS}
╚════════════════════════════════════════════════════════════╝
  `)

  metrics.startTime = performance.now()

  const testPayload = JSON.stringify({
    text: 'CompText Revolution: Universal Token Compression Platform\n'.repeat(100),
    level: 3
  })

  let activeRequests = 0
  let requestsSent = 0

  return new Promise((resolve) => {
    const intervalId = setInterval(async () => {
      // Send requests up to concurrent limit
      while (activeRequests < CONCURRENT_REQUESTS && requestsSent < TOTAL_REQUESTS) {
        activeRequests++
        requestsSent++
        metrics.totalRequests++

        makeRequest(testPayload).then(() => {
          activeRequests--
        })

        // Log progress every 100 requests
        if (requestsSent % 100 === 0) {
          const elapsed = (performance.now() - metrics.startTime) / 1000
          const rps = (requestsSent / elapsed).toFixed(1)
          console.log(`  📊 ${requestsSent}/${TOTAL_REQUESTS} sent | ${rps} req/s`)
        }
      }

      // All requests sent and completed
      if (requestsSent >= TOTAL_REQUESTS && activeRequests === 0) {
        clearInterval(intervalId)
        metrics.endTime = performance.now()
        reportResults()
        resolve()
      }
    }, 10)
  })
}

function reportResults() {
  const duration = (metrics.endTime - metrics.startTime) / 1000
  metrics.throughput = metrics.totalRequests / duration

  // Calculate percentiles
  const sorted = metrics.latencies.sort((a, b) => a - b)
  metrics.p50 = sorted[Math.floor(sorted.length * 0.50)]
  metrics.p95 = sorted[Math.floor(sorted.length * 0.95)]
  metrics.p99 = sorted[Math.floor(sorted.length * 0.99)]

  const avgLatency = metrics.totalLatency / metrics.totalRequests

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    LOAD TEST RESULTS                       ║
╚════════════════════════════════════════════════════════════╝

📊 THROUGHPUT:
   Total Requests:    ${metrics.totalRequests}
   Duration:          ${duration.toFixed(2)}s
   Requests/Second:   ${metrics.throughput.toFixed(1)} req/s
   Target:            1000+ req/s

⏱️  LATENCY (ms):
   Min:               ${metrics.minLatency.toFixed(2)}
   Avg:               ${avgLatency.toFixed(2)}
   P50:               ${metrics.p50.toFixed(2)}
   P95:               ${metrics.p95.toFixed(2)}
   P99:               ${metrics.p99.toFixed(2)}
   Max:               ${metrics.maxLatency.toFixed(2)}
   Target P99:        <5ms

✅ SUCCESS RATE:
   Success:           ${metrics.successCount}
   Errors:            ${metrics.errorCount}
   Success Rate:      ${((metrics.successCount / metrics.totalRequests) * 100).toFixed(1)}%
   Target:            >95%

${validateResults()}
  `)
}

function validateResults() {
  const duration = (metrics.endTime - metrics.startTime) / 1000
  let status = '✅ PRODUCTION READY'
  let issues = []

  // Check throughput
  if (metrics.throughput < 1000) {
    issues.push(`⚠️  Throughput ${metrics.throughput.toFixed(1)} req/s < target 1000 req/s`)
  }

  // Check latency p99
  if (metrics.p99 > 5) {
    issues.push(`⚠️  P99 Latency ${metrics.p99.toFixed(2)}ms > target 5ms`)
  }

  // Check success rate
  const successRate = (metrics.successCount / metrics.totalRequests) * 100
  if (successRate < 95) {
    issues.push(`⚠️  Success rate ${successRate.toFixed(1)}% < target 95%`)
  }

  if (issues.length > 0) {
    status = '⚠️  NEEDS OPTIMIZATION'
    issues.forEach(issue => console.log(issue))
  }

  return status
}

// Run the test
runLoadTest().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Load test failed:', err)
  process.exit(1)
})
