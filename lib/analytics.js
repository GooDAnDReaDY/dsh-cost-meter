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
