import { describe, it, expect } from 'vitest'
import { detectInputType, applyDSL, compressHybrid, decompressDSL } from '../hybrid.js'
import { decompress, decompressLevel } from '../decompressor.js'

describe('detectInputType', () => {
  it('detects DSL namespace queries', () => {
    const result = detectInputType('@db.query(status=active)')
    expect(result.type).toBe('query')
    expect(result.confidence).toBeGreaterThan(50)
  })

  it('detects SQL queries as structured (query or config)', () => {
    const result = detectInputType('SELECT * FROM users WHERE id = 1')
    expect(['query', 'config']).toContain(result.type)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('detects natural language prose', () => {
    const result = detectInputType(
      'This is a natural language sentence with the words and a lot of prose.'
    )
    expect(result.type).toBe('text')
  })

  it('detects JSON objects', () => {
    const result = detectInputType('{"key": "value", "count": 42}')
    expect(['query', 'config']).toContain(result.type)
  })
})

describe('applyDSL', () => {
  it('shortens @namespace.operation', () => {
    const input = '@db.query(status=active,limit=10)'
    const result = applyDSL(input)
    expect(result.length).toBeLessThan(input.length)
  })

  it('replaces true/false/null', () => {
    const result = applyDSL('active=true,deleted=false,value=null')
    expect(result).toContain('1')
    expect(result).toContain('0')
    expect(result).toContain('∅')
  })
})

describe('compressHybrid', () => {
  it('compresses DSL queries via DSL method', async () => {
    const result = await compressHybrid('@db.query(status=active,limit=100)')
    expect(result.compressed.length).toBeGreaterThan(0)
    expect(result.method).toBe('dsl')
    expect(result.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('compresses natural language via level5', async () => {
    const result = await compressHybrid(
      'Please provide comprehensive documentation for all function parameters and implementations'
    )
    expect(result.method).toBe('level5')
    expect(result.type).toBe('text')
  })

  it('returns token counts', async () => {
    const result = await compressHybrid('Hello world this is test text')
    expect(result.originalTokens).toBeGreaterThan(0)
    expect(result.compressedTokens).toBeGreaterThan(0)
  })
})

describe('decompressor', () => {
  it('decompressLevel expands abbreviations', () => {
    const result = decompressLevel('fn param cfg impl docs')
    expect(result).toContain('function')
    expect(result).toContain('parameter')
    expect(result).toContain('configuration')
  })

  it('decompress routes DSL input to decompressDSL', () => {
    const dsl = '@db.q(s=1)'
    const result = decompress(dsl)
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('decompress routes prose to decompressLevel', () => {
    const compressed = 'fn impl docs cfg'
    const result = decompress(compressed)
    expect(result).toContain('function')
  })
})
