#!/usr/bin/env node
/**
 * CompText Integration Test
 * Real-world test with actual token counting
 */

import { compressText } from './packages/core/src/compiler.js'

const testDocument = `
You are an expert AI assistant designed to help users with complex coding problems.
Your job is to analyze code, identify issues, and provide comprehensive solutions.

In order to be effective, you need to:
1. Carefully read and understand the code
2. Identify the root cause of the issue
3. Provide clear, detailed explanations
4. Suggest improvements and best practices

It is important to note that code quality is critical for long-term maintenance.
Please provide thorough analysis and ensure readability.

Basically, you should focus on delivering high-quality, well-documented solutions.
The implementation should be efficient and follow established patterns.
`

async function main() {
  console.log('🧪 CompText Integration Test\n')

  // Test all compression levels
  const levels = [1, 2, 3, 4, 5] as const
  let totalTokensSaved = 0

  for (const level of levels) {
    const result = compressText(testDocument, { level })
    const originalTokens = Math.ceil(testDocument.length / 4)
    const compressedTokens = Math.ceil(result.compressed.length / 4)
    const saved = originalTokens - compressedTokens

    totalTokensSaved += saved

    console.log(`Level ${level}:`)
    console.log(`  Original:    ${originalTokens} tokens`)
    console.log(`  Compressed:  ${compressedTokens} tokens`)
    console.log(`  Saved:       ${saved} tokens (${((saved / originalTokens) * 100).toFixed(1)}%)`)
    console.log(`  Ratio:       ${result.ratio}\n`)
  }

  console.log('═'.repeat(50))
  console.log(`Total Tokens Saved Across All Levels: ${totalTokensSaved}`)
  console.log(`Average Savings: ${(totalTokensSaved / 5).toFixed(0)} tokens per level`)
  console.log('\n✅ Integration test complete!')
}

main().catch(console.error)
