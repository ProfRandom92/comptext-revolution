import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync, statSync } from 'fs'
import { execSync } from 'child_process'

interface StorageTest {
  name: string
  path: string
  passed: boolean
  message: string
  metrics?: {
    writeTime?: number
    readTime?: number
    dataSize?: number
    diskUsage?: string
  }
}

async function testSecondaryStorage(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  CompText Revolution - Secondary Storage Test                ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  const results: StorageTest[] = []

  // Test 1: Directory Structure
  console.log('Test 1: Verifying directory structure...')
  const paths = {
    sessions: process.env.COMPTEXT_SESSIONS_MOUNT || '/data/sessions',
    index: process.env.COMPTEXT_INDEX_MOUNT || '/data/index',
    cache: process.env.COMPTEXT_CACHE_MOUNT || '/data/cache',
    logs: process.env.COMPTEXT_LOGS_MOUNT || '/data/logs',
  }

  for (const [name, path] of Object.entries(paths)) {
    try {
      mkdirSync(path, { recursive: true })
      const stat = statSync(path)
      results.push({
        name: `Directory: ${name}`,
        path,
        passed: stat.isDirectory(),
        message: `✓ Directory accessible at ${path}`,
        metrics: {
          dataSize: stat.size,
        },
      })
    } catch (e: any) {
      results.push({
        name: `Directory: ${name}`,
        path,
        passed: false,
        message: `✗ Failed: ${e.message}`,
      })
    }
  }

  // Test 2: Database Write Performance
  console.log('Test 2: Database write performance...')
  try {
    const dbPath = join(paths.sessions, 'test-comptext.db')
    const db = new Database(dbPath)

    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `)

    // Write test data
    const startWrite = Date.now()
    const insertStmt = db.prepare('INSERT INTO test_sessions VALUES (?, ?, ?)')
    const transaction = db.transaction((entries: Array<[string, string, string]>) => {
      entries.forEach((entry) => insertStmt.run(...entry))
    })

    const testEntries = Array.from({ length: 1000 }, (_, i) => [
      `session-${i}`,
      JSON.stringify({
        events: Array(10).fill({ type: 'compress', payload: { text: 'x'.repeat(100) } }),
      }),
      new Date().toISOString(),
    ])

    transaction(testEntries as Array<[string, string, string]>)
    const writeTime = Date.now() - startWrite

    // Read test
    const startRead = Date.now()
    const rows = db.prepare('SELECT COUNT(*) as count FROM test_sessions').all()
    const readTime = Date.now() - startRead

    db.close()

    results.push({
      name: 'Database Operations',
      path: dbPath,
      passed: true,
      message: `✓ Inserted 1000 records successfully`,
      metrics: {
        writeTime,
        readTime,
        dataSize: statSync(dbPath).size,
      },
    })
  } catch (e: any) {
    results.push({
      name: 'Database Operations',
      path: join(paths.sessions, 'test-comptext.db'),
      passed: false,
      message: `✗ Failed: ${e.message}`,
    })
  }

  // Test 3: Disk Space Check
  console.log('Test 3: Checking disk space...')
  try {
    const result = execSync(`df -k "${paths.sessions}"`, { encoding: 'utf8' })
    const lines = result.trim().split('\n')
    const stats = lines[1].split(/\s+/)
    const available = (parseInt(stats[3]) * 1024) / (1024 * 1024 * 1024) // Convert to GB

    results.push({
      name: 'Disk Space',
      path: paths.sessions,
      passed: available > 1,
      message: `✓ ${available.toFixed(2)} GB available`,
      metrics: {
        dataSize: available,
      },
    })
  } catch (e: any) {
    results.push({
      name: 'Disk Space',
      path: paths.sessions,
      passed: false,
      message: `✗ Failed: ${e.message}`,
    })
  }

  // Test 4: Multi-device Path Resolution
  console.log('Test 4: Testing path resolution...')
  const envVars = {
    COMPTEXT_DB_PATH: process.env.COMPTEXT_DB_PATH || 'not set',
    COMPTEXT_STORAGE_DEVICE: process.env.COMPTEXT_STORAGE_DEVICE || 'not set',
    COMPTEXT_INDEX_PATH: process.env.COMPTEXT_INDEX_PATH || 'not set',
    COMPTEXT_CACHE_PATH: process.env.COMPTEXT_CACHE_PATH || 'not set',
  }

  results.push({
    name: 'Environment Variables',
    path: 'env',
    passed: Object.values(envVars).every((v) => v !== 'not set'),
    message: `✓ All storage paths configured`,
  })

  // Print results
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  Test Results                                                 ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  let passed = 0
  let failed = 0

  results.forEach((test) => {
    const status = test.passed ? '✓ PASS' : '✗ FAIL'
    const color = test.passed ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'

    console.log(`${color}${status}${reset} ${test.name}`)
    console.log(`  Path: ${test.path}`)
    console.log(`  Message: ${test.message}`)

    if (test.metrics) {
      if (test.metrics.writeTime) {
        console.log(`  Write Time: ${test.metrics.writeTime}ms`)
      }
      if (test.metrics.readTime) {
        console.log(`  Read Time: ${test.metrics.readTime}ms`)
      }
      if (test.metrics.dataSize) {
        const size = typeof test.metrics.dataSize === 'number'
          ? test.metrics.dataSize > 1024 * 1024
            ? `${(test.metrics.dataSize / (1024 * 1024)).toFixed(2)} MB`
            : `${(test.metrics.dataSize / 1024).toFixed(2)} KB`
          : `${test.metrics.dataSize.toFixed(2)} GB`
        console.log(`  Data Size: ${size}`)
      }
    }
    console.log()

    if (test.passed) {
      passed++
    } else {
      failed++
    }
  })

  // Summary
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`\nSummary: ${passed}/${results.length} tests passed`)

  if (failed === 0) {
    console.log('\n✓ All secondary storage tests passed!')
    console.log('\nEnvironment Configuration:')
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
  } else {
    console.log(`\n✗ ${failed} test(s) failed - check configuration`)
    process.exit(1)
  }
}

testSecondaryStorage().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
