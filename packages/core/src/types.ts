/**
 * Core types for the CompText DSL
 */

export interface CompTextDocument {
  version: string
  tokens: CompTextToken[]
  metadata: Record<string, unknown>
  raw: string
  compressed: string
  compressionRatio: number
}

export interface CompTextToken {
  type: TokenType
  value: string
  position: number
  length: number
}

export type TokenType =
  | 'directive'
  | 'reference'
  | 'literal'
  | 'operator'
  | 'identifier'
  | 'value'

export interface CompileOptions {
  /** Target compression level (1-5, default: 3) */
  level?: number
  /** Preserve structure hints for LLM readability */
  preserveStructure?: boolean
  /** Output format */
  format?: 'compact' | 'structured' | 'minimal'
}

export interface CompileResult {
  document: CompTextDocument
  tokensOriginal: number
  tokensCompressed: number
  ratio: number
  durationMs: number
}

export interface CompressOptions {
  level?: 1 | 2 | 3 | 4 | 5
  profile?: 'minimal' | 'standard' | 'aggressive' | 'ultra'
}

export interface CompressResult {
  original: string
  compressed: string
  originalLength: number
  compressedLength: number
  savedChars: number
  ratio: string
  level: number
}
