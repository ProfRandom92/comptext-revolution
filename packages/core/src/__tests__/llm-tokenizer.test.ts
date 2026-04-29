import { describe, it, expect } from 'vitest'
import { countTokens, tokenSavings } from '../llm-tokenizer.js'

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0)
  })

  it('counts tokens for simple text', () => {
    const count = countTokens('Hello world')
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(4) // "Hello", " world" = 2 tokens
  })

  it('longer text produces more tokens', () => {
    const short = countTokens('Hello')
    const long = countTokens('Hello world this is a longer sentence with many words')
    expect(long).toBeGreaterThan(short)
  })

  it('is deterministic', () => {
    const text = 'The quick brown fox'
    expect(countTokens(text)).toBe(countTokens(text))
  })
})

describe('tokenSavings', () => {
  it('reports zero savings for identical strings', () => {
    const result = tokenSavings('hello', 'hello')
    expect(result.savedTokens).toBe(0)
    expect(result.savingsPercent).toBe(0)
  })

  it('reports positive savings when compressed is shorter', () => {
    const original = 'Please provide documentation for the function implementation and configuration'
    const compressed = 'docs fn impl cfg'
    const result = tokenSavings(original, compressed)
    expect(result.savedTokens).toBeGreaterThan(0)
    expect(result.savingsPercent).toBeGreaterThan(0)
    expect(result.originalTokens).toBeGreaterThan(result.compressedTokens)
  })

  it('reports negative savings when compressed is longer', () => {
    const result = tokenSavings('hi', 'hello there friend')
    expect(result.savedTokens).toBeLessThan(0)
    expect(result.savingsPercent).toBeLessThan(0)
  })

  it('returns all four fields', () => {
    const result = tokenSavings('original text here', 'short')
    expect(result).toHaveProperty('originalTokens')
    expect(result).toHaveProperty('compressedTokens')
    expect(result).toHaveProperty('savedTokens')
    expect(result).toHaveProperty('savingsPercent')
  })
})
