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
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { z as zod } from 'zod'

export const name = 'dsh-cost-meter'
export const inject = ['webServer']

const NS = 'dsh-cost-meter'
const STATE_PATH = '/dsh-cost-meter/state'
const CATALOG_URL = 'https://openrouter.ai/api/v1/models'
const CACHE_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'dsh-cost-meter-catalog.json')

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

// ponytail: a DeepSeek model reached THROUGH OpenRouter is still priced from
// this table, though the bill comes from OpenRouter. Fix by classifying the
// route (provider id / baseURL) before the model, and for a `:floor` slug take
// the minimum over /models/{id}/endpoints rather than the base listing.

export const Config = z.object({
  currency: z.string().description('Currency symbol shown in the widget.').default('$'),
  usdRate: z.number().description('Units of `currency` per USD. 1 keeps everything in USD.').default(1),
  displayTimeZone: z
    .string()
    .description('IANA zone the widget shows tariff hours in.')
    .default('Europe/Moscow'),
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
  // Harness routes name models in their own casing (`MiniMax-M3`), the catalog
  // is lower-case (`minimax/minimax-m3`), so matching is case-insensitive.
  const lower = String(route.model).toLowerCase()
  if (index.byLowerId[lower]) return index.byLowerId[lower]
  if (index.byLowerId[key.toLowerCase()]) return index.byLowerId[key.toLowerCase()]
  const bySuffix = index.bySuffix[lower]
  return bySuffix && bySuffix.length ? bySuffix[0] : undefined
}

/** Build lookup tables once per fetch; the raw catalog is ~700 KB. */
export function indexCatalog(models) {
  const byId = {}
  const byLowerId = {}
  const bySuffix = {}
  for (const entry of models) {
    if (!entry || typeof entry.id !== 'string' || !entry.pricing) continue
    // Variants like ":batch" or ":free" are different products; skip them so a
    // suffix match cannot silently price against a cheaper batch tier.
    if (entry.id.includes(':')) continue
    byId[entry.id] = scheduleOf(entry)
    byLowerId[entry.id.toLowerCase()] = entry.id
    const suffix = entry.id.includes('/') ? entry.id.slice(entry.id.indexOf('/') + 1) : entry.id
    ;(bySuffix[suffix.toLowerCase()] = bySuffix[suffix.toLowerCase()] || []).push(entry.id)
  }
  return { byId, byLowerId, bySuffix }
}

// ---------------------------------------------------------------------------
// Per-model usage projection
//
// `tokenUsage` from dsh-token-meter totals the whole session, which prices
// wrongly the moment the model changes mid-session. The log has what is
// needed: `request/header` carries `header.config = {provider, model}`, and
// usage arrives afterwards for that same step. So this unit keeps the last
// header's route and files every usage sample under it.
//
// The replace-if-same-step guard mirrors token-meter: a streamed usage chunk
// and the finalized assistant message report the same numbers for one step.
// ---------------------------------------------------------------------------

const ZERO = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

// Projection schemas are validated with ZOD, not schemastery: the registry
// calls `schema.parse(view)` at the boundary, and a schemastery schema has no
// `.parse`, which fails every history read with
// "registration.def.schema.parse is not a function".
const bucketSchema = zod.object({
  uncachedInputTokens: zod.number().nonnegative(),
  outputTokens: zod.number().nonnegative(),
  cacheReadTokens: zod.number().nonnegative(),
  cacheWriteTokens: zod.number().nonnegative(),
}).strict()

/** Pull the four buckets out of one provider usage record. */
function bucketsFromUsage(usage) {
  return {
    uncachedInputTokens: Number(usage.inputTokens) || 0,
    outputTokens: Number(usage.outputTokens) || 0,
    cacheReadTokens: Number(usage.cacheReadTokens) || 0,
    cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
  }
}

function addBuckets(base, remove, add) {
  const out = {}
  for (const k of Object.keys(ZERO)) {
    out[k] = (base[k] || 0) - ((remove && remove[k]) || 0) + (add[k] || 0)
  }
  return out
}

function sameBuckets(a, b) {
  return a && b && Object.keys(ZERO).every((k) => (a[k] || 0) === (b[k] || 0))
}

/** The usage a streamed chunk or a finalized assistant message reports. */
function usageOf(event) {
  if (event.type === 'assistant/chunk' && event.data.chunk && event.data.chunk.type === 'usage') {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.chunk.usage }
  }
  if (event.type === 'assistant/message' && event.data.usage !== undefined) {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.usage }
  }
  return undefined
}

/**
 * Half-hour slot of the UTC day an event falls into (0..47). Tariff windows are
 * expressed in UTC clock time, and every real schedule so far lands on a whole
 * or half hour, so 48 slots reproduce the rate exactly while keeping the state
 * small enough to ship on every projection frame.
 */
export function slotOf(timeMs) {
  const d = new Date(timeMs)
  return Math.floor((d.getUTCHours() * 60 + d.getUTCMinutes()) / 30)
}

const usageByModelProjection = {
  key: 'costByModel',
  schema: zod.object({
    models: zod.array(zod.object({
      provider: zod.string(),
      model: zod.string(),
      // Usage split by the half-hour of the UTC day it was spent in. Spend is
      // priced at the rate in force THEN; a later tariff switch must not
      // reprice tokens that are already paid for.
      slots: zod.record(zod.string(), bucketSchema),
    })),
  }).strict(),
  init: () => ({ route: null, byKey: {}, last: null }),
  apply: (state, event) => {
    if (event.type === 'request/header') {
      const config = event.data && event.data.header && event.data.header.config
      const provider = config && typeof config.provider === 'string' ? config.provider : undefined
      const model = config && typeof config.model === 'string' ? config.model : undefined
      if (provider === undefined || model === undefined) return state
      if (state.route && state.route.provider === provider && state.route.model === model) return state
      return { ...state, route: { provider, model } }
    }
    const sample = usageOf(event)
    if (sample === undefined) return state
    const route = state.route || { provider: '', model: 'unknown' }
    const key = route.provider + '/' + route.model
    const slot = String(slotOf(event.time))
    const buckets = bucketsFromUsage(sample.usage)
    // A streamed usage chunk and the finalized assistant message report the
    // same step twice; the second one replaces the first instead of adding.
    const previous =
      state.last !== null &&
      state.last.turn === sample.turn &&
      state.last.step === sample.step &&
      state.last.key === key &&
      state.last.slot === slot
        ? state.last.buckets
        : undefined
    if (previous !== undefined && sameBuckets(previous, buckets)) return state
    const slots = state.byKey[key] || {}
    return {
      route: state.route,
      byKey: {
        ...state.byKey,
        [key]: { ...slots, [slot]: addBuckets(slots[slot] || ZERO, previous, buckets) },
      },
      last: { turn: sample.turn, step: sample.step, key, slot, buckets },
    }
  },
  view: (state) => ({
    models: Object.keys(state.byKey).map((key) => {
      const slash = key.indexOf('/')
      return {
        provider: key.slice(0, slash),
        model: key.slice(slash + 1),
        slots: state.byKey[key],
      }
    }),
  }),
  stateVersion: 2,
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

/**
 * Resolve one route's tariff: manual config wins, then DeepSeek's own table,
 * then the OpenRouter catalog. Returns `schedule: null` when nothing knows it,
 * so the widget can say so instead of pricing at zero.
 */
export function resolveTariff(cfg, index, route) {
  if (!route) return { schedule: null, source: 'none', matchedId: null }
  const key = route.provider + '/' + route.model
  const prices = cfg.prices || {}
  const manual = prices[key] || prices[route.model] || prices['*']

  if (manual) {
    const base = {
      cacheHit: Number(manual.cacheHit) || 0,
      input: Number(manual.input) || 0,
      cacheWrite: Number(manual.cacheWrite) || 0,
      output: Number(manual.output) || 0,
    }
    const factor = Number(cfg.manualOffPeakMultiplier) || 1
    const windows = []
    for (const spec of cfg.manualPeakWindowsUtc || []) {
      const parsed = parseWindow(spec)
      if (parsed) windows.push({ start: parsed.start, end: parsed.end, rates: base })
    }
    const schedule = windows.length
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
    return { schedule, source: 'manual', matchedId: key }
  }

  // Keyed by MODEL, not provider: a DeepSeek model is billed at DeepSeek's
  // published rate whoever routes it (deepseek-official, opencode-go, ollama).
  // Date/variant suffixes (`deepseek-v4-flash:0731`) name the same product.
  const providerLower = String(route.provider || "").toLowerCase();
  // #3: Provider-aware routing: if routed explicitly through OpenRouter,
  // consult OpenRouter catalog first to honor actual provider billing.
  if (providerLower === "openrouter" && cfg.useOpenRouter !== false) {
    const matchedId = matchModel(index, route, cfg.modelMap);
    if (matchedId) return { schedule: index.byId[matchedId], source: "openrouter", matchedId };
  }

  const base = String(route.model).toLowerCase().split(':')[0]
  const peak = (cfg.deepseekPeakPrices || {})[base] || DEEPSEEK_PEAK_RATES[base]
  if (peak) {
    const full = {
      cacheHit: Number(peak.cacheHit) || 0,
      input: Number(peak.input) || 0,
      cacheWrite: Number(peak.cacheWrite) || 0,
      output: Number(peak.output) || 0,
    }
    return {
      schedule: {
        base: {
          cacheHit: full.cacheHit / 2,
          input: full.input / 2,
          cacheWrite: full.cacheWrite / 2,
          output: full.output / 2,
        },
        windows: DEEPSEEK_PEAK_WINDOWS.map((w) => ({ start: w.start, end: w.end, rates: full })),
      },
      source: 'deepseek',
      matchedId: base,
    }
  }

  if (cfg.useOpenRouter !== false) {
    const matchedId = matchModel(index, route, cfg.modelMap)
    if (matchedId) return { schedule: index.byId[matchedId], source: 'openrouter', matchedId }
  }
  return { schedule: null, source: 'none', matchedId: null }
}

/** "provider/model" -> {provider, model}; the model half may contain slashes. */
function splitRoute(key) {
  const slash = String(key).indexOf('/')
  if (slash < 0) return undefined
  return { provider: key.slice(0, slash), model: key.slice(slash + 1) }
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

  // Optional capability: headless assemblies without the registry keep working,
  // the widget just falls back to the session-wide tokenUsage projection.
  ctx.inject(['sessionProjections'], (pctx) => {
    pctx.sessionProjections.register(usageByModelProjection)
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
          const own = resolveTariff(cfg, catalog.index, route)

          // The client asks for every model the session actually used, so a
          // session that switched models can price each part on its own tariff.
          const schedules = {}
          const asked = new URL(req.url, 'http://localhost').searchParams.get('models')
          for (const key of (asked ? asked.split(',') : []).slice(0, 24)) {
            const parsed = splitRoute(key.trim())
            if (!parsed) continue
            const resolved = resolveTariff(cfg, catalog.index, parsed)
            schedules[key.trim()] = {
              schedule: resolved.schedule,
              source: resolved.source,
              matchedId: resolved.matchedId,
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({
            currency: cfg.currency,
            usdRate: cfg.usdRate,
            displayTimeZone: cfg.displayTimeZone || 'Europe/Moscow',
            route,
            source: own.source,
            matchedId: own.matchedId,
            schedules,
            fetchedAt: catalog.fetchedAt || null,
            catalogError: catalog.error,
            schedule: own.schedule,
          }))
        },
      }),
    'dsh-cost-meter: state route',
  )
}
