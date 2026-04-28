import type { CompTextDocument } from './types'

/** Serialize a CompTextDocument to JSON */
export function serialize(doc: CompTextDocument): string {
  return JSON.stringify(doc, null, 2)
}

/** Deserialize a CompTextDocument from JSON */
export function deserialize(json: string): CompTextDocument {
  return JSON.parse(json) as CompTextDocument
}

/** Get compression stats as a readable string */
export function formatStats(doc: CompTextDocument): string {
  const ratio = (doc.compressionRatio * 100 - 100).toFixed(0)
  return `Compression: ${doc.compressionRatio.toFixed(2)}x | Saved: ~${ratio}% tokens`
}
