import { describe, it, expect } from 'vitest'
import { compressText } from '../compiler.js'
import { applyLevel1, applyLevel2, applyLevel3, applyLevel4, applyLevel5 } from '../levels.js'

describe('Compression Levels', () => {
  describe('Level 1: Whitespace Normalization', () => {
    it('normalizes whitespace and removes blank lines', () => {
      const input = 'Hello  world\n\n\nGoodbye   world'
      const result = applyLevel1(input)
      expect(result).toBe('Hello world\nGoodbye world')
    })

    it('trims leading and trailing spaces', () => {
      const input = '  text  '
      const result = applyLevel1(input)
      expect(result).toBe('text')
    })
  })

  describe('Level 2: Filler + Abbreviations', () => {
    it('removes filler words', () => {
      const input = 'basically this is very important'
      const result = applyLevel2(input)
      expect(result).not.toContain('basically')
      expect(result).not.toContain('very')
    })

    it('applies abbreviations', () => {
      const input = 'Please analyze this document and provide a structured summary'
      const result = applyLevel2(input)
      expect(result).toContain('anlz')
      expect(result).toContain('doc')
      expect(result).toContain('sum')
    })

    it('collapses phrases', () => {
      const input = 'in order to achieve this'
      const result = applyLevel2(input)
      expect(result).toContain('to')
      expect(result).not.toContain('in order to')
    })

    it('achieves meaningful compression ratio', () => {
      const input = 'Please analyze this document and provide a structured summary'
      const result = applyLevel2(input)
      const ratio = result.length / input.length
      expect(ratio).toBeLessThan(0.85) // abbreviations + filler removal
    })
  })

  describe('Level 3: Articles + Dedup', () => {
    it('removes articles', () => {
      const input = 'This is a document and the application'
      const result = applyLevel3(input)
      expect(result).not.toContain('the')
    })

    it('removes duplicate lines', () => {
      const input = 'line one\nline two\nline one'
      const result = applyLevel3(input)
      const lines = result.split('\n')
      expect(lines.length).toBe(2)
    })
  })

  describe('Level 4: Vowel Reduction', () => {
    it('reduces vowels in long words', () => {
      const input = 'function parameter configuration'
      const result = applyLevel4(input)
      // Should be reduced but still somewhat readable
      expect(result.length).toBeLessThan(input.length)
    })

    it('preserves short words', () => {
      const input = 'This is a test'
      const result = applyLevel4(input)
      // Short words should be preserved
      expect(result).toContain('is')
    })
  })

  describe('Level 5: Maximum Compression', () => {
    it('creates skeleton words (first + consonants + last)', () => {
      const input = 'parameter function database'
      const result = applyLevel5(input)
      expect(result.length).toBeLessThan(input.length * 0.75)
    })

    it('achieves significant compression on long prose', () => {
      const input = 'Please analyze this document and provide a structured summary of the implementation'
      const result = applyLevel5(input)
      const ratio = result.length / input.length
      expect(ratio).toBeLessThan(0.65)
    })
  })
})

describe('compressText() API', () => {
  it('compresses with default level 2 (standard)', () => {
    const result = compressText('Please provide a structured summary')
    expect(result.level).toBe(2)
    expect(parseFloat(result.ratio)).toBeLessThan(1.0)
  })

  it('compresses with custom level', () => {
    const result = compressText('Please provide a structured summary', { level: 3 })
    expect(result.level).toBe(3)
    expect(result.compressedLength).toBeLessThan(result.originalLength)
  })

  it('respects profile settings', () => {
    const text = 'Please analyze this document and provide a structured summary'
    const minimal = compressText(text, { profile: 'minimal' })
    const standard = compressText(text, { profile: 'standard' })
    const aggressive = compressText(text, { profile: 'aggressive' })
    const ultra = compressText(text, { profile: 'ultra' })

    expect(minimal.level).toBe(1)
    expect(standard.level).toBe(2)
    expect(aggressive.level).toBe(3)
    expect(ultra.level).toBe(5)

    // Tighter compressions should have smaller outputs
    expect(standard.compressedLength).toBeLessThanOrEqual(minimal.compressedLength)
    expect(aggressive.compressedLength).toBeLessThanOrEqual(standard.compressedLength)
    expect(ultra.compressedLength).toBeLessThanOrEqual(aggressive.compressedLength)
  })

  it('returns correct statistics', () => {
    const original = 'Please analyze this document and provide information'
    const result = compressText(original)

    expect(result.original).toBe(original)
    expect(result.originalLength).toBe(original.length)
    expect(result.compressedLength).toBeLessThan(original.length)
    expect(result.savedChars).toBeGreaterThan(0)
    expect(result.ratio).toBeDefined()
  })

  it('preserves readability at level 2', () => {
    const input = 'function parameter configuration database'
    const result = compressText(input, { level: 2 })
    // Should contain abbreviations but be readable
    expect(result.compressed.length).toBeGreaterThan(0)
  })
})

describe('Real-world examples', () => {
  it('compresses Claude API instructions', () => {
    const api_doc = `
      You are a helpful assistant. Please provide comprehensive analysis.
      In order to be successful, you must carefully analyze the requirements
      and provide detailed documentation. It is important to note that
      performance is critical in this context.
    `
    const result = compressText(api_doc, { level: 3 })
    expect(result.savedChars).toBeGreaterThan(50)
  })

  it('compresses TypeScript code comments', () => {
    const code_comment = `
      This function initializes the application configuration
      and provides parameter validation for all inputs.
      The implementation handles errors appropriately.
    `
    const result = compressText(code_comment, { level: 2 })
    expect(result.compressedLength).toBeLessThan(code_comment.length * 0.7)
  })
})
