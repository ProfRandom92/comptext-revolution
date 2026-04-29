/**
 * LLM-precise token counting via js-tiktoken (cl100k_base)
 * Pure JS — no WASM, works in Edge Runtimes (Cloudflare Workers, Vercel Edge)
 */
import { getEncoding } from 'js-tiktoken'

let _enc: ReturnType<typeof getEncoding> | null = null

function getEncoder(): ReturnType<typeof getEncoding> {
  if (!_enc) {
    _enc = getEncoding('cl100k_base')
  }
  return _enc
}

/**
 * Count LLM tokens for a given string (cl100k_base, used by GPT-4 / Claude-family BPE)
 */
export function countTokens(text: string): number {
  if (!text) return 0
  return getEncoder().encode(text).length
}

export interface TokenSavingsResult {
  originalTokens: number
  compressedTokens: number
  savedTokens: number
  savingsPercent: number
}

/**
 * Compare token counts between original and compressed text
 */
export function tokenSavings(original: string, compressed: string): TokenSavingsResult {
  const originalTokens = countTokens(original)
  const compressedTokens = countTokens(compressed)
  const savedTokens = originalTokens - compressedTokens
  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    savingsPercent: originalTokens > 0
      ? Math.round((savedTokens / originalTokens) * 10000) / 100
      : 0,
  }
}
