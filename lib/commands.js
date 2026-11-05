// dsh-cost-meter — slash command /cost and receipt generator (Issue #125).

export function formatNumber(num) {
  if (typeof num !== 'number' || Number.isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function formatMoney(amount, currency = '$') {
  const n = Number(amount) || 0
  if (n === 0) return `${currency}0.00`
  if (n < 0.0001) return `${currency}${n.toExponential(2)}`
  if (n < 0.1) return `${currency}${n.toFixed(4)}`
  return `${currency}${n.toFixed(2)}`
}

/**
 * Format structured receipt markdown from session spend stats.
 */
export function formatCostReceipt(data) {
  const {
    model = 'unknown',
    provider = '',
    currency = '$',
    fx = 1,
    costUsd = 0,
    tokens = {},
    cacheSavingsUsd = 0,
    cacheSavingsPercent = 0,
    tier = 'Standard',
    rates = {},
    burnRatePerHourUsd = 0,
    projectedCostUsd = 0,
    turnsCount = 0,
  } = data || {}

  const totalCost = costUsd * fx
  const uncachedInput = Number(tokens.uncachedInputTokens || tokens.inputTokens) || 0
  const output = Number(tokens.outputTokens) || 0
  const cacheRead = Number(tokens.cacheReadTokens) || 0
  const cacheWrite = Number(tokens.cacheWriteTokens) || 0
  const totalTokens = uncachedInput + output + cacheRead + cacheWrite

  const totalPromptTokens = uncachedInput + cacheRead
  const cacheHitRate = totalPromptTokens > 0
    ? Math.round((cacheRead / totalPromptTokens) * 100)
    : 0

  const routeLabel = provider ? `${provider}/${model}` : model

  const lines = [
    `### 🧾 Cost Meter — Session Spend Receipt`,
    ``,
    `| Metric | Value |`,
    `| :--- | :--- |`,
    `| **Model** | \`${routeLabel}\` |`,
    `| **Session Spend** | **${formatMoney(totalCost, currency)}** |`,
    `| **Total Tokens** | ${formatNumber(totalTokens)} (${turnsCount} ${turnsCount === 1 ? 'turn' : 'turns'}) |`,
    `| **Uncached Input** | ${formatNumber(uncachedInput)} |`,
    `| **Prompt Cache Read** | ${formatNumber(cacheRead)} (${cacheHitRate}% hit rate) |`,
    `| **Output Tokens** | ${formatNumber(output)} |`,
  ]

  if (cacheWrite > 0) {
    lines.push(`| **Cache Write** | ${formatNumber(cacheWrite)} |`)
  }

  if (cacheSavingsUsd > 0) {
    lines.push(`| **Cache Savings** | **≈ ${formatMoney(cacheSavingsUsd * fx, currency)}** (${cacheSavingsPercent}% saved) |`)
  }

  lines.push(`| **Tariff Tier** | ${tier} |`)

  if (rates.input !== undefined) {
    const inR = rates.input ? `$${rates.input}/1M` : '—'
    const outR = rates.output ? `$${rates.output}/1M` : '—'
    const hitR = rates.cacheHit ? `$${rates.cacheHit}/1M` : '—'
    lines.push(`| **Rates (1M tok)** | In ${inR} · Out ${outR} · Cache ${hitR} |`)
  }

  if (burnRatePerHourUsd > 0) {
    lines.push(`| **Burn Rate** | ≈ ${formatMoney(burnRatePerHourUsd * fx, currency)}/hr (proj. ${formatMoney(projectedCostUsd * fx, currency)}) |`)
  }

  return lines.join('\n')
}

/**
 * Format compact 1-line or 2-line summary.
 */
export function formatCostSummary(data) {
  const {
    model = 'model',
    currency = '$',
    fx = 1,
    costUsd = 0,
    tokens = {},
    cacheSavingsPercent = 0,
  } = data || {}

  const totalCost = costUsd * fx
  const uncachedInput = Number(tokens.uncachedInputTokens || tokens.inputTokens) || 0
  const output = Number(tokens.outputTokens) || 0
  const cacheRead = Number(tokens.cacheReadTokens) || 0
  const totalTokens = uncachedInput + output + cacheRead
  const totalPrompt = uncachedInput + cacheRead
  const cacheHit = totalPrompt > 0 ? Math.round((cacheRead / totalPrompt) * 100) : 0

  return `💰 **Cost Meter**: ≈ ${formatMoney(totalCost, currency)} · ${formatNumber(totalTokens)} tokens (${cacheHit}% cache hit) · \`${model}\``
}

/**
 * Register DSH slash command /cost and /cost-summary.
 */
export function registerSlashCommand(ctx, options) {
  if (typeof ctx?.inject !== 'function') return
  const {
    getCurrentConfig,
    getCachedTariff,
    getLastTurns,
    resetLastTurns,
    calculateBurnRateAndProjection,
    calculateCacheSavings,
    ratesAt,
    splitRoute,
    defaultRoute,
  } = options || {}

  ctx.inject(['commands'], (cmdCtx) => {
    const commands = cmdCtx.commands
    if (typeof commands?.register !== 'function') return

    const executeCommand = async (rawArgs) => {
      try {
        const subcmd = String(rawArgs || '').trim().toLowerCase().split(/\s+/)[0] || 'receipt'
        const cfg = typeof getCurrentConfig === 'function' ? getCurrentConfig() : {}
        const currency = cfg.currency || '$'
        const fx = Number(cfg.usdRate) || 1
        const route = defaultRoute ? (defaultRoute(ctx) || { model: 'default' }) : { model: 'default' }
        const tariff = typeof getCachedTariff === 'function' ? getCachedTariff(cfg, route) : null
        const schedule = tariff?.schedule
        const minute = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes()) % 1440
        const activeRates = (schedule && typeof ratesAt === 'function')
          ? ratesAt(schedule, minute)
          : (schedule?.base || {})

        const turns = typeof getLastTurns === 'function' ? getLastTurns() : []

        if (subcmd === 'reset') {
          if (typeof resetLastTurns === 'function') resetLastTurns()
          return '✨ Cost Meter: session turn spend history has been reset.'
        }

        if (subcmd === 'help') {
          return [
            '**Cost Meter Commands**:',
            '- `/cost` or `/cost receipt`: generate detailed markdown spend receipt for this session',
            '- `/cost summary`: compact spend and token usage summary',
            '- `/cost reset`: reset per-session turn counter',
            '- `/cost help`: show this help message',
          ].join('\n')
        }

        // Aggregate tokens across turns
        let totalUncachedInput = 0
        let totalOutput = 0
        let totalCacheRead = 0
        let totalCacheWrite = 0
        let totalCostUsd = 0

        for (const t of turns) {
          totalUncachedInput += Number(t.uncachedInputTokens) || 0
          totalOutput += Number(t.outputTokens) || 0
          totalCacheRead += Number(t.cacheReadTokens) || 0
          totalCacheWrite += Number(t.cacheWriteTokens) || 0
          totalCostUsd += Number(t.costDeltaUsd) || 0
        }

        const tokensObj = {
          uncachedInputTokens: totalUncachedInput,
          outputTokens: totalOutput,
          cacheReadTokens: totalCacheRead,
          cacheWriteTokens: totalCacheWrite,
        }

        const savings = (typeof calculateCacheSavings === 'function' && activeRates)
          ? calculateCacheSavings(tokensObj, activeRates)
          : { savedUsd: 0, percent: 0 }

        const analytics = typeof calculateBurnRateAndProjection === 'function'
          ? calculateBurnRateAndProjection(turns, totalCostUsd)
          : { burnRatePerHourUsd: 0, projectedCostUsd: 0 }

        const payload = {
          model: route.model || 'active model',
          provider: route.provider || '',
          currency,
          fx,
          costUsd: totalCostUsd,
          tokens: tokensObj,
          cacheSavingsUsd: savings.savedUsd,
          cacheSavingsPercent: savings.percent,
          tier: tariff?.source === 'deepseek' ? 'DeepSeek Tariff' : (tariff?.source || 'Standard'),
          rates: activeRates,
          burnRatePerHourUsd: analytics.burnRatePerHourUsd,
          projectedCostUsd: analytics.projectedCostUsd,
          turnsCount: turns.length,
        }

        if (subcmd === 'summary' || subcmd === 'brief') {
          return formatCostSummary(payload)
        }

        return formatCostReceipt(payload)
      } catch (err) {
        return `Cost Meter error: ${String(err?.message || err)}`
      }
    }

    const commandHandler = async (invocation) => {
      const rawArgs = typeof invocation === 'string'
        ? invocation
        : (invocation?.rawInput || invocation?.input || invocation?.text || invocation?.args || '')
      const text = await executeCommand(rawArgs)
      return {
        kind: 'success',
        text,
        toString() { return text },
      }
    }

    const commandExecute = async (rawArgs, invocation = null) => {
      const result = await commandHandler(invocation || rawArgs)
      return result.text
    }

    const unregister1 = commands.register({
      definitionId: '@goodandready/dsh-cost-meter',
      name: 'cost',
      description: 'Show session spend receipt, tokens, cache savings and burn rate (/cost [receipt|summary|reset|help])',
      input: { hint: '[receipt|summary|reset|help]' },
      handler: commandHandler,
      execute: commandExecute,
    })

    const unregister2 = commands.register({
      definitionId: '@goodandready/dsh-cost-meter',
      name: 'cost-summary',
      description: 'Show compact 1-line session spend summary',
      handler: async () => commandHandler('summary'),
      execute: async () => commandExecute('summary'),
    })

    if (typeof ctx.effect === 'function') {
      ctx.effect(() => () => {
        unregister1?.()
        unregister2?.()
      }, 'dsh-cost-meter: slash-command')
    }
  })
}
