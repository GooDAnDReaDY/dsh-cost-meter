import { registerRoutes, STATE_PATH, REFRESH_PATH } from './routes.js'
// dsh-cost-meter — host half. Rates derived from OpenRouter public catalog with
// peak/off-peak schedule and manual tariff overrides. Serves state via GET /dsh-cost-meter/state.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'

// Ensure .volatile() helper exists on Schemastery schema prototype for DSH 0.2
try {
  const p = Object.getPrototypeOf(z.boolean())
  if (p && typeof p.volatile !== 'function') {
    p.volatile = function () { return typeof this.extra === 'function' ? this.extra('volatile', true) : this }
  }
} catch {}

export * from './tariff.js'
export * from './projection.js'
export * from './fx.js'
export * from './alerts.js'
export * from './commands.js'
export * from './export.js'
export * from './analytics.js'
export * from './metrics.js'
export * from './budget.js'
export { STATE_PATH, REFRESH_PATH, METRICS_PATH } from './routes.js'
import { indexCatalog, resolveTariff, matchModel, unwrapVolatile, calculateCacheSavings } from './tariff.js'
import { usageByModelProjection, getLastTurns, resetLastTurns } from './projection.js'
import { getFxRate, refreshFxRates } from './fx.js'
import { registerSlashCommand } from './commands.js'
import { calculateBurnRateAndProjection } from './analytics.js'
import { ratesAt } from './alerts.js'

export const name = '@goodandready/dsh-cost-meter'
export const inject = ['webServer', 'settings', 'sessionProjections']

const NS = 'dsh-cost-meter'
export function isLoopback(value) {
  const a = value?.toLowerCase().replace(/^\[|\]$/g, '')
  return a === 'localhost' || a === 'localhost.' || a === '::1' || a?.startsWith('127.') === true || a?.startsWith('::ffff:127.') === true
}

export function getConnection(ctx) {
  try {
    const f = ctx?.reflect?.get
      ? (ctx.reflect.get('connection') || ctx?.connection)
      : (ctx?.get ? (ctx.get('connection') || ctx?.connection) : Reflect.get(ctx || {}, 'connection'))
    return f || (ctx?.root ? getConnection(ctx.root) : undefined)
  } catch {
    return undefined
  }
}

export function isTrustedCaller(request, ctx = null) {
  if (!request) return false
  const conn = getConnection(ctx) || request?.connectionService || request?.connection
  if (conn && typeof conn.requestRejection === 'function') {
    try {
      if (conn.requestRejection(request) !== undefined) return false
    } catch {
      return false
    }
  }
  const remote = request.socket?.remoteAddress || request.connection?.remoteAddress
  const loopback = isLoopback(remote)
  if (ctx && !conn && !loopback) return false

  const site = request.headers?.['sec-fetch-site']
  if (site === 'cross-site' || site === 'same-site') return false

  const host = request.headers?.['host']
  const origin = request.headers?.['origin']
  if (origin) {
    try {
      const url = new URL(origin)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (host && url.host.toLowerCase() === host.toLowerCase()) return true
        if (isLoopback(url.hostname) && loopback) return true
        return false
      }
      return loopback
    } catch {
      return false
    }
  }

  const referer = request.headers?.['referer']
  if (referer) {
    try {
      const url = new URL(referer)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (host && url.host.toLowerCase() === host.toLowerCase()) return true
        if (isLoopback(url.hostname) && loopback) return true
        return false
      }
      return loopback
    } catch {
      return false
    }
  }

  return loopback
}

export function normalizeConfig(raw) {
  const u = unwrapVolatile(raw) || {}
  const currency = typeof u.currency === 'string' && u.currency ? u.currency : '$'
  const autoFx = u.autoFxRate !== false
  return {
    ...u,
    currency,
    autoFxRate: autoFx,
    usdRate: getFxRate(currency, u.usdRate, autoFx),
    displayTimeZone: typeof u.displayTimeZone === 'string' && u.displayTimeZone ? u.displayTimeZone : 'Europe/Moscow',
    budgetThreshold: Number(u.budgetThreshold) || 0,
    displayMode: (u.displayMode === 'compact' || u.displayMode === 'full') ? u.displayMode : 'auto',
    alertBeforeSwitch: u.alertBeforeSwitch !== false,
    alertLeadMinutes: Math.max(1, Math.min(30, Number(u.alertLeadMinutes) || 5)),
    browserNotifications: Boolean(u.browserNotifications),
    privacyMode: Boolean(u.privacyMode),
    showHeaderChip: u.showHeaderChip !== false,
    showMessageAction: u.showMessageAction !== false,
    useOpenRouter: u.useOpenRouter !== false,
    refreshHours: Number(u.refreshHours) || 24,
    gitCommitTrailers: Boolean(u.gitCommitTrailers),
    smartTruncation: u.smartTruncation !== false,
    truncationMaxTokens: Math.max(100, Number(u.truncationMaxTokens) || 10000),
    exportPrometheusMetrics: u.exportPrometheusMetrics !== false,
    dailySpendLimitUsd: Math.max(0, Number(u.dailySpendLimitUsd) || 0),
    monthlySpendLimitUsd: Math.max(0, Number(u.monthlySpendLimitUsd) || 0),
    budgetHardBlock: Boolean(u.budgetHardBlock),
    deepseekPeakPrices: u.deepseekPeakPrices || {},
    modelMap: u.modelMap || {},
    prices: u.prices || {},
    manualPeakWindowsUtc: Array.isArray(u.manualPeakWindowsUtc) ? u.manualPeakWindowsUtc : [],
    manualOffPeakMultiplier: Number(u.manualOffPeakMultiplier) || 1,
  }
}

const CATALOG_URL = 'https://openrouter.ai/api/v1/models'
const CACHE_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'dsh-cost-meter-catalog.json')

/** One route's rates, in USD per 1M tokens. */
const PriceRow = z.object({
  cacheHit: z.number().description('Input tokens served from the provider cache.').default(0),
  input: z.number().description('Input tokens that missed the cache.').default(0),
  cacheWrite: z.number().description('Input tokens written into the cache.').default(0),
  output: z.number().description('Output tokens (reasoning included).').default(0),
})

export const Config = z.object({
  currency: z.string().description('Currency symbol shown in the widget.').default('$').volatile(),
  autoFxRate: z.boolean().description('Automatically fetch daily exchange rates for non-USD currencies.').default(true).volatile(),
  usdRate: z.number().description('Units of `currency` per USD. 1 keeps everything in USD.').default(1).volatile(),
  displayTimeZone: z.string().description('IANA zone the widget shows tariff hours in.').default('Europe/Moscow').volatile(),
  budgetThreshold: z.number().description('Optional session budget threshold in USD. 0 disables threshold warnings.').default(0).volatile(),
  displayMode: z.union(['auto', 'full', 'compact']).description('Widget display mode: auto, full, or compact.').default('auto').volatile(),
  alertBeforeSwitch: z.boolean().description('Pre-switch notification and visual alert before tariff change.').default(true).volatile(),
  alertLeadMinutes: z.number().description('Minutes before tariff change to trigger pre-switch alert.').default(5).volatile(),
  browserNotifications: z.boolean().description('Enable desktop browser notifications for tariff switches.').default(false).volatile(),
  privacyMode: z.boolean().description('Streamer/Privacy mode: mask financial spend with asterisks while retaining token stats.').default(false).volatile(),
  showHeaderChip: z.boolean().description('Show the cost meter chip in the conversation header.').default(true).volatile(),
  showMessageAction: z.boolean().description('Show the token inspector action button on assistant messages.').default(true).volatile(),
  deepseekPeakPrices: z.dict(PriceRow).description('Override the built-in DeepSeek peak rates, by model id.').default({}).volatile(),
  useOpenRouter: z.boolean().description('Pull rates and discount windows from the public OpenRouter catalog.').default(true).volatile(),
  refreshHours: z.number().description('How often to refetch the catalog.').default(24).volatile(),
  gitCommitTrailers: z.boolean().description('Append cost trailers to git commits.').default(false).volatile(),
  smartTruncation: z.boolean().description('Enable smart middle-truncation for tool outputs.').default(true).volatile(),
  truncationMaxTokens: z.number().description('Token threshold for middle-truncation.').default(10000).volatile(),
  exportPrometheusMetrics: z.boolean().description('Export Prometheus metrics at /dsh-cost-meter/metrics.').default(true).volatile(),
  dailySpendLimitUsd: z.number().description('Hard daily spending cap in USD (0 disables).').default(0).volatile(),
  monthlySpendLimitUsd: z.number().description('Hard monthly spending cap in USD (0 disables).').default(0).volatile(),
  budgetHardBlock: z.boolean().description('Pause/block requests when spending cap is reached.').default(false).volatile(),
  modelMap: z.dict(z.string()).description('Route override: "provider/model" -> OpenRouter model id.').default({}).volatile(),
  prices: z.dict(PriceRow).description('Manual rates by "provider/model" (or "*"). Win over the catalog.').default({}).volatile(),
  manualPeakWindowsUtc: z.array(z.string()).description('Peak windows HH:MM-HH:MM UTC, used only with manual prices.').default([]).volatile(),
  manualOffPeakMultiplier: z.number().description('Multiplier outside the manual peak windows.').default(1).volatile(),
})

/** The agent's default route, read off settings descriptors when available. */
function defaultRoute(ctx) {
  const settings = (ctx?.get && typeof ctx.get === 'function' ? ctx.get('settings') : null) || ctx?.settings
  if (settings === undefined) return undefined
  try {
    const found = settings
      .describe({ redactSecrets: true })
      .find((descriptor) => descriptor.ns === 'agent-default-model')
    const value = found && found.value
    if (!value || typeof value.provider !== 'string' || typeof value.model !== 'string') return undefined
    return { provider: value.provider, model: value.model }
  } catch {
    return undefined
  }
}

/** "provider/model" -> {provider, model}; the model half may contain slashes. */
export function splitRoute(key) {
  const str = String(key || '').trim()
  if (!str) return undefined
  const slash = str.indexOf('/')
  return slash < 0 ? { provider: '', model: str } : { provider: str.slice(0, slash), model: str.slice(slash + 1) }
}

export function apply(ctx, config) {
  void refreshFxRates()
  let current = normalizeConfig(config)
  let catalog = { index: { byId: {}, byLowerId: {}, bySuffix: {} }, fetchedAt: 0, error: null }
  const resolveCache = new Map()

  function getCachedTariff(cfg, route) {
    if (!route) return resolveTariff(cfg, catalog.index, route)
    const cacheKey = (route.provider || '') + '/' + (route.model || '')
    if (resolveCache.has(cacheKey)) return resolveCache.get(cacheKey)
    const res = resolveTariff(cfg, catalog.index, route)
    if (resolveCache.size >= 500) resolveCache.clear()
    resolveCache.set(cacheKey, res)
    return res
  }

  function clearResolveCache() {
    resolveCache.clear()
  }

  try {
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    if (cached && Array.isArray(cached.models)) {
      catalog = { index: indexCatalog(cached.models), fetchedAt: cached.fetchedAt || 0, error: null }
    }
  } catch {}

  async function refresh(signal, force = false) {
    const cfg = current ?? config
    if (cfg.useOpenRouter === false) return
    const ageMs = Date.now() - catalog.fetchedAt
    if (!force && catalog.fetchedAt && ageMs < (Number(cfg.refreshHours) || 24) * 3600e3) return
    try {
      const timeoutSignal = AbortSignal.timeout(15000)
      const combinedSignal = signal ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal) : timeoutSignal
      const response = await fetch(CATALOG_URL, { signal: combinedSignal, headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const body = await response.json()
      const models = Array.isArray(body && body.data) ? body.data : []
      if (models.length === 0) throw new Error('empty catalog')
      const slim = models.map((m) => ({ id: m.id, pricing: m.pricing }))
      catalog = { index: indexCatalog(slim), fetchedAt: Date.now(), error: null }
      clearResolveCache()
      try {
        mkdirSync(dirname(CACHE_FILE), { recursive: true })
        writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: catalog.fetchedAt, models: slim }))
      } catch {}
    } catch (error) {
      catalog = { ...catalog, error: String((error && error.message) || error) }
    }
  }

  // Live config reaction from GUI / settings service (DSH 0.2+)
  ctx.inject(['settings'], (sctx) => {
    const svc = sctx.settings
    if (typeof svc?.describe !== 'function') return
    const readRow = () => {
      try {
        const rows = svc.describe({ redactSecrets: true })
        if (Array.isArray(rows)) return rows.find((r) => r?.ns === NS)
        if (rows && typeof rows === 'object' && rows.ns === NS) return rows
        return undefined
      } catch {
        return undefined
      }
    }
    const row = readRow()
    if (row?.value && typeof row.value === 'object') {
      current = normalizeConfig({ ...config, ...row.value })
      clearResolveCache()
    }
    ctx.on('settings/document-updated', (ns) => {
      if (ns && ns !== NS) return
      const fresh = readRow()
      if (fresh?.value && typeof fresh.value === 'object') {
        current = normalizeConfig({ ...config, ...fresh.value })
      }
      clearResolveCache()
    })
  })

  // Hook the session projection so the widget can show spend breakdown.
  ctx.inject(['sessionProjections'], (pctx) => {
    const eff = typeof pctx.effect === 'function' ? pctx.effect.bind(pctx) : (typeof ctx.effect === 'function' ? ctx.effect.bind(ctx) : (fn) => fn())
    eff(() => pctx.sessionProjections.register(usageByModelProjection))
  })

  // Register slash command /cost and /cost-summary
  registerSlashCommand(ctx, {
    getCurrentConfig: () => (current ? normalizeConfig(current) : normalizeConfig(config)),
    getCachedTariff,
    getLastTurns,
    resetLastTurns,
    calculateBurnRateAndProjection,
    calculateCacheSavings,
    ratesAt,
    splitRoute,
    defaultRoute,
  })

  // Register HTTP routes (refresh, state, metrics, update) via webServer service
  registerRoutes(ctx, {
    name,
    isTrustedCaller,
    getCachedTariff,
    refresh,
    splitRoute,
    defaultRoute,
    getCurrentConfig: () => (current ? normalizeConfig(current) : normalizeConfig(config)),
    getCatalog: () => catalog,
  })
}
