// dsh-cost-meter — prompt cache optimization advisor (Issue #130).
// Provides actionable heuristics when cache hit ratio is suboptimal (< 40% on >= 5 turns).

/**
 * Analyzes prompt cache efficiency across turns and provides proactive optimization advice.
 * Triggers recommendation if turns >= 5 and cache hit rate < 40%.
 */
export function analyzeCacheEfficiency(turns = [], options = {}) {
  const minTurns = typeof options.minTurns === 'number' ? options.minTurns : 5
  const suboptimalThreshold = typeof options.threshold === 'number' ? options.threshold : 40

  if (!Array.isArray(turns) || turns.length < minTurns) {
    return {
      hasRecommendation: false,
      status: 'collecting_data',
      hitRate: 0,
      turnCount: Array.isArray(turns) ? turns.length : 0,
      minTurns,
      potentialSavingsPct: 0,
      tipKey: null,
      tipText: '',
      estimatedSavingsUsd: 0,
    }
  }

  let totalPromptTokens = 0
  let totalCacheReadTokens = 0
  let validTurnsCount = 0

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]
    if (!t) continue
    const uncached = Number(t.uncachedInputTokens) || 0
    const cached = Number(t.cacheReadTokens) || 0
    const prompt = uncached + cached
    if (prompt > 0 || (Number(t.tokens) || 0) > 0) {
      totalPromptTokens += prompt
      totalCacheReadTokens += cached
      validTurnsCount += 1
    }
  }

  if (validTurnsCount < minTurns || totalPromptTokens === 0) {
    return {
      hasRecommendation: false,
      status: 'collecting_data',
      hitRate: 0,
      turnCount: validTurnsCount,
      minTurns,
      potentialSavingsPct: 0,
      tipKey: null,
      tipText: '',
      estimatedSavingsUsd: 0,
    }
  }

  const hitRate = Math.round((totalCacheReadTokens / totalPromptTokens) * 100)

  if (hitRate >= 70) {
    return {
      hasRecommendation: false,
      status: 'optimal',
      hitRate,
      turnCount: validTurnsCount,
      minTurns,
      potentialSavingsPct: 0,
      tipKey: null,
      tipText: '',
      estimatedSavingsUsd: 0,
    }
  }

  if (hitRate >= suboptimalThreshold) {
    return {
      hasRecommendation: false,
      status: 'moderate',
      hitRate,
      turnCount: validTurnsCount,
      minTurns,
      potentialSavingsPct: 20,
      tipKey: null,
      tipText: '',
      estimatedSavingsUsd: 0,
    }
  }

  // hitRate < 40% with >= 5 turns -> Suboptimal, trigger advisor tip
  // Potential savings estimation: bringing cache hit rate to 80% from current hit rate
  // Roughly 40-50% savings on input token costs
  const uncachedPortion = totalPromptTokens - totalCacheReadTokens
  // Baseline assumption for input pricing approx $0.30 - $2.00 / 1M tokens
  const estimatedSavingsUsd = Number(((uncachedPortion * 0.5 * 0.5) / 1e6).toFixed(4))

  return {
    hasRecommendation: true,
    status: 'suboptimal',
    hitRate,
    turnCount: validTurnsCount,
    minTurns,
    potentialSavingsPct: 50,
    tipKey: 'advisor.cache_tip',
    tipText: 'Tip: Pin static system prompts and tool schemas at the head of your context to increase cache hit ratio to 80%+ and cut costs by up to 50%.',
    estimatedSavingsUsd: Math.max(0.0001, estimatedSavingsUsd),
  }
}
