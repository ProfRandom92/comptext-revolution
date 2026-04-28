import {
  ABBREVIATIONS,
  FILLER_WORDS,
  PHRASE_COLLAPSES,
  ARTICLES,
  VOWELS,
} from './dictionary.js'

// Level 1: Normalize whitespace + deduplicate lines
export function applyLevel1(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n')
    .replace(/\n+/g, '\n')
    .trim()
}

// Level 2: Level 1 + remove filler words + abbreviations + phrase collapse
export function applyLevel2(text: string): string {
  let result = applyLevel1(text)

  // Replace phrase collapses
  Object.entries(PHRASE_COLLAPSES).forEach(([phrase, replacement]) => {
    result = result.replace(new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi'), replacement)
  })

  // Remove filler words (as whole words)
  const fillerPattern = Array.from(FILLER_WORDS).join('|')
  result = result.replace(new RegExp(`\\b(${fillerPattern})\\b`, 'gi'), '')

  // Apply abbreviations (word boundaries)
  Object.entries(ABBREVIATIONS).forEach(([word, abbrev]) => {
    result = result.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi'), abbrev)
  })

  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

// Level 3: Level 2 + remove articles + semantic dedup (by hash)
export function applyLevel3(text: string): string {
  let result = applyLevel2(text)

  // Remove articles at word boundaries (only single word, not in context)
  const articlePattern = Array.from(ARTICLES).join('|')
  result = result.replace(new RegExp(`\\b(${articlePattern})\\b`, 'gi'), '').replace(/\s+/g, ' ')

  // Remove duplicate lines (semantic dedup)
  const lines = result.split('\n')
  const seen = new Set<string>()
  result = lines
    .filter(line => {
      const hash = line.toLowerCase()
      if (seen.has(hash)) return false
      seen.add(hash)
      return true
    })
    .join('\n')

  return result.trim()
}

// Level 4: Level 3 + vowel reduction (only between consonants, skip short words)
export function applyLevel4(text: string): string {
  let result = applyLevel3(text)

  // Split into words and reduce vowels
  const words = result.split(/(\s+)/)
  result = words
    .map(word => {
      // Skip if not a word (is whitespace) or too short
      if (/^\s+$/.test(word) || word.length < 5) return word

      // Remove internal vowels (keep first + last letter + consonants)
      const chars = word.split('')
      let reduced = chars[0] // first char

      for (let i = 1; i < chars.length - 1; i++) {
        if (!VOWELS.has(chars[i].toLowerCase())) {
          reduced += chars[i]
        }
      }

      reduced += chars[chars.length - 1] // last char
      return reduced
    })
    .join('')

  return result
}

// Level 5: Level 4 + word skeleton (first + consonants + last)
export function applyLevel5(text: string): string {
  let result = applyLevel4(text)

  const words = result.split(/(\s+)/)
  result = words
    .map(word => {
      if (/^\s+$/.test(word) || word.length < 4) return word

      // Keep first char + all consonants + last char
      const chars = word.split('')
      let skeleton = chars[0]

      for (let i = 1; i < chars.length - 1; i++) {
        if (!VOWELS.has(chars[i].toLowerCase())) {
          skeleton += chars[i]
        }
      }

      skeleton += chars[chars.length - 1]
      return skeleton
    })
    .join('')

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
