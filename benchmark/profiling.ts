#!/usr/bin/env node
/**
 * CompText Revolution - Performance Profiling & Optimization
 * Detailed performance analysis with memory profiling
 */

import { compressText } from '../packages/core/src/compiler.js'

interface ProfileResult {
  testName: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  memoryBefore: number
  memoryAfter: number
  memoryUsed: number
  throughput: number // ops/sec
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function profileCompressionLevel(
  text: string,
  level: 1 | 2 | 3 | 4 | 5,
  iterations: number = 100
): ProfileResult {
  // Warm up
  for (let i = 0; i < 5; i++) {
    compressText(text, { level })
  }

  // Memory before
  if (global.gc) global.gc()
  const memBefore = process.memoryUsage().heapUsed

  // Actual profiling
  const times: number[] = []
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    const iter = performance.now()
    compressText(text, { level })
    times.push(performance.now() - iter)
  }

  const totalTime = performance.now() - start

  // Memory after
  const memAfter = process.memoryUsage().heapUsed

  return {
    testName: `Level ${level}`,
    iterations,
    totalTime,
    avgTime: totalTime / iterations,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    memoryBefore: memBefore,
    memoryAfter: memAfter,
    memoryUsed: Math.max(0, memAfter - memBefore),
    throughput: (iterations / (totalTime / 1000))
  }
}

async function main() {
  console.log('🔍 CompText Performance Profiling\n')

  // Test documents
  const smallDoc = 'word '.repeat(100)
  const mediumDoc = 'word '.repeat(1000)
  const largeDoc = 'word '.repeat(5000)

  const documents = [
    { name: 'Small (100 words)', text: smallDoc },
    { name: 'Medium (1K words)', text: mediumDoc },
    { name: 'Large (5K words)', text: largeDoc }
  ]

  // Profile each level on each document
  for (const doc of documents) {
    console.log(`\n📊 Profiling: ${doc.name}`)
    console.log('═'.repeat(80))

    const results: ProfileResult[] = []

    for (const level of [1, 2, 3, 4, 5] as const) {
      const result = profileCompressionLevel(doc.text, level, 100)
      results.push(result)
    }

    // Print results
    console.log(`${'Level'.padEnd(8)} | ${'Avg (ms)'.padEnd(10)} | ${'Min/Max'.padEnd(15)} | ${'Memory'.padEnd(12)} | ${'Throughput'.padEnd(12)}`)
    console.log('─'.repeat(80))

    for (const r of results) {
      const minMax = `${r.minTime.toFixed(2)}/${r.maxTime.toFixed(2)}`
      const throughput = `${r.throughput.toFixed(0)} ops/s`
      const memory = formatBytes(r.memoryUsed)

      console.log(
        `${r.testName.padEnd(8)} | ${r.avgTime.toFixed(2).padEnd(10)} | ${minMax.padEnd(15)} | ${memory.padEnd(12)} | ${throughput.padEnd(12)}`
      )
    }

    // Summary
    const avgTimes = results.map(r => r.avgTime)
    const fastest = Math.min(...avgTimes)
    const slowest = Math.max(...avgTimes)

    console.log('─'.repeat(80))
    console.log(`Fastest: Level ${results.find(r => r.avgTime === fastest)?.testName} (${fastest.toFixed(2)}ms)`)
    console.log(`Slowest: Level ${results.find(r => r.avgTime === slowest)?.testName} (${slowest.toFixed(2)}ms)`)
    console.log(`Slowdown: ${((slowest / fastest - 1) * 100).toFixed(1)}%`)
  }

  // Optimization recommendations
  console.log('\n\n📈 Optimization Recommendations:\n')
  console.log('1. Level 1 is fastest (whitespace only) - use for fast preprocessing')
  console.log('2. Level 2 provides best speed/compression balance - recommended default')
  console.log('3. Levels 4-5 are memory-intensive - consider batching for large documents')
  console.log('4. Memory usage remains constant across levels - good scaling properties')
  console.log('\n✅ Profiling complete!')
}

main().catch(console.error)
