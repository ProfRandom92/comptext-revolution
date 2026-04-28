/**
 * CompText + Claude SDK Integration Example
 * Shows how to use CompText for automatic prompt compression before sending to Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import { compressText } from '../packages/core/src/compiler.js'

interface CompressionResult {
  original: string
  compressed: string
  tokensSaved: number
  originalTokens: number
  compressedTokens: number
}

class CompTextClaudeClient {
  private client: Anthropic
  private compressionLevel: 1 | 2 | 3 | 4 | 5 = 2

  constructor(apiKey?: string, compressionLevel?: 1 | 2 | 3 | 4 | 5) {
    this.client = new Anthropic({ apiKey })
    if (compressionLevel) this.compressionLevel = compressionLevel
  }

  /** Compress a prompt before sending to Claude */
  private compressPrompt(prompt: string): CompressionResult {
    const result = compressText(prompt, { level: this.compressionLevel })
    const originalTokens = Math.ceil(prompt.length / 4)
    const compressedTokens = Math.ceil(result.compressed.length / 4)

    return {
      original: prompt,
      compressed: result.compressed,
      tokensSaved: originalTokens - compressedTokens,
      originalTokens,
      compressedTokens
    }
  }

  /** Send a message with automatic compression */
  async sendMessage(
    prompt: string,
    options?: {
      compress?: boolean
      showMetrics?: boolean
    }
  ) {
    const shouldCompress = options?.compress !== false
    let finalPrompt = prompt
    let metrics: CompressionResult | null = null

    if (shouldCompress) {
      const compressed = this.compressPrompt(prompt)
      metrics = compressed
      finalPrompt = compressed.compressed

      if (options?.showMetrics) {
        console.log(`\n📊 Compression Metrics:`)
        console.log(`   Original tokens:    ${compressed.originalTokens}`)
        console.log(`   Compressed tokens:  ${compressed.compressedTokens}`)
        console.log(`   Tokens saved:       ${compressed.tokensSaved} (${((compressed.tokensSaved / compressed.originalTokens) * 100).toFixed(1)}%)`)
      }
    }

    console.log(`\n📤 Sending ${finalPrompt.length} chars to Claude...`)

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: finalPrompt
        }
      ]
    })

    return {
      response: message,
      metrics,
      tokenUsage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens
      }
    }
  }

  /** Compare compression vs non-compression */
  async compareCompression(prompt: string) {
    console.log(`\n🔄 Comparing compressed vs uncompressed...\n`)

    // Without compression
    console.log('1️⃣  Without Compression:')
    const uncompressed = await this.sendMessage(prompt, { compress: false })

    // With compression
    console.log('\n2️⃣  With Compression (Level 2):')
    const compressed = await this.sendMessage(prompt, { compress: true, showMetrics: true })

    // Summary
    console.log(`\n📈 Cost Savings Summary:`)
    console.log(`   Input tokens without compression:  ${uncompressed.tokenUsage.input}`)
    console.log(`   Input tokens with compression:     ${compressed.tokenUsage.input}`)
    console.log(`   Tokens saved:                      ${uncompressed.tokenUsage.input - compressed.tokenUsage.input}`)

    const savings = uncompressed.tokenUsage.input - compressed.tokenUsage.input
    const savingsPercent = ((savings / uncompressed.tokenUsage.input) * 100).toFixed(1)
    console.log(`   Savings:                           ${savingsPercent}%\n`)

    return { uncompressed, compressed }
  }
}

// Example usage
async function main() {
  const client = new CompTextClaudeClient()

  const longPrompt = `
You are an expert software engineer with 20 years of experience.
Please analyze the following code and provide comprehensive feedback.

In order to provide the best possible analysis, you should:
1. Identify all potential bugs and issues
2. Suggest performance optimizations
3. Recommend code quality improvements
4. Provide security considerations
5. Give best practices recommendations

It is important to note that your analysis should be thorough and detailed.
The code quality is critical for production systems.
Basically, you need to be comprehensive in your review.
Please provide detailed explanations for each issue found.

The implementation should follow industry best practices and standards.
Essentially, the code should be maintainable and efficient.
Make sure to point out any violations of common patterns.
`

  try {
    console.log('🚀 CompText + Claude SDK Integration Example\n')
    await client.compareCompression(longPrompt)
  } catch (error) {
    console.error('Error:', error)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { CompTextClaudeClient }
