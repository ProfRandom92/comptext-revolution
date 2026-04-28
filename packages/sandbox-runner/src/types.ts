export interface RunOptions {
  language: 'javascript' | 'typescript' | 'python'
  timeout?: number  // ms, default 5000
  memoryMb?: number
  allowNetwork?: boolean
}

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  error?: string
}
