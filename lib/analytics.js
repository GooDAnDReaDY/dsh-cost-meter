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