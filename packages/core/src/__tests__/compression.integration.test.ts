/**
 * Integration tests for compression with real-world scenarios
 */

import { describe, it, expect } from 'vitest'
import { compressText, compile } from '../compiler.js'

describe('Compression Integration Tests', () => {
  describe('Real-world documents', () => {
    const apiDocumentation = `
      REST API Endpoint: POST /api/users

      This endpoint creates a new user in the system.
      Please provide the following information:
      - email (string, required)
      - password (string, required, minimum 8 characters)
      - name (string, required)
      - age (number, optional)

      The request should be in JSON format.
      In order to ensure security, passwords are hashed using bcrypt.
      It is important to note that all fields are validated.

      Response codes:
      - 201: User created successfully
      - 400: Bad request (validation failed)
      - 409: Conflict (email already exists)

      Example response:
      {
        "id": "user_123",
        "email": "user@example.com",
        "name": "John Doe",
        "createdAt": "2024-04-28T12:00:00Z"
      }
    `

    it('compresses API documentation efficiently', () => {
      const result = compressText(apiDocumentation, { level: 2 })
      expect(result.compressedLength).toBeLessThan(apiDocumentation.length * 0.75)
      expect(result.savedChars).toBeGreaterThan(100)
    })

    it('maintains semantic meaning through levels', () => {
      const results = [1, 2, 3, 4, 5].map(level =>
        compressText(apiDocumentation, { level: level as any })
      )

      // Each level should compress more than previous
      for (let i = 1; i < results.length; i++) {
        expect(results[i].compressedLength).toBeLessThanOrEqual(
          results[i - 1].compressedLength
        )
      }
    })
  })

  describe('Compilation with token estimation', () => {
    it('estimates tokens accurately', () => {
      const text = 'This is a test document with some content.'
      const result = compile(text)

      // Claude uses ~4 chars per token
      const expectedTokens = Math.ceil(text.length / 4)
      expect(result.tokensOriginal).toBeCloseTo(expectedTokens, 1)
    })

    it('calculates compression ratio correctly', () => {
      const text = 'Please analyze this document and provide a comprehensive summary.'
      const result = compile(text, { level: 2 })

      expect(result.ratio).toBeGreaterThan(1)
      expect(result.tokensCompressed).toBeLessThan(result.tokensOriginal)
    })
  })

  describe('Profile-based compression', () => {
    const longText = `
      This is a comprehensive document that contains substantial information.
      It has multiple paragraphs and sections. In order to be effective,
      one must carefully analyze all aspects. It is important to note that
      quality is essential. Basically, you should focus on the details.
      Please provide thorough analysis. The implementation should be efficient
      and well-documented. Essentially, this demonstrates the value of compression.
    `

    it('minimal profile compresses least', () => {
      const minimal = compressText(longText, { profile: 'minimal' })
      expect(minimal.level).toBe(1)
      expect(parseFloat(minimal.ratio)).toBeGreaterThan(0.9)
    })

    it('standard profile provides good balance', () => {
      const standard = compressText(longText, { profile: 'standard' })
      expect(standard.level).toBe(2)
      expect(parseFloat(standard.ratio)).toBeLessThan(0.85)
    })

    it('aggressive profile compresses significantly', () => {
      const aggressive = compressText(longText, { profile: 'aggressive' })
      expect(aggressive.level).toBe(3)
      expect(parseFloat(aggressive.ratio)).toBeLessThan(0.80)
    })

    it('ultra profile maximizes compression', () => {
      const ultra = compressText(longText, { profile: 'ultra' })
      expect(ultra.level).toBe(5)
      expect(parseFloat(ultra.ratio)).toBeLessThan(0.70)
    })
  })

  describe('Error handling', () => {
    it('handles empty strings', () => {
      const result = compressText('')
      expect(result.compressed).toBe('')
      expect(result.savedChars).toBe(0)
    })

    it('handles very long documents', () => {
      const longDoc = 'word '.repeat(10000)
      const result = compressText(longDoc, { level: 2 })
      expect(result.compressed.length).toBeGreaterThan(0)
      expect(result.compressed.length).toBeLessThan(longDoc.length)
    })

    it('handles special characters', () => {
      const special = 'Test with émojis 🚀 and spëcial çharacters!'
      const result = compressText(special, { level: 2 })
      expect(result.compressed).toBeDefined()
      expect(result.compressed.length).toBeGreaterThan(0)
    })
  })

  describe('Performance metrics', () => {
    it('compresses quickly for small documents', () => {
      const start = performance.now()
      compressText('This is a small document.')
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10) // Should be <10ms
    })

    it('compresses efficiently for large documents', () => {
      const largeDoc = 'word '.repeat(5000)
      const start = performance.now()
      compressText(largeDoc, { level: 2 })
      const duration = performance.now() - start
      expect(duration).toBeLessThan(100) // Should be <100ms
    })
  })
})
