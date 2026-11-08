// dsh-cost-meter — Prometheus and OpenTelemetry metrics exporter (Issue #153)
// Standard plain-text Prometheus exposition format (version 0.0.4) for Grafana & Datadog.

export const METRICS_PATH = '/dsh-cost-meter/metrics'

function sanitizeLabel(val) {
  return String(val ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

export function renderPrometheusMetrics(options = {}) {
  const turns = Array.isArray(options.turns) ? options.turns : []
  const burnRate = options.burnRate || {}
  const budget = options.budgetStatus || {}
  const catalog = options.catalog || {}
  const activeRoute = options.activeRoute || {}

  const lines = []

  // 1. Model aggregations from turns
  const modelStats = new Map()

  for (const t of turns) {
    const model = t.model || activeRoute.model || 'unknown'
    const provider = t.provider || activeRoute.provider || ''
    const key = provider ? (provider + '/' + model) : model

    let stat = modelStats.get(key)
    if (!stat) {
      stat = {
        model,
        provider,
        costUsd: 0,
        uncachedInput: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
      }
      modelStats.set(key, stat)
    }

    stat.costUsd += Number(t.costDeltaUsd) || 0
    stat.uncachedInput += Number(t.uncachedInputTokens) || 0
    stat.output += Number(t.outputTokens) || 0
    stat.cacheRead += Number(t.cacheReadTokens) || 0
    stat.cacheWrite += Number(t.cacheWriteTokens) || 0
    stat.reasoning += Number(t.reasoningTokens) || 0
  }

  // If no turns yet, export active route with 0
  if (modelStats.size === 0 && (activeRoute.model || activeRoute.provider)) {
    const model = activeRoute.model || 'default'
    const provider = activeRoute.provider || ''
    const key = provider ? (provider + '/' + model) : model
    modelStats.set(key, {
      model,
      provider,
      costUsd: 0,
      uncachedInput: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
    })
  }

  // Cost total gauge
  lines.push('# HELP dsh_cost_total_usd Cumulative session cost in USD by model and provider')
  lines.push('# TYPE dsh_cost_total_usd gauge')
  for (const stat of modelStats.values()) {
    lines.push(`dsh_cost_total_usd{model="${sanitizeLabel(stat.model)}",provider="${sanitizeLabel(stat.provider)}"} ${stat.costUsd.toFixed(6)}`)
  }

  // Tokens counter by type
  lines.push('# HELP dsh_tokens_total Cumulative tokens processed by model, provider and type')
  lines.push('# TYPE dsh_tokens_total counter')
  for (const stat of modelStats.values()) {
    const base = `model="${sanitizeLabel(stat.model)}",provider="${sanitizeLabel(stat.provider)}"`
    lines.push(`dsh_tokens_total{${base},type="uncached_input"} ${stat.uncachedInput}`)
    lines.push(`dsh_tokens_total{${base},type="output"} ${stat.output}`)
    lines.push(`dsh_tokens_total{${base},type="cache_read"} ${stat.cacheRead}`)
    lines.push(`dsh_tokens_total{${base},type="cache_write"} ${stat.cacheWrite}`)
    if (stat.reasoning > 0) {
      lines.push(`dsh_tokens_total{${base},type="reasoning"} ${stat.reasoning}`)
    }
  }

  // Cache hit ratio gauge
  lines.push('# HELP dsh_cache_hit_ratio Proportion of input tokens served from provider prompt cache')
  lines.push('# TYPE dsh_cache_hit_ratio gauge')
  for (const stat of modelStats.values()) {
    const totalIn = stat.uncachedInput + stat.cacheRead
    const ratio = totalIn > 0 ? (stat.cacheRead / totalIn) : 0
    lines.push(`dsh_cache_hit_ratio{model="${sanitizeLabel(stat.model)}",provider="${sanitizeLabel(stat.provider)}"} ${ratio.toFixed(4)}`)
  }

  // Burn rate gauge
  lines.push('# HELP dsh_session_burn_rate_usd_hour Estimated cost burn rate per hour in USD')
  lines.push('# TYPE dsh_session_burn_rate_usd_hour gauge')
  const burnVal = Number(burnRate.burnRatePerHourUsd) || 0
  lines.push(`dsh_session_burn_rate_usd_hour ${burnVal.toFixed(4)}`)

  // Budget gauges (Issue #134 integration)
  const dailyLimit = Number(budget.dailyLimitUsd) || 0
  const dailySpent = Number(budget.dailySpentUsd) || 0
  const monthlyLimit = Number(budget.monthlyLimitUsd) || 0
  const monthlySpent = Number(budget.monthlySpentUsd) || 0

  lines.push('# HELP dsh_budget_daily_limit_usd Daily spending cap in USD (0 disables)')
  lines.push('# TYPE dsh_budget_daily_limit_usd gauge')
  lines.push(`dsh_budget_daily_limit_usd ${dailyLimit.toFixed(2)}`)

  lines.push('# HELP dsh_budget_daily_spent_usd Spend recorded today in USD')
  lines.push('# TYPE dsh_budget_daily_spent_usd gauge')
  lines.push(`dsh_budget_daily_spent_usd ${dailySpent.toFixed(4)}`)

  lines.push('# HELP dsh_budget_monthly_limit_usd Monthly spending cap in USD (0 disables)')
  lines.push('# TYPE dsh_budget_monthly_limit_usd gauge')
  lines.push(`dsh_budget_monthly_limit_usd ${monthlyLimit.toFixed(2)}`)

  lines.push('# HELP dsh_budget_monthly_spent_usd Spend recorded this month in USD')
  lines.push('# TYPE dsh_budget_monthly_spent_usd gauge')
  lines.push(`dsh_budget_monthly_spent_usd ${monthlySpent.toFixed(4)}`)

  lines.push('# HELP dsh_budget_auto_paused Whether agent execution is paused due to budget cap')
  lines.push('# TYPE dsh_budget_auto_paused gauge')
  lines.push(`dsh_budget_auto_paused ${budget.isBlocked ? 1 : 0}`)

  // Catalog status
  if (catalog.fetchedAt) {
    const modelsCount = (catalog.index && catalog.index.byId) ? Object.keys(catalog.index.byId).length : 0
    lines.push('# HELP dsh_catalog_models_total Number of models indexed from pricing catalog')
    lines.push('# TYPE dsh_catalog_models_total gauge')
    lines.push(`dsh_catalog_models_total ${modelsCount}`)

    lines.push('# HELP dsh_catalog_last_sync_timestamp_seconds Timestamp of last pricing catalog sync')
    lines.push('# TYPE dsh_catalog_last_sync_timestamp_seconds gauge')
    lines.push(`dsh_catalog_last_sync_timestamp_seconds ${Math.floor(catalog.fetchedAt / 1000)}`)
  }

  return lines.join('\n') + '\n'
}
