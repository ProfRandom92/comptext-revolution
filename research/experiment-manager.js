#!/usr/bin/env node

/**
 * CompText AutoResearch - Experiment Manager
 * Manages experiment lifecycle, scheduling, and monitoring
 */

import { EventEmitter } from 'events'
import { writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { performance } from 'perf_hooks'

const resultsDir = 'research/results'
mkdirSync(resultsDir, { recursive: true })

class ExperimentManager extends EventEmitter {
  constructor() {
    super()
    this.experiments = new Map()
    this.queue = []
    this.running = null
    this.config = {
      autoRollback: true,
      rollbackThreshold: 0.005,
      timeout: 3600000,
      metrics: ['token_savings', 'latency', 'stability', 'security']
    }
    this.history = []
  }

  /**
   * Register experiment
   */
  registerExperiment(id, { name, variants, duration = 300000, target = 55 }) {
    const exp = {
      id,
      name,
      variants,
      duration,
      target,
      status: 'pending',
      progress: 0,
      startTime: null,
      results: {},
      metrics: {}
    }
    this.experiments.set(id, exp)
    this.emit('experiment:registered', exp)
    return exp
  }

  /**
   * Start experiment
   */
  async startExperiment(expId) {
    const exp = this.experiments.get(expId)
    if (!exp) throw new Error(`Experiment not found: ${expId}`)

    this.running = exp
    exp.status = 'running'
    exp.startTime = Date.now()

    this.emit('experiment:started', exp)
    this.log(`[${exp.name}] Starting...`, 'info')

    try {
      await this._runExperiment(exp)
      exp.status = 'completed'
      this.emit('experiment:completed', exp)
      this.log(`[${exp.name}] Completed with ${exp.metrics.avgSavings?.toFixed(2)}% savings`, 'success')
    } catch (error) {
      exp.status = 'error'
      exp.error = error.message
      this.emit('experiment:error', exp, error)
      this.log(`[${exp.name}] Error: ${error.message}`, 'error')
    } finally {
      this.running = null
      this.history.push(exp)
      await this._saveResults(exp)
    }
  }

  /**
   * Internal: Run experiment
   */
  async _runExperiment(exp) {
    const startTime = performance.now()
    let totalSavings = 0
    let totalLatency = 0
    let totalStability = 95

    for (let i = 0; i < exp.variants.length; i++) {
      const variant = exp.variants[i]

      // Simulate compression test
      const savings = this._simulateSavings(variant)
      const latency = Math.random() * 5 + 0.5
      const stability = 95 + Math.random() * 4

      exp.results[variant] = { savings, latency, stability }

      totalSavings += savings
      totalLatency += latency
      totalStability += stability

      exp.progress = Math.floor(((i + 1) / exp.variants.length) * 100)
      this.emit('experiment:progress', exp)

      // Simulate processing time
      await new Promise(r => setTimeout(r, Math.random() * 1000 + 500))

      this.log(`[${exp.name}] ${variant}: ${savings.toFixed(2)}% savings`, 'info')
    }

    exp.metrics = {
      avgSavings: totalSavings / exp.variants.length,
      avgLatency: totalLatency / exp.variants.length,
      avgStability: totalStability / exp.variants.length,
      duration: performance.now() - startTime,
      winner: Object.entries(exp.results).reduce((a, b) =>
        a[1].savings > b[1].savings ? a : b
      )[0]
    }

    // Check if met target
    if (exp.metrics.avgSavings < exp.target * 0.95 && this.config.autoRollback) {
      this.emit('experiment:rollback', exp, `Below target: ${exp.metrics.avgSavings.toFixed(2)}% < ${exp.target}%`)
      this.log(`[${exp.name}] Auto-rollback triggered`, 'warning')
    }

    return exp
  }

  /**
   * Simulate compression savings
   */
  _simulateSavings(variant) {
    const baseMap = {
      'level1': 5.95,
      'level2': 38.33,
      'level3': 40.97,
      'level4': 54.19,
      'level5': 55.07,
      'dsl-baseline': 86.5,
      'hybrid': 70
    }

    const base = baseMap[variant] || 40
    const variance = (Math.random() - 0.5) * 2
    return Math.max(0, base + variance)
  }

  /**
   * Queue experiment
   */
  queueExperiment(expId) {
    const exp = this.experiments.get(expId)
    if (!exp) throw new Error(`Experiment not found: ${expId}`)

    this.queue.push(expId)
    this.emit('queue:updated', this.queue)
    this.log(`[${exp.name}] Queued (#${this.queue.length})`, 'info')
  }

  /**
   * Run queue
   */
  async runQueue() {
    while (this.queue.length > 0) {
      const expId = this.queue.shift()
      await this.startExperiment(expId)
      this.emit('queue:updated', this.queue)
    }
  }

  /**
   * Pause running experiment
   */
  pauseExperiment() {
    if (this.running) {
      this.running.status = 'paused'
      this.emit('experiment:paused', this.running)
      this.log(`Paused: ${this.running.name}`, 'warning')
    }
  }

  /**
   * Resume paused experiment
   */
  resumeExperiment() {
    if (this.running && this.running.status === 'paused') {
      this.running.status = 'running'
      this.emit('experiment:resumed', this.running)
      this.log(`Resumed: ${this.running.name}`, 'info')
    }
  }

  /**
   * Stop running experiment
   */
  stopExperiment() {
    if (this.running) {
      this.running.status = 'stopped'
      this.emit('experiment:stopped', this.running)
      this.log(`Stopped: ${this.running.name}`, 'warning')
      this.running = null
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.running ? {
        id: this.running.id,
        name: this.running.name,
        progress: this.running.progress,
        elapsed: this.running.startTime ? Date.now() - this.running.startTime : 0
      } : null,
      queue: this.queue.map(id => this.experiments.get(id).name),
      history: this.history.map(e => ({
        name: e.name,
        status: e.status,
        savings: e.metrics.avgSavings?.toFixed(2),
        duration: (e.metrics.duration / 1000).toFixed(1) + 's'
      })),
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config)
    this.emit('config:updated', this.config)
    this.log(`Config updated`, 'info')
  }

  /**
   * Save results
   */
  async _saveResults(exp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = join(resultsDir, `exp-${exp.id}-${timestamp}.json`)

    const data = {
      id: exp.id,
      name: exp.name,
      status: exp.status,
      timestamp: new Date().toISOString(),
      variants: exp.variants,
      results: exp.results,
      metrics: exp.metrics
    }

    writeFileSync(filename, JSON.stringify(data, null, 2))
    return filename
  }

  /**
   * Logging
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}`

    console.log(logLine)
    this.emit('log', { message, type, timestamp })

    // Persist log
    const logFile = join(resultsDir, 'manager.log')
    appendFileSync(logFile, logLine + '\n')
  }
}

// Export
export default ExperimentManager

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ExperimentManager()

  // Register experiments
  manager.registerExperiment('compression-v1', {
    name: 'Compression Level Testing',
    variants: ['level1', 'level2', 'level3', 'level4', 'level5'],
    duration: 300000,
    target: 55
  })

  manager.registerExperiment('dsl-v1', {
    name: 'DSL Integration',
    variants: ['dsl-baseline', 'dsl-optimized'],
    duration: 180000,
    target: 85
  })

  manager.registerExperiment('hybrid-v1', {
    name: 'Hybrid Approach',
    variants: ['hybrid'],
    duration: 600000,
    target: 70
  })

  // Event listeners
  manager.on('experiment:started', exp => {
    console.log(`\n▶ Started: ${exp.name}`)
  })

  manager.on('experiment:progress', exp => {
    process.stdout.write(`\r  Progress: ${exp.progress}%`)
  })

  manager.on('experiment:completed', exp => {
    console.log(`\n✓ Completed: ${exp.name} - ${exp.metrics.avgSavings.toFixed(2)}% savings`)
  })

  manager.on('log', log => {
    // Can be sent to dashboard via WebSocket
  })

  // Demo
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║  CompText AutoResearch - Experiment Manager          ║')
  console.log('╚═══════════════════════════════════════════════════════╝\n')

  console.log('Registered experiments:')
  for (const [id, exp] of manager.experiments) {
    console.log(`  • ${exp.name} (${exp.variants.length} variants)`)
  }

  console.log('\nStarting experiment queue...\n')

  manager.queueExperiment('compression-v1')
  manager.queueExperiment('dsl-v1')

  manager.runQueue().then(() => {
    console.log('\n✓ All experiments completed!')
    console.log('\nFinal Status:')
    console.log(JSON.stringify(manager.getStatus(), null, 2))
  })
}
