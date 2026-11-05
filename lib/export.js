// dsh-cost-meter — session spend export to CSV, JSON, and PNG canvas card (Issue #118).

/**
 * Sanitize cell values for CSV and prevent CSV formula injection (CWE-1236).
 * Prepends a single quote if string starts with dangerous characters.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return ''
  let str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str
  }
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * Generate formatted CSV with UTF-8 BOM for Excel / spreadsheet compatibility.
 */
export function generateSessionCsv(data) {
  const {
    model = 'unknown',
    provider = '',
    currency = '$',
    fx = 1,
    turns = [],
    totalCostUsd = 0,
    exportedAt = new Date().toISOString(),
  } = data || {}

  const headers = [
    'Timestamp',
    'ISO_Time',
    'Turn',
    'Step',
    'Model',
    'Uncached_Input_Tokens',
    'Cache_Read_Tokens',
    'Cache_Hit_Rate_%',
    'Output_Tokens',
    'Total_Tokens',
    'Cost_USD',
    'Cost_Local',
    'Currency',
  ]

  const rows = [headers.map(sanitizeCsvCell).join(',')]

  let sumUncached = 0
  let sumHit = 0
  let sumOut = 0
  let sumTotalTok = 0
  let sumCostUsd = 0

  for (const t of turns) {
    const ts = t.timestamp ? Number(t.timestamp) : Date.now()
    const iso = new Date(ts).toISOString()
    const uncached = Number(t.uncachedInputTokens) || 0
    const hit = Number(t.cacheReadTokens) || 0
    const out = Number(t.outputTokens) || 0
    const totalTok = uncached + hit + out
    const hitRate = t.cacheHitRate !== undefined
      ? t.cacheHitRate
      : (uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0)
    const costUsd = Number(t.costDeltaUsd) || 0
    const costLocal = costUsd * fx

    sumUncached += uncached
    sumHit += hit
    sumOut += out
    sumTotalTok += totalTok
    sumCostUsd += costUsd

    const row = [
      ts,
      iso,
      t.turn ?? '',
      t.step ?? 0,
      provider ? `${provider}/${model}` : model,
      uncached,
      hit,
      hitRate,
      out,
      totalTok,
      costUsd.toFixed(6),
      costLocal.toFixed(4),
      currency,
    ]
    rows.push(row.map(sanitizeCsvCell).join(','))
  }

  // Summary row
  const overallHitRate = sumUncached + sumHit > 0 ? Math.round((sumHit / (sumUncached + sumHit)) * 100) : 0
  const summaryRow = [
    'TOTAL',
    exportedAt,
    turns.length,
    '',
    provider ? `${provider}/${model}` : model,
    sumUncached,
    sumHit,
    overallHitRate,
    sumOut,
    sumTotalTok,
    (totalCostUsd || sumCostUsd).toFixed(6),
    ((totalCostUsd || sumCostUsd) * fx).toFixed(4),
    currency,
  ]
  rows.push(summaryRow.map(sanitizeCsvCell).join(','))

  // Prepend UTF-8 BOM (\uFEFF)
  return '\uFEFF' + rows.join('\r\n')
}

/**
 * Generate structured, versioned JSON export.
 */
export function generateSessionJson(data) {
  const {
    model = 'unknown',
    provider = '',
    currency = '$',
    fx = 1,
    turns = [],
    totalCostUsd = 0,
    cacheSavingsUsd = 0,
    cacheSavingsPercent = 0,
    tier = 'Standard',
    rates = {},
    burnRatePerHourUsd = 0,
    projectedCostUsd = 0,
    exportedAt = new Date().toISOString(),
  } = data || {}

  let sumUncached = 0
  let sumHit = 0
  let sumOut = 0

  const turnsFormatted = turns.map((t) => {
    const uncached = Number(t.uncachedInputTokens) || 0
    const hit = Number(t.cacheReadTokens) || 0
    const out = Number(t.outputTokens) || 0
    sumUncached += uncached
    sumHit += hit
    sumOut += out
    return {
      turn: t.turn,
      step: t.step ?? 0,
      timestamp: t.timestamp,
      tokens: {
        uncachedInput: uncached,
        cacheRead: hit,
        output: out,
        total: uncached + hit + out,
        cacheHitRate: t.cacheHitRate !== undefined ? t.cacheHitRate : (uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0),
      },
      durationMs: t.durationMs || 0,
      costDeltaUsd: Number(t.costDeltaUsd) || 0,
      costDeltaLocal: (Number(t.costDeltaUsd) || 0) * fx,
    }
  })

  const totalPrompt = sumUncached + sumHit
  const overallHitRate = totalPrompt > 0 ? Math.round((sumHit / totalPrompt) * 100) : 0

  return {
    version: 1,
    generator: '@goodandready/dsh-cost-meter',
    exportedAt,
    session: {
      model,
      provider,
      currency,
      fxRate: fx,
      totalCostUsd,
      totalCostLocal: totalCostUsd * fx,
      tokens: {
        uncachedInput: sumUncached,
        cacheRead: sumHit,
        output: sumOut,
        total: sumUncached + sumHit + sumOut,
        cacheHitRate: overallHitRate,
      },
      cacheSavings: {
        savedUsd: cacheSavingsUsd,
        savedLocal: cacheSavingsUsd * fx,
        percent: cacheSavingsPercent,
      },
      tier,
      rates,
      burnRate: {
        perHourUsd: burnRatePerHourUsd,
        perHourLocal: burnRatePerHourUsd * fx,
        projectedUsd: projectedCostUsd,
        projectedLocal: projectedCostUsd * fx,
      },
      turnsCount: turns.length,
    },
    turns: turnsFormatted,
  }
}

/**
 * Render visual summary card on an HTML5 Canvas (high-res 1200x680, 2x retina).
 */
export function renderSummaryCardToCanvas(canvas, data) {
  if (!canvas || typeof canvas.getContext !== 'function') return null

  const width = 1200
  const height = 680
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const {
    model = 'deepseek-chat',
    provider = 'deepseek',
    currency = '$',
    fx = 1,
    costUsd = 0,
    tokens = {},
    cacheSavingsUsd = 0,
    cacheSavingsPercent = 0,
    tier = 'Off-Peak Tier (-50%)',
    turns = [],
  } = data || {}

  const totalCost = costUsd * fx
  const costFormatted = totalCost >= 1 ? `${currency}${totalCost.toFixed(2)}` : (totalCost > 0 ? `${currency}${totalCost.toFixed(4)}` : `${currency}0.00`)
  const uncached = Number(tokens.uncachedInputTokens || tokens.inputTokens) || 0
  const hit = Number(tokens.cacheReadTokens) || 0
  const out = Number(tokens.outputTokens) || 0
  const totalTok = uncached + hit + out
  const hitRate = uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0
  const savedAmt = cacheSavingsUsd * fx
  const savedFormatted = savedAmt >= 1 ? `${currency}${savedAmt.toFixed(2)}` : `${currency}${savedAmt.toFixed(4)}`

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#0f172a') // dark slate 900
  bgGrad.addColorStop(1, '#1e293b') // dark slate 800
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Outer border with subtle neon glow
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  ctx.strokeRect(20, 20, width - 40, height - 40)

  // Top header pill
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.roundRect(50, 45, 220, 44, 22)
  ctx.fill()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
  ctx.fillText('⚡ Cost Meter', 75, 74)

  // Date / timestamp
  ctx.fillStyle = '#94a3b8'
  ctx.font = '18px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), width - 60, 74)
  ctx.textAlign = 'left'

  // Model Name & Provider
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
  const routeStr = provider ? `${provider}/${model}` : model
  ctx.fillText(routeStr, 50, 145)

  // Tariff Tier badge
  ctx.fillStyle = tier.includes('Off-Peak') ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
  ctx.fillText(tier, 50, 180)

  // 4 Metric Tiles
  const tiles = [
    { label: 'SESSION SPEND', val: costFormatted, color: '#38bdf8' },
    { label: 'TOTAL TOKENS', val: totalTok.toLocaleString(), color: '#f8fafc' },
    { label: 'CACHE HIT RATE', val: `${hitRate}%`, color: '#34d399' },
    { label: 'CACHE SAVED', val: `≈ ${savedFormatted} (${cacheSavingsPercent}%)`, color: '#a78bfa' },
  ]

  const tileW = 250
  const tileH = 110
  const startX = 50
  const tileY = 215

  tiles.forEach((t, i) => {
    const x = startX + i * (tileW + 20)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)'
    ctx.beginPath()
    ctx.roundRect(x, tileY, tileW, tileH, 12)
    ctx.fill()
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.fillText(t.label, x + 16, tileY + 36)

    ctx.fillStyle = t.color
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif'
    ctx.fillText(t.val, x + 16, tileY + 80)
  })

  // Turns mini-chart
  const chartY = 360
  const chartH = 190
  const chartW = width - 100
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'
  ctx.beginPath()
  ctx.roundRect(50, chartY, chartW, chartH, 12)
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
  ctx.fillText('TURN HISTORY & STEP DYNAMICS', 70, chartY + 35)

  const activeTurns = turns.slice(-25)
  if (activeTurns.length > 0) {
    const maxTok = Math.max(...activeTurns.map((t) => Number(t.tokens) || 1), 100)
    const barW = Math.min(32, Math.floor((chartW - 60) / activeTurns.length) - 6)
    const baseY = chartY + chartH - 30
    const availH = 100

    activeTurns.forEach((t, i) => {
      const x = 70 + i * (barW + 8)
      const tok = Number(t.tokens) || 0
      const h = Math.max(6, Math.round((tok / maxTok) * availH))
      const y = baseY - h

      // Bar fill with cache hit proportion
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.roundRect(x, y, barW, h, 4)
      ctx.fill()

      const hitTokens = Number(t.cacheReadTokens) || 0
      if (hitTokens > 0) {
        const hitH = Math.round((hitTokens / tok) * h)
        ctx.fillStyle = '#10b981'
        ctx.beginPath()
        ctx.roundRect(x, baseY - hitH, barW, hitH, 4)
        ctx.fill()
      }
    })
  } else {
    ctx.fillStyle = '#64748b'
    ctx.font = '16px system-ui, -apple-system, sans-serif'
    ctx.fillText('No turn history recorded yet.', 70, chartY + 100)
  }

  // Footer
  ctx.fillStyle = '#64748b'
  ctx.font = '16px system-ui, -apple-system, sans-serif'
  ctx.fillText('Generated by @goodandready/dsh-cost-meter', 50, height - 35)

  ctx.fillStyle = '#475569'
  ctx.textAlign = 'right'
  ctx.fillText('goodandready.app', width - 50, height - 35)
  ctx.textAlign = 'left'

  return canvas
}
