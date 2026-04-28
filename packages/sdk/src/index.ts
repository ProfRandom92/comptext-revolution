/**
 * @comptext/sdk
 * Unified TypeScript SDK — single import for the full CompText platform
 *
 * @example
 * import { CompText } from '@comptext/sdk'
 *
 * const ct = new CompText()
 * const result = await ct.compress('Your long text here...')
 * console.log(result.ratio) // e.g. 12.4x
 *
 * await ct.index.addFile('./docs/api.md')
 * const hits = await ct.index.search('authentication')
 *
 * const session = ct.session('my-workflow')
 * await session.checkpoint({ step: 3, data: hits })
 */

export { compile, decompress, formatStats } from '@comptext/core'
export { Indexer } from '@comptext/indexer'
export { SessionMemory } from '@comptext/session-memory'
export { SandboxRunner } from '@comptext/sandbox-runner'

export class CompText {
  readonly index: import('@comptext/indexer').Indexer
  readonly sandbox: import('@comptext/sandbox-runner').SandboxRunner

  constructor(dbPath = ':memory:') {
    const { Indexer } = require('@comptext/indexer')
    const { SandboxRunner } = require('@comptext/sandbox-runner')
    this.index = new Indexer(dbPath)
    this.sandbox = new SandboxRunner()
  }

  compress(text: string, level = 3) {
    const { compile } = require('@comptext/core')
    return compile(text, { level })
  }

  session(id?: string) {
    const { SessionMemory } = require('@comptext/session-memory')
    return new SessionMemory(id)
  }
}
