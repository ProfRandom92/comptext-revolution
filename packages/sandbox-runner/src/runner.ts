import type { RunOptions, RunResult } from './types'

/**
 * CompText Sandbox Runner
 * Executes code/analysis in isolation, returns compressed results
 */
export class SandboxRunner {
  async run(code: string, options: RunOptions): Promise<RunResult> {
    // TODO: implement sandboxed execution via vm2 or isolated-vm
    throw new Error('Not implemented yet')
  }

  async runFile(filePath: string, options: RunOptions): Promise<RunResult> {
    throw new Error('Not implemented yet')
  }
}
