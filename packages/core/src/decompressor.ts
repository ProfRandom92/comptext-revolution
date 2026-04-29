/**
 * CompText Decompressor
 *
 * ⚠️  LOSSY COMPRESSION NOTICE
 * Level 1–5 compression is lossy by design:
 *   - Filler words (Level 2) are permanently deleted
 *   - Articles (Level 3) are permanently deleted
 *   - Vowels in words (Level 4) are permanently deleted
 *   - Semantic paraphrasing (Level 5) is irreversible
 *
 * This decompressor reverses only dictionary substitutions (abbreviations,
 * symbols, phrase collapses). The output is semantically equivalent to the
 * original but NOT byte-identical. Deleted words CANNOT be recovered.
 */

import {
  ABBREVIATIONS,
  PHRASE_COLLAPSES,
} from './dictionary.js'
import { decompressDSL } from './hybrid.js'

// ============================================================================
// Expansion Maps (inverted from dictionary.ts)
// ============================================================================

/**
 * Build reverse map: compressed → original
 * Handles duplicate values (e.g. 'req' maps to both 'request' and 'requirement')
 * — last entry wins, which is acceptable for best-effort expansion
 */
const ABBREVIATION_EXPANSION = new Map<string, string>()
for (const [original, abbreviated] of Object.entries(ABBREVIATIONS)) {
  ABBREVIATION_EXPANSION.set(abbreviated, original)
}

const PHRASE_EXPANSION = new Map<string, string>()
for (const [original, collapsed] of Object.entries(PHRASE_COLLAPSES)) {
  if (collapsed) PHRASE_EXPANSION.set(collapsed, original)
}

// ============================================================================
// Level Decompressor
// ============================================================================

/**
 * Expand compressed prose back toward original form.
 *
 * Reverses:
 *   ✅ ABBREVIATIONS from dictionary.ts  (function ← fn, configuration ← cfg …)
 *   ✅ PHRASE_COLLAPSES from dictionary.ts (therefore ← →, because ← b/c …)
 *   ✅ Standard shorthand (w/ ← with, w/o ← without …)
 *   ❌ Deleted filler words (Level 2) — unrecoverable
 *   ❌ Deleted articles (Level 3) — unrecoverable
 *   ❌ Removed vowels (Level 4) — unrecoverable
 *   ❌ Semantic rewrites (Level 5) — unrecoverable
 *
 * @param compressed - CompText level-compressed text
 * @returns Best-effort expanded text (semantically equivalent, not identical)
 */
export function decompressLevel(compressed: string): string {
  let result = compressed

  // 1. Expand phrase collapses (longest first to avoid partial matches)
  const sortedPhrases = [...PHRASE_EXPANSION.entries()]
    .sort((a, b) => b[0].length - a[0].length)

  for (const [collapsed, original] of sortedPhrases) {
    if (!collapsed) continue
    const escaped = collapsed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'gi'), original)
  }

  // 2. Expand dictionary abbreviations (whole-word match)
  const sortedAbbrevs = [...ABBREVIATION_EXPANSION.entries()]
    .sort((a, b) => b[0].length - a[0].length)

  for (const [abbreviated, original] of sortedAbbrevs) {
    const escaped = abbreviated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), original)
  }

  // 3. Expand standard shorthand not in dictionary
  const standardExpansions: [RegExp, string][] = [
    [/\bw\/o\b/gi, 'without'],
    [/\bw\//gi, 'with '],
    [/\bb\/c\b/gi, 'because'],
    [/\bb\/t\b/gi, 'between'],
    [/\bthru\b/gi, 'through'],
    [/\bapprox\b/gi, 'approximately'],
    [/\bvs\b/gi, 'versus'],
    [/\betc\b/gi, 'et cetera'],
  ]
  for (const [pattern, replacement] of standardExpansions) {
    result = result.replace(pattern, replacement)
  }

  return result
}

// ============================================================================
// Unified Decompress Router
// ============================================================================

/**
 * Automatically routes DSL-compressed vs level-compressed input.
 *
 * DSL input starts with @namespace.operation — routes to decompressDSL().
 * All other input routes to decompressLevel().
 *
 * @param compressed - Any CompText-compressed string
 * @returns Best-effort decompressed string
 */
export function decompress(compressed: string): string {
  const isDSL = /^@[a-z]+\.[a-z]+/.test(compressed.trimStart())
  return isDSL ? decompressDSL(compressed) : decompressLevel(compressed)
}
