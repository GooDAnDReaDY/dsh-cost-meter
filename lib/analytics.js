// dsh-cost-meter — burn rate calculation and cost projection.

/**
 * Calculates burn rate ($/hour) and projected total session cost ($)
 * from recorded turns and current session cost.
 *
 * @param {Array<{ turn: number, step?: number, tokens: number, costDeltaUsd?: number, timestamp: number }>} turns
 * @param {number} totalCostUsd Current total cost of session in USD
 * @param {object} [options]
 * @param {number} [options.now] Current timestamp (ms)
 * @param {number} [options.windowMs] Recent window (default 10 mins = 600,000ms)
 * @returns {{ burnRatePerHourUsd: number, projectedCostUsd: number, confidence: 'low' | 'medium' | 'high' }}
 */
export function calculateBurnRateAndProjection(turns, totalCostUsd, options = {}) {
  const currentTotal = Number(totalCostUsd) > 0 ? Number(totalCostUsd) : 0
  if (!Array.isArray(turns) || turns.length < 2) {
    return {
      burnRatePerHourUsd: 0,
      projectedCostUsd: currentTotal,
      confidence: 'low',
    }
  }

  const now = typeof options.now === 'number' && Number.isFinite(options.now) ? options.now : Date.now()
  const windowMs = typeof options.windowMs === 'number' && options.windowMs > 0 ? options.windowMs : 10 * 60 * 1000

  // Filter or take recent turns
  const sorted = turns
    .filter((t) => t && typeof t.timestamp === 'number' && Number.isFinite(t.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (sorted.length < 2) {
    return {
      burnRatePerHourUsd: 0,
      projectedCostUsd: currentTotal,
      confidence: 'low',
    }
  }

  // Pick turns in window or last N turns
  let sample = sorted.filter((t) => t.timestamp >= now - windowMs)
  if (sample.length < 2) {
    sample = sorted.slice(-Math.min(sorted.length, 10))
  }

  const firstTime = sample[0].timestamp
  const lastTime = sample[sample.length - 1].timestamp
  const durationMs = lastTime - firstTime

  // Guard against near-zero time duration (< 5 seconds) to avoid division by zero
  if (durationMs < 5000) {
    return {
      burnRatePerHourUsd: 0,
      projectedCostUsd: currentTotal,
      confidence: 'low',
    }
  }

  // Cost incurred in sample window
  let costInSample = sample.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || 0), 0)
  // If individual turns don't have costDeltaUsd, proportion cost by tokens
  if (costInSample <= 0 && currentTotal > 0) {
    const totalTokens = sorted.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
    const sampleTokens = sample.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
    costInSample = totalTokens > 0 ? (sampleTokens / totalTokens) * currentTotal : currentTotal
  }

  const hours = durationMs / (1000 * 60 * 60)
  let rawBurnRate = hours > 0 ? (costInSample / hours) : 0

  // Sanitize burn rate
  if (!Number.isFinite(rawBurnRate) || rawBurnRate < 0) rawBurnRate = 0
  const burnRatePerHourUsd = Math.round(rawBurnRate * 10000) / 10000

  // Project final cost based on trend and remaining steps
  const stepCount = sorted.length
  const avgCostPerStep = currentTotal / stepCount

  // Estimate extra cost based on burn rate and step trend
  const projectedExtra = Math.min(
    currentTotal * 2, // at most 2x current cost added
    Math.max(avgCostPerStep * 3, burnRatePerHourUsd * 0.25),
  )

  const projectedCostUsd = Math.round((currentTotal + (projectedExtra > 0 ? projectedExtra : 0)) * 10000) / 10000
  const confidence = stepCount >= 10 ? 'high' : (stepCount >= 5 ? 'medium' : 'low')

  return {
    burnRatePerHourUsd,
    projectedCostUsd,
    confidence,
  }
}

/**
 * Returns estimated context window token limit for model identifier.
 */
export function getFallbackContextLength(model) {
  const m = String(model || '').toLowerCase()
  if (m.includes('claude-3-5') || m.includes('claude-3-7') || m.includes('claude-3-opus')) return 200000
  if (m.includes('claude')) return 200000
  if (m.includes('gemini-1.5') || m.includes('gemini-2.0') || m.includes('gemini-exp')) return 1000000
  if (m.includes('gpt-4.1') || m.includes('gpt-4o') || m.includes('o1') || m.includes('o3')) return 128000
  if (m.includes('qwen-2.5') || m.includes('qwq')) return 128000
  if (m.includes('deepseek')) return 128000
  return 128000
}

/**
 * Calculates context window saturation metrics and compaction risk.
 *
 * @param {Array<{ turn: number, uncachedInputTokens?: number, cacheReadTokens?: number }>} turns
 * @param {object} [tariff]
 * @param {object} [route]
 * @returns {{ currentTokens: number, contextLength: number, saturationPercent: number, riskLevel: 'low' | 'moderate' | 'high', nextTurnEstUsd: number }}
 */
export function calculateContextMetrics(turns, tariff, route) {
  const lastTurn = (Array.isArray(turns) && turns.length > 0) ? turns[turns.length - 1] : null
  const currentTokens = lastTurn
    ? (Number(lastTurn.uncachedInputTokens || 0) + Number(lastTurn.cacheReadTokens || 0))
    : 0

  const contextLength = (tariff && Number(tariff.contextLength)) || getFallbackContextLength(route?.model)
  const saturationPercent = contextLength > 0
    ? Math.min(100, Math.round((currentTokens / contextLength) * 100))
    : 0

  let riskLevel = 'low'
  if (saturationPercent >= 80) {
    riskLevel = 'high'
  } else if (saturationPercent >= 50) {
    riskLevel = 'moderate'
  }

  const rates = tariff?.schedule?.base || {}
  const inputRate = Number(rates.input) || 0.14
  const nextTurnEstUsd = currentTokens > 0
    ? Number(((currentTokens * inputRate) / 1e6).toFixed(6))
    : 0

  return {
    currentTokens,
    contextLength,
    saturationPercent,
    riskLevel,
    nextTurnEstUsd,
  }
}

/**
 * Calculates spending velocity ($/min) and detects anomalous runaway loops.
 *
 * @param {Array<{ turn: number, step?: number, tokens: number, costUsd?: number, costDeltaUsd?: number, timestamp: number }>} turns
 * @param {number} [totalCostUsd]
 * @param {object} [options]
 * @param {number} [options.now]
 * @param {number} [options.windowMs]
 * @returns {{ velocityPerMin: number, recentAvgCostPerStep: number, isAnomaly: boolean, severity: 'normal' | 'warning' | 'critical' }}
 */
export function calculateCostVelocity(turns, totalCostUsd = 0, options = {}) {
  const currentTotal = Number(totalCostUsd) > 0 ? Number(totalCostUsd) : 0
  if (!Array.isArray(turns) || turns.length < 2) {
    return {
      velocityPerMin: 0,
      recentAvgCostPerStep: 0,
      isAnomaly: false,
      severity: 'normal',
    }
  }

  const now = typeof options.now === 'number' && Number.isFinite(options.now) ? options.now : Date.now()
  const windowMs = typeof options.windowMs === 'number' && options.windowMs > 0 ? options.windowMs : 60 * 1000 // 1 minute window

  const sorted = turns
    .filter((t) => t && typeof t.timestamp === 'number' && Number.isFinite(t.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (sorted.length < 2) {
    return {
      velocityPerMin: 0,
      recentAvgCostPerStep: 0,
      isAnomaly: false,
      severity: 'normal',
    }
  }

  // Turns in the recent window
  const inWindow = sorted.filter((t) => t.timestamp >= now - windowMs)
  let costInWindow = 0
  let durationMinutes = 1.0

  if (inWindow.length >= 2) {
    costInWindow = inWindow.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || Number(t.costUsd) || 0), 0)
    const spanMs = inWindow[inWindow.length - 1].timestamp - inWindow[0].timestamp
    durationMinutes = Math.max(0.1, spanMs / 60000)
  } else {
    // Fallback: take the last 2 turns if recent (< 3 mins)
    const recentSample = sorted.slice(-2)
    const spanMs = now - recentSample[0].timestamp
    if (spanMs <= 180000 && spanMs > 0) {
      costInWindow = Number(recentSample[1].costDeltaUsd) || Number(recentSample[1].costUsd) || 0
      durationMinutes = spanMs / 60000
    }
  }

  const rawVelocity = durationMinutes > 0 ? (costInWindow / durationMinutes) : 0
  const velocityPerMin = Math.max(0, Number(rawVelocity.toFixed(4)))

  // Recent 3 steps average cost
  const recentSteps = sorted.slice(-3)
  const recentStepsCost = recentSteps.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || Number(t.costUsd) || 0), 0)
  const recentAvgCostPerStep = recentSteps.length > 0 ? Number((recentStepsCost / recentSteps.length).toFixed(4)) : 0

  // Session average step cost
  const totalTurnsCost = sorted.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || Number(t.costUsd) || 0), 0)
  const baseCost = Math.max(currentTotal, totalTurnsCost)
  const sessionAvgStepCost = sorted.length > 0 ? baseCost / sorted.length : 0

  // Anomaly checks
  // 1) Fast spending velocity: >= $0.50 / min with non-trivial step cost (>= $0.10)
  const highVelocity = velocityPerMin >= 0.50 && recentAvgCostPerStep >= 0.10
  // 2) Runaway spike vs session baseline: recent avg >= 3x session avg and >= $0.20
  const runawaySpike = sorted.length >= 3 && recentAvgCostPerStep >= 0.20 && (recentAvgCostPerStep >= 3 * sessionAvgStepCost)
  // 3) High absolute step cost threshold: >= $0.40 per step over last 3 steps
  const highStepCost = recentSteps.length >= 3 && recentAvgCostPerStep >= 0.40

  const isAnomaly = Boolean(highVelocity || runawaySpike || highStepCost)
  let severity = 'normal'
  if (isAnomaly) {
    severity = (velocityPerMin >= 1.0 || recentAvgCostPerStep >= 0.50) ? 'critical' : 'warning'
  }

  return {
    velocityPerMin,
    recentAvgCostPerStep,
    isAnomaly,
    severity,
  }
}

/**
 * Analyzes the structural anatomy of prompt tokens across categories.
 *
 * @param {Array<object>} turns Recorded session turns
 * @param {number} currentTokens Total active context tokens
 * @returns {{ systemTokens: number, toolsTokens: number, historyTokens: number, attachmentsTokens: number, percentages: { system: number, tools: number, history: number, attachments: number }, totalTokens: number }}
 */
export function analyzePromptAnatomy(turns, currentTokens = 0) {
  const total = Number(currentTokens) > 0 ? Number(currentTokens) : 0
  if (!Array.isArray(turns) || turns.length === 0 || total === 0) {
    return {
      systemTokens: 0,
      toolsTokens: 0,
      historyTokens: 0,
      attachmentsTokens: 0,
      percentages: { system: 0, tools: 0, history: 0, attachments: 0 },
      totalTokens: 0,
    }
  }

  const turn1 = turns[0]
  const turn1Tokens = (Number(turn1.uncachedInputTokens) || 0) + (Number(turn1.cacheReadTokens) || 0) || Number(turn1.tokens) || 2500

  // System instructions: ~35% of turn 1 base, bounded [500, 3500]
  const systemTokens = Math.min(Math.max(500, Math.round(turn1Tokens * 0.35)), Math.min(3500, total))
  // Tools & plugins schemas: ~45% of turn 1 base, bounded [800, 6000]
  const toolsTokens = Math.min(Math.max(800, Math.round(turn1Tokens * 0.45)), Math.max(0, Math.min(6000, total - systemTokens)))
  const baseTokens = systemTokens + toolsTokens

  let historyTokens = 0
  let attachmentsTokens = 0

  if (turns.length > 1) {
    // History is composed of assistant outputs and earlier turns
    const pastOutputs = turns.slice(0, -1).reduce((acc, t) => acc + (Number(t.outputTokens) || 0), 0)
    const estimatedHistory = Math.round(pastOutputs * 1.4)
    historyTokens = Math.min(estimatedHistory, Math.max(0, total - baseTokens))
    attachmentsTokens = Math.max(0, total - baseTokens - historyTokens)
  } else {
    attachmentsTokens = Math.max(0, total - baseTokens)
  }

  const systemPct = Math.round((systemTokens / total) * 100)
  const toolsPct = Math.round((toolsTokens / total) * 100)
  const historyPct = Math.round((historyTokens / total) * 100)
  const attachmentsPct = Math.max(0, 100 - systemPct - toolsPct - historyPct)

  return {
    systemTokens,
    toolsTokens,
    historyTokens,
    attachmentsTokens,
    percentages: {
      system: systemPct,
      tools: toolsPct,
      history: historyPct,
      attachments: attachmentsPct,
    },
    totalTokens: total,
  }
}

/**
 * Detects redundant token waste and loop patterns in conversation history.
 *
 * @param {Array<object>} turns Recorded session turns
 * @param {number} [totalCostUsd] Current session cost
 * @param {object} [tariff]
 * @returns {{ wasteTokens: number, wasteCostUsd: number, hasWaste: boolean, redundantTurnsCount: number, recommendation: 'prune' | 'compact' | 'none' }}
 */
export function detectTokenWaste(turns, totalCostUsd = 0, tariff = null) {
  if (!Array.isArray(turns) || turns.length < 3) {
    return {
      wasteTokens: 0,
      wasteCostUsd: 0,
      hasWaste: false,
      redundantTurnsCount: 0,
      recommendation: 'none',
    }
  }

  let wasteTokens = 0
  let redundantTurnsCount = 0

  // Scan consecutive turns for near-identical massive inputs (> 4000 tokens)
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1]
    const curr = turns[i]

    const prevTokens = Number(prev.tokens) || (Number(prev.uncachedInputTokens) || 0) + (Number(prev.outputTokens) || 0)
    const currTokens = Number(curr.tokens) || (Number(curr.uncachedInputTokens) || 0) + (Number(curr.outputTokens) || 0)

    // Check if token difference is within 3% and both are large (> 4000 tokens)
    if (prevTokens > 4000 && currTokens > 4000) {
      const delta = Math.abs(currTokens - prevTokens)
      if (delta <= Math.max(50, currTokens * 0.03)) {
        // Redundant repeat of large context/file dump
        wasteTokens += Math.round(currTokens * 0.6)
        redundantTurnsCount++
      }
    }
  }

  const inputRate = Number(tariff?.schedule?.base?.input) || 0.14
  const wasteCostUsd = Number(((wasteTokens * inputRate) / 1e6).toFixed(4))
  const hasWaste = wasteTokens >= 2500

  let recommendation = 'none'
  if (wasteTokens >= 15000) {
    recommendation = 'compact'
  } else if (wasteTokens >= 2500) {
    recommendation = 'prune'
  }

  return {
    wasteTokens,
    wasteCostUsd,
    hasWaste,
    redundantTurnsCount,
    recommendation,
  }
}

/**
 * Reference models pricing per 1M tokens for What-If simulator.
 */
export const REFERENCE_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3', inputUncached: 0.14, inputCached: 0.014, output: 0.28 },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', inputUncached: 0.55, inputCached: 0.14, output: 2.19 },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', inputUncached: 3.00, inputCached: 0.30, output: 15.00 },
  { id: 'gpt-4o', name: 'GPT-4o', inputUncached: 2.50, inputCached: 1.25, output: 10.00 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputUncached: 0.15, inputCached: 0.075, output: 0.60 },
]

/**
 * Simulates session cost across reference models using recorded turn tokens.
 *
 * @param {Array<object>} turns Recorded session turns
 * @param {number} [actualCostUsd] Current actual session spend
 * @param {string} [currentModel] Identifier of active model
 * @returns {{ comparisons: Array<{ id: string, name: string, simulatedCostUsd: number, diffUsd: number, diffPercent: number, savingsUsd: number, isCheaper: boolean, isCurrent: boolean }>, totalUncached: number, totalCached: number, totalOutput: number, totalTokens: number, actualCostUsd: number, bestSavingsVsSonnet: { savingsUsd: number, savingsPercent: number } | null }}
 */
export function simulateModelCosts(turns, actualCostUsd = 0, currentModel = '') {
  const actual = Number(actualCostUsd) > 0 ? Number(actualCostUsd) : 0
  if (!Array.isArray(turns) || turns.length === 0) {
    return {
      comparisons: [],
      totalUncached: 0,
      totalCached: 0,
      totalOutput: 0,
      totalTokens: 0,
      actualCostUsd: actual,
      bestSavingsVsSonnet: null,
    }
  }

  let totalUncached = 0
  let totalCached = 0
  let totalOutput = 0

  for (const t of turns) {
    if (!t) continue
    const uncached = Number(t.uncachedInputTokens) || 0
    const cached = Number(t.cacheReadTokens) || 0
    const out = Number(t.outputTokens) || 0
    totalUncached += uncached
    totalCached += cached
    totalOutput += out
  }

  // Fallback if detailed token breakdown wasn't recorded
  if (totalUncached === 0 && totalCached === 0 && totalOutput === 0) {
    const rawTokens = turns.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
    totalCached = Math.round(rawTokens * 0.70)
    totalUncached = Math.round(rawTokens * 0.20)
    totalOutput = Math.max(0, rawTokens - totalCached - totalUncached)
  }

  const totalTokens = totalUncached + totalCached + totalOutput
  const normCurrent = String(currentModel || '').toLowerCase()

  const comparisons = REFERENCE_MODELS.map((ref) => {
    const simCost = (
      (totalUncached * ref.inputUncached) / 1e6 +
      (totalCached * ref.inputCached) / 1e6 +
      (totalOutput * ref.output) / 1e6
    )
    const simulatedCostUsd = Number(simCost.toFixed(4))
    const diffUsd = Number((simulatedCostUsd - actual).toFixed(4))
    const diffPercent = actual > 0 ? Math.round(((simulatedCostUsd - actual) / actual) * 100) : 0
    const savingsUsd = Number(Math.max(0, simulatedCostUsd - actual).toFixed(4))
    const isCheaper = simulatedCostUsd < actual
    const isCurrent = normCurrent.includes(ref.id) || (ref.id === 'deepseek-chat' && (normCurrent.includes('v3') || normCurrent.includes('chat') || !normCurrent))

    return {
      id: ref.id,
      name: ref.name,
      simulatedCostUsd,
      diffUsd,
      diffPercent,
      savingsUsd,
      isCheaper,
      isCurrent,
    }
  })

  // Calculate savings vs Claude 3.5 Sonnet
  const sonnetComp = comparisons.find((c) => c.id === 'claude-3-5-sonnet')
  let bestSavingsVsSonnet = null
  if (sonnetComp && sonnetComp.simulatedCostUsd > actual && actual > 0) {
    const savingsUsd = Number((sonnetComp.simulatedCostUsd - actual).toFixed(4))
    const savingsPercent = Math.round((savingsUsd / sonnetComp.simulatedCostUsd) * 100)
    bestSavingsVsSonnet = { savingsUsd, savingsPercent }
  }

  return {
    comparisons,
    totalUncached,
    totalCached,
    totalOutput,
    totalTokens,
    actualCostUsd: actual,
    bestSavingsVsSonnet,
  }
}

/**
 * Extracts per-turn burn rate time series for sparkline visualization.
 *
 * @param {Array<object>} turns Recorded session turns
 * @returns {Array<{ turn: number, step: number, tokens: number, uncached: number, cached: number, output: number, costDeltaUsd: number, cumulativeCostUsd: number, isSpike: boolean }>}
 */
export function getBurnRateSeries(turns) {
  if (!Array.isArray(turns) || turns.length === 0) return []

  let cumCost = 0
  const series = []
  let sumTokens = 0

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]
    if (!t) continue
    const uncached = Number(t.uncachedInputTokens) || 0
    const cached = Number(t.cacheReadTokens) || 0
    const out = Number(t.outputTokens) || 0
    const tok = uncached + cached + out || Number(t.tokens) || 0
    const cost = Number(t.costDeltaUsd) || 0
    cumCost += cost
    sumTokens += tok

    series.push({
      turn: t.turn || i + 1,
      step: t.step || i + 1,
      tokens: tok,
      uncached,
      cached,
      output: out,
      costDeltaUsd: Number(cost.toFixed(4)),
      cumulativeCostUsd: Number(cumCost.toFixed(4)),
      isSpike: false,
    })
  }

  // Mark spikes if turn token count is > 2.2x average or > 12,000 tokens
  const avg = sumTokens / series.length
  for (let i = 0; i < series.length; i++) {
    if (series[i].tokens >= Math.max(12000, avg * 2.2)) {
      series[i].isSpike = true
    }
  }

  return series
}

/**
 * Calculates predictive final session cost trajectory with confidence intervals.
 *
 * @param {Array<object>} turns Recorded session turns
 * @param {number} totalCostUsd Current session cost in USD
 * @param {object} [options]
 * @returns {{ projectedCostUsd: number, minCostUsd: number, maxCostUsd: number, confidence: 'low' | 'medium' | 'high', trajectoryTrend: 'accelerating' | 'stable' | 'decelerating', estimatedRemainingSteps: number }}
 */
export function calculateAdvancedTrajectoryForecast(turns, totalCostUsd = 0, options = {}) {
  const currentTotal = Number(totalCostUsd) > 0 ? Number(totalCostUsd) : 0
  if (!Array.isArray(turns) || turns.length < 2) {
    return {
      projectedCostUsd: currentTotal,
      minCostUsd: currentTotal,
      maxCostUsd: currentTotal,
      confidence: 'low',
      trajectoryTrend: 'stable',
      estimatedRemainingSteps: 0,
    }
  }

  const n = turns.length
  const stepCosts = turns.map((t) => Number(t.costDeltaUsd) || 0)
  const avgCostPerStep = currentTotal > 0 ? (currentTotal / n) : 0.001

  // Analyze acceleration / deceleration
  const mid = Math.floor(n / 2)
  const firstHalfAvg = stepCosts.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid)
  const secondHalfAvg = stepCosts.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, n - mid)

  let trajectoryTrend = 'stable'
  let trendFactor = 1.0
  if (secondHalfAvg > firstHalfAvg * 1.35 && secondHalfAvg >= 0.001) {
    trajectoryTrend = 'accelerating'
    trendFactor = 1.3
  } else if (secondHalfAvg < firstHalfAvg * 0.75 && firstHalfAvg >= 0.001) {
    trajectoryTrend = 'decelerating'
    trendFactor = 0.8
  }

  // Estimate remaining steps based on current session stage
  let estimatedRemainingSteps = 6
  if (n <= 3) estimatedRemainingSteps = 10
  else if (n <= 8) estimatedRemainingSteps = 7
  else if (n <= 16) estimatedRemainingSteps = 4
  else estimatedRemainingSteps = 3

  const recentCount = Math.min(4, n)
  const recentSlice = stepCosts.slice(-recentCount)
  const recentAvg = (recentSlice.reduce((a, b) => a + b, 0) / recentCount) || avgCostPerStep

  const baselineRate = Math.max(0.0005, recentAvg) * trendFactor
  const projectedExtra = estimatedRemainingSteps * baselineRate

  const projectedCostUsd = Number((currentTotal + projectedExtra).toFixed(4))
  const minCostUsd = Number((currentTotal + (projectedExtra * 0.70)).toFixed(4))
  const maxCostUsd = Number((currentTotal + (projectedExtra * 1.45)).toFixed(4))

  let confidence = 'low'
  if (n >= 8) confidence = 'high'
  else if (n >= 4) confidence = 'medium'

  return {
    projectedCostUsd,
    minCostUsd,
    maxCostUsd,
    confidence,
    trajectoryTrend,
    estimatedRemainingSteps,
  }
}

/**
 * Evaluates dynamic context pruning triggers and identifies bloated past turns.
 *
 * @param {Array<object>} turns Recorded session turns
 * @param {number} currentTokens Active context window tokens
 * @param {number} contextLength Model context limit
 * @param {number} [totalCostUsd]
 * @param {object} [tariff]
 * @returns {{ shouldPrune: boolean, reason: 'critical_saturation' | 'large_overhead' | 'moderate_overhead' | 'none', prunableTokens: number, savingsPerTurnUsd: number, candidateSteps: number[], formattedSteps: string }}
 */
export function evaluatePruningTriggers(turns, currentTokens = 0, contextLength = 128000, totalCostUsd = 0, tariff = null) {
  const emptyRes = {
    shouldPrune: false,
    reason: 'none',
    prunableTokens: 0,
    savingsPerTurnUsd: 0,
    candidateSteps: [],
    formattedSteps: '',
  }

  if (!Array.isArray(turns) || turns.length < 3) return emptyRes

  const currentTok = Number(currentTokens) || 0
  const maxLen = Number(contextLength) || 128000
  const saturationRatio = maxLen > 0 ? (currentTok / maxLen) : 0

  const candidateSteps = []
  let prunableTokens = 0

  // Search past steps (excluding the last 2 recent turns) for heavy memory footprints (> 4500 tokens)
  for (let i = 0; i < turns.length - 2; i++) {
    const t = turns[i]
    if (!t) continue
    const uncached = Number(t.uncachedInputTokens) || 0
    const out = Number(t.outputTokens) || 0
    const tok = uncached + out || Number(t.tokens) || 0

    if (tok >= 4500) {
      candidateSteps.push(t.step || i + 1)
      prunableTokens += Math.max(1000, Math.round(tok * 0.75))
    }
  }

  const inputRate = Number(tariff?.schedule?.base?.input) || 0.14
  const savingsPerTurnUsd = Number(((prunableTokens * inputRate) / 1e6).toFixed(4))

  let shouldPrune = false
  let reason = 'none'

  if (saturationRatio >= 0.75 || prunableTokens >= 15000) {
    shouldPrune = true
    reason = saturationRatio >= 0.75 ? 'critical_saturation' : 'large_overhead'
  } else if (prunableTokens >= 6000 || saturationRatio >= 0.60) {
    shouldPrune = true
    reason = 'moderate_overhead'
  }

  const formattedSteps = candidateSteps.length > 0 ? ('#' + candidateSteps.join(', #')) : ''

  return {
    shouldPrune,
    reason,
    prunableTokens,
    savingsPerTurnUsd,
    candidateSteps,
    formattedSteps,
  }
}

/**
 * Captures an automated diagnostic snapshot when an anomalous spending velocity spike occurs.
 *
 * @param {Array<object>} turns
 * @param {object} anomalyInfo Cost velocity anomaly details
 * @param {object} [modelRoute] Active route details
 * @param {object} [options]
 * @returns {{ id: string, timestamp: number, isoTime: string, turn: number, step: number, velocityPerMin: number, severity: string, reason: string, tokensDelta: number, largestStepCostUsd: number, model: string, provider: string, summary: string }}
 */
export function captureDiagnosticSnapshot(turns, anomalyInfo = {}, modelRoute = {}, options = {}) {
  const now = options.now || Date.now()
  const lastTurn = (Array.isArray(turns) && turns.length > 0) ? turns[turns.length - 1] : {}
  const turnIndex = lastTurn.turn || (Array.isArray(turns) ? turns.length : 1)
  const stepIndex = lastTurn.step || turnIndex

  const vel = Number(anomalyInfo.velocityPerMin) || 0
  const sev = anomalyInfo.severity || 'warning'

  let largestStepCostUsd = 0
  let biggestTurnTok = 0
  if (Array.isArray(turns)) {
    for (const t of turns) {
      if (!t) continue
      const cost = Number(t.costDeltaUsd) || 0
      if (cost > largestStepCostUsd) largestStepCostUsd = cost
      const tok = (Number(t.uncachedInputTokens) || 0) + (Number(t.outputTokens) || 0) || Number(t.tokens) || 0
      if (tok > biggestTurnTok) biggestTurnTok = tok
    }
  }

  const tokDelta = (Number(lastTurn.uncachedInputTokens) || 0) + (Number(lastTurn.outputTokens) || 0) || Number(lastTurn.tokens) || biggestTurnTok

  const reason = anomalyInfo.velocityPerMin >= 1.0
    ? 'Critical cost velocity spike'
    : (largestStepCostUsd >= 0.40 ? 'High absolute step cost threshold' : 'Sudden token acceleration')

  const model = modelRoute?.model || 'unknown'
  const provider = modelRoute?.provider || ''

  const summary = `Turn #${turnIndex}: ${reason} ($${vel.toFixed(4)}/min, max step cost ~$${largestStepCostUsd.toFixed(4)}) on ${model}`

  return {
    id: `snap-${now}-${turnIndex}`,
    timestamp: now,
    isoTime: new Date(now).toISOString(),
    turn: turnIndex,
    step: stepIndex,
    velocityPerMin: vel,
    severity: sev,
    reason,
    tokensDelta: tokDelta,
    largestStepCostUsd: Number(largestStepCostUsd.toFixed(4)),
    model,
    provider,
    summary,
  }
}
