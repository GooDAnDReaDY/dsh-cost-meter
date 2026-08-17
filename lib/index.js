// dsh-cost-meter — host half.
//
// The harness prices nothing on purpose: pi-ai carries a `cost` field but
// zeroes it and no consumer reports spend. So this half owns the rate card and
// serves it to the browser over GET /dsh-cost-meter/state.
//
// Rates come from OpenRouter's public catalog (https://openrouter.ai/api/v1/models,
// no auth). Besides the four token buckets it also publishes `pricing.overrides`
// — time-of-day discount windows keyed by UTC HHMM — which is exactly the
// peak/off-peak schedule DeepSeek runs. So the whole tariff, windows included,
// is derived rather than typed in; `prices` in config stays as a manual
// override for routes the catalog does not know (self-hosted, subscriptions).
//
// No agent hooks: the widget only reads, so it cannot corrupt a session.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-cost-meter'
export const inject = ['webServer']

const NS = 'dsh-cost-meter'
const STATE_PATH = '/dsh-cost-meter/state'
const CATALOG_URL = 'https://openrouter.ai/api/v1/models'
const CACHE_FILE = '/home/vadim/.dsh/storages/dsh-cost-meter-catalog.json'

/** One route's rates, in USD per 1M tokens. */
const PriceRow = z.object({
  cacheHit: z.number().description('Input tokens served from the provider cache.').default(0),
  input: z.number().description('Input tokens that missed the cache.').default(0),
  cacheWrite: z.number().description('Input tokens written into the cache.').default(0),
  output: z.number().description('Output tokens (reasoning included).').default(0),
})

/**
 * DeepSeek's own tariff, from https://api-docs.deepseek.com/quick_start/pricing.
 * Their API publishes no prices (/models lists ids, there is no pricing route),
 * and OpenRouter's `deepseek/*` entries quote different numbers, so this table
 * is the authoritative source for the official route. Values are PEAK, USD per
 * 1M tokens; off-peak is exactly half. Peak: 01:00-04:00 and 06:00-10:00 UTC.
 */
const DEEPSEEK_PEAK_RATES = {
  'deepseek-v4-flash': { cacheHit: 0.014, input: 0.44, cacheWrite: 0.44, output: 1.32 },
  'deepseek-v4-pro': { cacheHit: 0.044, input: 1.32, cacheWrite: 1.32, output: 3.96 },
}
const DEEPSEEK_PEAK_WINDOWS = [{ start: 60, end: 240 }, { start: 360, end: 600 }]

export const Config = z.object({
  currency: z.string().description('Currency symbol shown in the widget.').default('$'),
  usdRate: z.number().description('Units of `currency` per USD. 1 keeps everything in USD.').default(1),
  displayTimeZone: z
    .string()
    .description('IANA zone the widget shows tariff hours in.')
    .default('Europe/Moscow'),
  deepseekProviders: z
    .array(z.string())
    .description('Provider ids billed by DeepSeek directly (two-tier tariff).')
    .default(['deepseek-official', 'deepseek']),
  deepseekPeakPrices: z
    .dict(PriceRow)
    .description('Override the built-in DeepSeek peak rates, by model id.')
    .default({}),
  useOpenRouter: z
    .boolean()
    .description('Pull rates and discount windows from the public OpenRouter catalog.')
    .default(true),
  refreshHours: z.number().description('How often to refetch the catalog.').default(24),
  modelMap: z
    .dict(z.string())
    .description('Route override: "provider/model" -> OpenRouter model id.')
    .default({}),
  prices: z
    .dict(PriceRow)
    .description('Manual rates by "provider/model" (or "*"). Win over the catalog.')
    .default({}),
  manualPeakWindowsUtc: z
    .array(z.string())
    .description('Peak windows HH:MM-HH:MM UTC, used only with manual prices.')
    .default([]),
  manualOffPeakMultiplier: z
    .number()
    .description('Multiplier outside the manual peak windows.')
    .default(1),
})

/** OpenRouter prices are USD per token; the widget speaks per 1M tokens. */
function perMillion(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n * 1e6 : 0
}

/** Pull the four buckets out of one OpenRouter pricing object. */
function bucketsOf(pricing) {
  return {
    cacheHit: perMillion(pricing.input_cache_read),
    input: perMillion(pricing.prompt),
    cacheWrite: perMillion(pricing.input_cache_write),
    output: perMillion(pricing.completion),
  }
}

/** OpenRouter encodes window edges as UTC HHMM integers (1000 = 10:00). */
export function hhmmToMinutes(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 2400) return undefined
  return Math.floor(n / 100) * 60 + (n % 100)
}

/** "HH:MM-HH:MM" -> {start,end} in minutes; undefined when malformed. */
export function parseWindow(spec) {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(spec).trim())
  if (!m) return undefined
  return { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) }
}

/**
 * Normalize one catalog entry into the schedule the browser consumes:
 * a base rate card plus the discount windows that shadow it.
 */
function scheduleOf(entry) {
  const pricing = entry.pricing || {}
  const base = bucketsOf(pricing)
  const windows = []
  for (const override of pricing.overrides || []) {
    const start = hhmmToMinutes(override.utc_start)
    const end = hhmmToMinutes(override.utc_end)
    if (start === undefined || end === undefined) continue
    // An override omits buckets it does not change; fall back to the base.
    const rates = bucketsOf(override)
    windows.push({
      start,
      end,
      rates: {
        cacheHit: rates.cacheHit || base.cacheHit,
        input: rates.input || base.input,
        cacheWrite: rates.cacheWrite || base.cacheWrite,
        output: rates.output || base.output,
      },
    })
  }
  return { base, windows }
}

/**
 * Map a harness route onto an OpenRouter id. Exact id first, then the vendor
 * suffix (`deepseek-official/deepseek-v4-flash` -> `deepseek/deepseek-v4-flash`),
 * which is what the shared model names make possible.
 */
export function matchModel(index, route, modelMap) {
  if (!route) return undefined
  const key = route.provider + '/' + route.model
  const mapped = modelMap && modelMap[key]
  if (mapped && index.byId[mapped]) return mapped
  if (index.byId[key]) return key
  if (index.byId[route.model]) return route.model
  const bySuffix = index.bySuffix[route.model]
  return bySuffix && bySuffix.length ? bySuffix[0] : undefined
}

/** Build lookup tables once per fetch; the raw catalog is ~700 KB. */
function indexCatalog(models) {
  const byId = {}
  const bySuffix = {}
  for (const entry of models) {
    if (!entry || typeof entry.id !== 'string' || !entry.pricing) continue
    byId[entry.id] = scheduleOf(entry)
    const suffix = entry.id.includes('/') ? entry.id.slice(entry.id.indexOf('/') + 1) : entry.id
    ;(bySuffix[suffix] = bySuffix[suffix] || []).push(entry.id)
  }
  return { byId, bySuffix }
}

/** The agent's default route, read off settings descriptors when available. */
function defaultRoute(ctx) {
  const settings = ctx.get('settings')
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

export function apply(ctx, config) {
  let current = config
  let catalog = { index: { byId: {}, bySuffix: {} }, fetchedAt: 0, error: null }

  // Disk cache survives restarts, so a boot without network still prices.
  try {
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    if (cached && Array.isArray(cached.models)) {
      catalog = { index: indexCatalog(cached.models), fetchedAt: cached.fetchedAt || 0, error: null }
    }
  } catch {
    // absent or unreadable cache is normal on first run
  }

  async function refresh(signal) {
    const cfg = current ?? config
    if (cfg.useOpenRouter === false) return
    const ageMs = Date.now() - catalog.fetchedAt
    if (catalog.fetchedAt && ageMs < (Number(cfg.refreshHours) || 24) * 3600e3) return
    try {
      const response = await fetch(CATALOG_URL, { signal, headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const body = await response.json()
      const models = Array.isArray(body && body.data) ? body.data : []
      if (models.length === 0) throw new Error('empty catalog')
      // Keep only what pricing needs — the raw payload is mostly prose.
      const slim = models.map((m) => ({ id: m.id, pricing: m.pricing }))
      catalog = { index: indexCatalog(slim), fetchedAt: Date.now(), error: null }
      try {
        mkdirSync(dirname(CACHE_FILE), { recursive: true })
        writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: catalog.fetchedAt, models: slim }))
      } catch {
        // a read-only storages dir only costs us the restart-time cache
      }
    } catch (error) {
      catalog = { ...catalog, error: String((error && error.message) || error) }
    }
  }

  // Live config from the GUI, with the composition entry as the base layer.
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, Config, { base: config })
    current = scope.get() ?? config
    const stop = scope.watch(() => {
      current = scope.get() ?? config
      void refresh()
    })
    sctx.effect(() => () => {
      stop()
      current = config
    })
  })

  ctx.effect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = setInterval(() => void refresh(controller.signal), 3600e3)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, 'dsh-cost-meter: catalog refresh')

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: STATE_PATH,
        handler: (req, res) => {
          if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'method not allowed' }))
            return
          }
          const cfg = current ?? config
          const route = defaultRoute(ctx) ?? null
          const key = route ? route.provider + '/' + route.model : ''
          const manual = (cfg.prices || {})[key] || (cfg.prices || {})[route ? route.model : ''] || (cfg.prices || {})['*']

          let schedule = null
          let source = 'none'
          let matchedId = null

          // DeepSeek's own route: two tiers on a fixed UTC schedule. Checked
          // before the catalog because OpenRouter quotes different numbers.
          const isDeepSeek =
            route !== null &&
            (cfg.deepseekProviders || []).some((p) => String(p).toLowerCase() === String(route.provider).toLowerCase())
          const deepseekPeak = isDeepSeek
            ? (cfg.deepseekPeakPrices || {})[route.model] || DEEPSEEK_PEAK_RATES[route.model]
            : undefined

          if (!manual && deepseekPeak) {
            const peak = {
              cacheHit: Number(deepseekPeak.cacheHit) || 0,
              input: Number(deepseekPeak.input) || 0,
              cacheWrite: Number(deepseekPeak.cacheWrite) || 0,
              output: Number(deepseekPeak.output) || 0,
            }
            // Base layer is off-peak (half), the windows carry the full rate.
            schedule = {
              base: {
                cacheHit: peak.cacheHit / 2,
                input: peak.input / 2,
                cacheWrite: peak.cacheWrite / 2,
                output: peak.output / 2,
              },
              windows: DEEPSEEK_PEAK_WINDOWS.map((w) => ({ start: w.start, end: w.end, rates: peak })),
            }
            source = 'deepseek'
            matchedId = route.model
          } else if (manual) {
            const base = {
              cacheHit: Number(manual.cacheHit) || 0,
              input: Number(manual.input) || 0,
              cacheWrite: Number(manual.cacheWrite) || 0,
              output: Number(manual.output) || 0,
            }
            const factor = Number(cfg.manualOffPeakMultiplier) || 1
            const windows = []
            // Manual config names the PEAK windows, so the base row becomes the
            // discounted one and each window carries the full rate.
            for (const spec of cfg.manualPeakWindowsUtc || []) {
              const parsed = parseWindow(spec)
              if (parsed) windows.push({ start: parsed.start, end: parsed.end, rates: base })
            }
            schedule = windows.length
              ? {
                  base: {
                    cacheHit: base.cacheHit * factor,
                    input: base.input * factor,
                    cacheWrite: base.cacheWrite * factor,
                    output: base.output * factor,
                  },
                  windows,
                }
              : { base, windows: [] }
            source = 'manual'
          } else if (cfg.useOpenRouter !== false) {
            matchedId = matchModel(catalog.index, route, cfg.modelMap) ?? null
            if (matchedId) {
              schedule = catalog.index.byId[matchedId]
              source = 'openrouter'
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({
            currency: cfg.currency,
            usdRate: cfg.usdRate,
            displayTimeZone: cfg.displayTimeZone || 'Europe/Moscow',
            route,
            source,
            matchedId,
            fetchedAt: catalog.fetchedAt || null,
            catalogError: catalog.error,
            schedule,
          }))
        },
      }),
    'dsh-cost-meter: state route',
  )
}
