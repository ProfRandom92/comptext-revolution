/**
 * CompText Revolution - Hybrid Compression Engine
 * Intelligently routes between DSL and Progressive Levels
 * Target: 70-75% token savings across all content types
 */

import { applyLevel5 } from './levels.js'
import { tokenSavings } from './llm-tokenizer.js'

// ============================================================================
// Input Type Detection
// ============================================================================

export type InputType = 'query' | 'text' | 'config' | 'api_call'

interface DetectionResult {
  type: InputType
  confidence: number
  patterns: string[]
}

const QUERY_PATTERNS = {
  dsl_namespace: /^@(db|ctx|http|session|fs|run)[.]/i,
  sql_query: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i,
  json_object: /^\s*[\{\[].*[\}\]]\s*$/,
  url_params: /[?&][a-z_]+=([^&\s])+/i,
  graphql: /\b(query|mutation|subscription)\s*{/i,
}

const TEXT_INDICATORS = {
  paragraphs: /\n\n+/,
  sentences: /[.!?]\s+[A-Z]/,
  prose: /\b(the|a|an|is|are|be)\b/gi,
}

/**
 * Detect whether input is structured data (query) or natural language (text)
 */
export function detectInputType(input: string): DetectionResult {
  let queryScore = 0
  const patterns: string[] = []

  if (QUERY_PATTERNS.dsl_namespace.test(input)) { queryScore += 5; patterns.push('dsl_namespace') }
  if (QUERY_PATTERNS.sql_query.test(input)) { queryScore += 4; patterns.push('sql_query') }
  if (QUERY_PATTERNS.json_object.test(input)) { queryScore += 3; patterns.push('json_object') }
  if (QUERY_PATTERNS.url_params.test(input)) { queryScore += 2; patterns.push('url_params') }
  if (QUERY_PATTERNS.graphql.test(input)) { queryScore += 4; patterns.push('graphql') }

  const proseMentions = (input.match(TEXT_INDICATORS.prose) || []).length
  if (proseMentions > input.length * 0.01) { queryScore -= 3; patterns.push('prose') }

  let type: InputType = 'text'
  let confidence = 0

  if (queryScore >= 5) {
    type = 'query'; confidence = Math.min(100, queryScore * 15)
  } else if (queryScore >= 3) {
    type = 'config'; confidence = Math.min(100, queryScore * 20)
  } else if (queryScore >= 2) {
    type = 'api_call'; confidence = Math.min(100, queryScore * 25)
  } else {
    type = 'text'; confidence = Math.max(0, 100 - queryScore * 10)
  }

  return { type, confidence, patterns }
}

// ============================================================================
// DSL Compression (for Queries)
// ============================================================================

/**
 * Apply DSL compression for structured data
 * Target: 85-90% token reduction
 */
export function applyDSL(input: string): string {
  let result = input.replace(/@(\w+)\.(\w+)/g, (match, ns, op) => {
    const nsMap: Record<string, string> = {
      db: 'db', ctx: 'c', http: 'h', session: 's', fs: 'f', run: 'r',
    }
    const opMap: Record<string, string> = {
      query: 'q', select: 's', insert: 'i', update: 'u', delete: 'd',
      search: 'sr', retrieve: 'r', execute: 'ex',
    }
    return `@${nsMap[ns] || ns.charAt(0)}.${opMap[op] || op.substring(0, 2)}`
  })

  const paramMap: Record<string, string> = {
    status: 's', created: 'c', updated: 'u', limit: 'l', offset: 'o',
    sort: 'st', filter: 'f', query: 'q', type: 't', id: 'id', user: 'usr', role: 'r',
  }
  result = result.replace(/(\w+)=/g, (match, key) => {
    const short = paramMap[key.toLowerCase()] || key.substring(0, 2)
    return `${short}=`
  })

  result = result.replace(/true/g, '1').replace(/false/g, '0').replace(/null/g, '\u2205')
  return result
}

// ============================================================================
// Hybrid Compression Router
// ============================================================================

export interface CompressionResult {
  compressed: string
  /** Token-based reduction percentage (precise, via js-tiktoken cl100k_base) */
  reduction: number
  /** Original LLM token count */
  originalTokens: number
  /** Compressed LLM token count */
  compressedTokens: number
  type: InputType
  method: 'dsl' | 'level5' | 'hybrid'
  latency_ms: number
  confidence: number
}

/**
 * Main hybrid compression function
 * Automatically selects best method based on input type
 */
export async function compressHybrid(input: string): Promise<CompressionResult> {
  const startTime = performance.now()

  const detection = detectInputType(input)
  let compressed: string
  let method: 'dsl' | 'level5'

  if (detection.type === 'query' && detection.confidence >= 70) {
    compressed = applyDSL(input)
    method = 'dsl'
  } else if (detection.type === 'config' || detection.type === 'api_call') {
    compressed = applyDSL(input)
    method = 'dsl'
  } else {
    compressed = applyLevel5(input)
    method = 'level5'
  }

  const latency_ms = performance.now() - startTime

  // Precise token-based savings (replaces naive char-length calculation)
  const tokenStats = tokenSavings(input, compressed)

  return {
    compressed,
    reduction: tokenStats.savingsPercent,
    originalTokens: tokenStats.originalTokens,
    compressedTokens: tokenStats.compressedTokens,
    type: detection.type,
    method,
    latency_ms: Math.round(latency_ms * 100) / 100,
    confidence: detection.confidence,
  }
}

/**
 * Batch compression for multiple inputs
 * Runs in parallel for better throughput
 */
export async function compressHybridBatch(
  inputs: string[]
): Promise<CompressionResult[]> {
  return Promise.all(inputs.map(input => compressHybrid(input)))
}

/**
 * Adaptive compression based on target savings
 */
export async function compressAdaptive(
  input: string,
  targetSavings: number
): Promise<CompressionResult> {
  const result = await compressHybrid(input)
  if (result.reduction < targetSavings && result.method === 'level5') {
    result.method = 'hybrid'
  }
  return result
}

// ============================================================================
// Decompression (for human review)
// ============================================================================

export function decompressDSL(compressed: string): string {
  let result = compressed

  result = result.replace(/@([a-z])\./g, (match, ns) => {
    const nsExpand: Record<string, string> = {
      db: '@db.', c: '@ctx.', h: '@http.', s: '@session.', f: '@fs.', r: '@run.',
    }
    return nsExpand[ns] || match
  })

  const paramExpand: Record<string, string> = {
    s: 'status', c: 'created', u: 'updated', l: 'limit',
    o: 'offset', st: 'sort', f: 'filter', q: 'query', t: 'type',
  }
  result = result.replace(/([a-z]+)=/g, (match, key) => `${paramExpand[key] || key}=`)
  result = result.replace(/\b1\b/g, 'true').replace(/\b0\b/g, 'false').replace(/\u2205/g, 'null')

  return result
}

// ============================================================================
// Metrics & Monitoring
// ============================================================================

interface HybridMetrics {
  totalCompressions: number
  dslCompressions: number
  level5Compressions: number
  avgDSLReduction: number
  avgLevel5Reduction: number
  avgHybridReduction: number
  avgLatency: number
  successRate: number
}

const metricsTracker = {
  totalCompressions: 0,
  dslCompressions: 0,
  level5Compressions: 0,
  totalDSLReduction: 0,
  totalLevel5Reduction: 0,
  totalLatency: 0,
  successes: 0,

  track(result: CompressionResult) {
    this.totalCompressions++
    this.totalLatency += result.latency_ms
    if (result.method === 'dsl') {
      this.dslCompressions++
      this.totalDSLReduction += result.reduction
    } else {
      this.level5Compressions++
      this.totalLevel5Reduction += result.reduction
    }
    if (result.reduction > 0) this.successes++
  },

  getMetrics(): HybridMetrics {
    return {
      totalCompressions: this.totalCompressions,
      dslCompressions: this.dslCompressions,
      level5Compressions: this.level5Compressions,
      avgDSLReduction: this.dslCompressions > 0
        ? this.totalDSLReduction / this.dslCompressions : 0,
      avgLevel5Reduction: this.level5Compressions > 0
        ? this.totalLevel5Reduction / this.level5Compressions : 0,
      avgHybridReduction: this.totalCompressions > 0
        ? (this.totalDSLReduction + this.totalLevel5Reduction) / this.totalCompressions : 0,
      avgLatency: this.totalCompressions > 0
        ? this.totalLatency / this.totalCompressions : 0,
      successRate: this.totalCompressions > 0
        ? (this.successes / this.totalCompressions) * 100 : 0,
    }
  },

  reset() {
    this.totalCompressions = 0; this.dslCompressions = 0; this.level5Compressions = 0
    this.totalDSLReduction = 0; this.totalLevel5Reduction = 0
    this.totalLatency = 0; this.successes = 0
  },
}

export { metricsTracker }

export default {
  compressHybrid,
  compressHybridBatch,
  compressAdaptive,
  detectInputType,
  decompressDSL,
  metricsTracker,
}
