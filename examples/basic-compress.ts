/**
 * Basic compression example
 */
import { compile } from '@comptext/core'

const longText = `
Please analyze the following document carefully and provide a comprehensive 
summary that covers all the main points, key arguments, and conclusions. 
Make sure to highlight any important details and present them in a clear, 
structured format that is easy to understand.
`

const result = compile(longText, { level: 3, format: 'compact' })

console.log('Original tokens:', result.tokensOriginal)
console.log('Compressed tokens:', result.tokensCompressed)
console.log('Ratio:', result.ratio.toFixed(2) + 'x')
console.log('Compressed:', result.document.compressed)
