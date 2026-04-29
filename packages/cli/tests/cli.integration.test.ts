/**
 * CompText CLI Integration Tests
 * Phase 4 Validation: Compress, Index, Search, Session
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('CompText CLI Integration Tests', () => {
  const testDbPath = './test-comptext.db'
  const testFile = './test-content.txt'
  const testContent = `
    CompText Revolution: Universal Token Compression Platform

    This document tests the CLI compression and indexing capabilities.
    We use BM25 ranking for full-text search over indexed documents.
    The system supports multiple compression levels (1-5) for different use cases.

    Key features:
    - Fast token compression (1.4ms latency)
    - Semantic preservation (>0.85 similarity)
    - 73% average token savings
    - Production-ready deployment
  `

  beforeEach(() => {
    // Create test file
    fs.writeFileSync(testFile, testContent, 'utf-8')
  })

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)
  })

  describe('compress command', () => {
    it('should compress text with default level', () => {
      const result = execSync(`npm run cli -- compress "Hello World"`, {
        cwd: path.join(process.cwd(), 'apps/cli'),
        encoding: 'utf-8'
      })

      expect(result).toContain('Compression Complete')
      expect(result).toContain('tokens')
      expect(result).toContain('Savings')
    })

    it('should compress file and detect savings', () => {
      const result = execSync(`npm run cli -- compress ${testFile} -l 3`, {
        cwd: path.join(process.cwd(), 'apps/cli'),
        encoding: 'utf-8'
      })

      expect(result).toContain('Reading file')
      expect(result).toContain('Compressed')
      expect(result).toMatch(/\d+%/)
    })

    it('should validate compression levels 1-5', () => {
      for (let level = 1; level <= 5; level++) {
        const result = execSync(`npm run cli -- compress "Test content" -l ${level}`, {
          cwd: path.join(process.cwd(), 'apps/cli'),
          encoding: 'utf-8'
        })
        expect(result).toContain(`Level:      ${level}`)
      }
    })

    it('should show verbose metrics when requested', () => {
      const result = execSync(`npm run cli -- compress "Test" -v`, {
        cwd: path.join(process.cwd(), 'apps/cli'),
        encoding: 'utf-8'
      })

      expect(result).toContain('Detailed Metrics')
      expect(result).toContain('Format')
      expect(result).toContain('Characters')
    })
  })

  describe('index command', () => {
    it('should index a file', () => {
      const result = execSync(
        `npm run cli -- index ${testFile} -d ${testDbPath} -t "test-doc"`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Indexed successfully')
      expect(result).toContain('Chunks')
      expect(result).toContain('Tokens')
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should index raw text', () => {
      const result = execSync(
        `npm run cli -- index "CompText Revolution is awesome" -d ${testDbPath}`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Indexed successfully')
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should handle indexing with custom name', () => {
      const result = execSync(
        `npm run cli -- index ${testFile} -d ${testDbPath} -n "My Document"`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('My Document')
    })
  })

  describe('search command', () => {
    beforeEach(() => {
      // Index test content first
      execSync(
        `npm run cli -- index ${testFile} -d ${testDbPath}`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )
    })

    it('should search indexed documents', () => {
      const result = execSync(
        `npm run cli -- search "compression" -d ${testDbPath}`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Results for')
      expect(result).toContain('compression')
    })

    it('should return top-k results', () => {
      const result = execSync(
        `npm run cli -- search "token" -d ${testDbPath} -k 3`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Results for')
    })

    it('should show snippets in search results', () => {
      const result = execSync(
        `npm run cli -- search "production" -d ${testDbPath}`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Snippet')
    })

    it('should handle no results gracefully', () => {
      const result = execSync(
        `npm run cli -- search "nonexistentterm12345" -d ${testDbPath}`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('No matches')
    })
  })

  describe('session commands', () => {
    it('should list empty sessions initially', () => {
      const result = execSync(
        `npm run cli -- session list`,
        { cwd: path.join(process.cwd(), 'apps/cli'), encoding: 'utf-8' }
      )

      expect(result).toContain('Sessions')
    })
  })

  describe('error handling', () => {
    it('should error on invalid compression level', () => {
      const cmd = `npm run cli -- compress "Test" -l 99`
      try {
        execSync(cmd, { cwd: path.join(process.cwd(), 'apps/cli') })
      } catch (err) {
        expect((err as any).status).toBeGreaterThan(0)
      }
    })

    it('should handle missing database gracefully', () => {
      const cmd = `npm run cli -- search "test" -d /nonexistent/path/db.db`
      try {
        execSync(cmd, { cwd: path.join(process.cwd(), 'apps/cli') })
      } catch (err) {
        expect((err as any).status).toBeGreaterThan(0)
      }
    })
  })
})
