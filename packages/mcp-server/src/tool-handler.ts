/**
 * Tool Handler — Unified execution layer for CT tools
 * Routes to Python backend when available, falls back to in-process
 */

import { pythonBridge } from './python-bridge.js'

interface ToolInput {
  text?: string
  texts?: string[]
  level?: number
  output?: string
  maxTokens?: number
  query?: string
  topK?: number
  palace?: string
  wing?: string
  room?: string
  content?: string
  drawer?: string
  tags?: string
  source?: string
  [key: string]: any
}

interface ToolResult {
  type: 'text'
  text: string
}

/**
 * Execute a tool with Python backend fallback
 */
export async function executeTool(
  toolName: string,
  input: ToolInput,
  fallbackFn: (input: ToolInput) => Promise<any>
): Promise<ToolResult> {
  const usePython = process.env.USE_PYTHON !== 'false'

  if (!usePython) {
    const result = await fallbackFn(input)
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }
  }

  try {
    // Check Python backend health
    const healthy = await pythonBridge.health()
    if (!healthy) {
      console.warn('[Tool Handler] Python backend unavailable, using fallback')
      const result = await fallbackFn(input)
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    }

    // Route to Python for specific tools
    let pythonResult: any = null

    switch (toolName) {
      case 'ct_compress':
        pythonResult = await pythonBridge.compress(input.text || '', input.level || 2)
        break

      case 'ct_compress_batch':
        pythonResult = {
          results: await Promise.all(
            (input.texts || []).map(t => pythonBridge.compress(t, input.level || 2))
          )
        }
        break

      case 'ctx_index':
        pythonResult = await pythonBridge.index(
          input.source || '',
          input.content || '',
          input.tags || ''
        )
        break

      case 'ctx_search':
        pythonResult = {
          results: await pythonBridge.search(input.query || '', input.topK || 5)
        }
        break

      case 'mem_remember':
        pythonResult = await pythonBridge.remember(
          input.palace || '',
          input.wing || '',
          input.room || '',
          input.content || '',
          input.drawer,
          input.tags || ''
        )
        break

      case 'mem_recall':
        pythonResult = {
          results: await pythonBridge.recall(input.query || '', input.topK || 5)
        }
        break

      case 'cas_store':
        pythonResult = await pythonBridge.casStore(input.content || '')
        break

      case 'cas_fetch':
        pythonResult = {
          content: await pythonBridge.casFetch(input.sha256 || '')
        }
        break

      default:
        // Unknown tool, use fallback
        const result = await fallbackFn(input)
        return {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
    }

    return {
      type: 'text',
      text: JSON.stringify(pythonResult, null, 2)
    }
  } catch (error) {
    console.warn(`[Tool Handler] Python error for ${toolName}:`, error)
    // Fallback to in-process implementation
    const result = await fallbackFn(input)
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }
  }
}

/**
 * Initialize Python backend if enabled
 */
export async function initPythonBackend(): Promise<void> {
  const usePython = process.env.USE_PYTHON !== 'false'
  if (!usePython) return

  try {
    const healthy = await pythonBridge.health()
    if (healthy) {
      console.log('[Tool Handler] Python backend connected')
      return
    }
  } catch (error) {
    console.warn('[Tool Handler] Python backend not available, using in-process fallback')
  }
}
