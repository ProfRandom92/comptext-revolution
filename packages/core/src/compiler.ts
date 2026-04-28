import type { CompileOptions, CompileResult, CompTextDocument } from './types'
import { tokenize } from './tokenizer'

/**
 * Main CompText compiler
 * Transforms plain text or structured input into CompText DSL
 */
export function compile(input: string, options: CompileOptions = {}): CompileResult {
  const start = Date.now()
  const { level = 3, preserveStructure = true, format = 'compact' } = options

  const tokens = tokenize(input)
  const compressed = applyCompression(input, level, format)

  const tokensOriginal = estimateTokens(input)
  const tokensCompressed = estimateTokens(compressed)

  const document: CompTextDocument = {
    version: '0.1.0',
    tokens,
    metadata: { level, format, preserveStructure },
    raw: input,
    compressed,
    compressionRatio: tokensOriginal / tokensCompressed
  }

  return {
    document,
    tokensOriginal,
    tokensCompressed,
    ratio: document.compressionRatio,
    durationMs: Date.now() - start
  }
}

/** Decompress a CompText document back to readable form */
export function decompress(compressed: string): string {
  // TODO: implement full decompression
  return compressed
}

function applyCompression(input: string, level: number, format: string): string {
  // TODO: implement full CompText DSL compression
  // Level 1: whitespace + stopword removal
  // Level 2: + abbreviation substitution
  // Level 3: + structural encoding
  // Level 4: + semantic compression
  // Level 5: + full DSL encoding
  let result = input
  if (level >= 1) result = result.replace(/\s+/g, ' ').trim()
  return result
}

function estimateTokens(text: string): number {
  // ~4 characters per token (rough GPT estimate)
  return Math.ceil(text.length / 4)
}
