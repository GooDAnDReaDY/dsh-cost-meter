import { registerPluginUpdater } from './updater.js'
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

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { z as zod } from 'zod'

export * from './tariff.js'
import { indexCatalog, resolveTariff, matchModel } from './tariff.js'

export const name = '@goodandready/dsh-cost-meter'
export const inject = ['webServer']

const NS = 'dsh-cost-meter'
const STATE_PATH = '/dsh-cost-meter/state'
const REFRESH_PATH = '/dsh-cost-meter/refresh'
export function isLoopback(value) {
  const address = value?.toLowerCase().replace(/^\[|\]$/g, '')
  return address === 'localhost' || address === 'localhost.' || address === '::1'
    || address?.startsWith('127.') === true
    || address?.startsWith('::ffff:127.') === true
}

export function isTrustedCaller(request) {
  if (!request) return false
  const remote = request.socket?.remoteAddress || request.connection?.remoteAddress
  const site = request.headers?.['sec-fetch-site']
  if (site === 'cross-site') return false

  const host = request.headers?.['x-forwarded-host'] || request.headers?.['host']
  const origin = request.headers?.['origin']
  if (origin) {
    try {
      const url = new URL(origin)
      if (host && url.host.toLowerCase() === host.toLowerCase()) return true
      if (isLoopback(url.hostname) && isLoopback(remote)) return true
      return false
    } catch {
      return false
    }
  }

  const referer = request.headers?.['referer']
  if (referer) {
    try {
      const url = new URL(referer)
      if (host && url.host.toLowerCase() === host.toLowerCase()) return true
      if (isLoopback(url.hostname) && isLoopback(remote)) return true
      return false
    } catch {
      return false
    }
  }

  if (site === 'same-site') return false
  if (site === 'same-origin') return true
  if (isLoopback(remote)) return true

  return false
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
  currency: z.string().description('Currency symbol shown in the widget.').default('$'),
  usdRate: z.number().description('Units of `currency` per USD. 1 keeps everything in USD.').default(1),
  displayTimeZone: z
    .string()
    .description('IANA zone the widget shows tariff hours in.')
    .default('Europe/Moscow'),
  budgetThreshold: z
    .number()
    .description('Optional session budget threshold in USD. 0 disables threshold warnings.')
    .default(0),
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

// ---------------------------------------------------------------------------
// Per-model usage projection
// ---------------------------------------------------------------------------

const ZERO = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

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
 * Half-hour slot of the UTC day an event falls into (0..47).
 */
export function slotOf(timeMs) {
  let ms = typeof timeMs === 'number' && Number.isFinite(timeMs) ? timeMs : NaN
  if (Number.isNaN(ms)) {
    if (timeMs instanceof Date && !Number.isNaN(timeMs.getTime())) {
      ms = timeMs.getTime()
    } else {
      ms = Date.now()
    }
  }
  const d = new Date(ms)
  return Math.floor((d.getUTCHours() * 60 + d.getUTCMinutes()) / 30)
}

const modelSlotsSchema = zod.record(zod.string(), bucketSchema)

const costByModelViewSchema = zod.object({
  models: zod.array(zod.object({
    provider: zod.string(),
    model: zod.string(),
    slots: modelSlotsSchema,
  }).strict()),
}).strict()

const costByModelStateSchema = zod.object({
  route: zod.object({
    provider: zod.string(),
    model: zod.string(),
  }).nullable(),
  byKey: zod.record(zod.string(), modelSlotsSchema),
  last: zod.object({
    turn: zod.number().int().nonnegative(),
    step: zod.number().int().nonnegative(),
    key: zod.string(),
    slot: zod.string(),
    buckets: bucketSchema,
  }).nullable(),
}).strict()

export const usageByModelProjection = {
  key: 'costByModel',
  stateVersion: 2,
  stateSchema: costByModelStateSchema,
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
  wire: {
    viewSchema: costByModelViewSchema,
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
  },
}

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
  if (slash < 0) return { provider: '', model: str }
  return { provider: str.slice(0, slash), model: str.slice(slash + 1) }
}

export function apply(ctx, config) {
  let current = config
  let catalog = { index: { byId: {}, byLowerId: {}, bySuffix: {} }, fetchedAt: 0, error: null }
  let lastManualRefreshAt = 0

  // Server-side cache for resolved tariffs: key -> { schedule, source, matchedId }
  const resolveCache = new Map()

  function getCachedTariff(cfg, route) {
    if (!route) return resolveTariff(cfg, catalog.index, route)
    const cacheKey = (route.provider || '') + '/' + (route.model || '')
    if (resolveCache.has(cacheKey)) return resolveCache.get(cacheKey)
    const res = resolveTariff(cfg, catalog.index, route)
    // Limit cache size to prevent runaway memory
    if (resolveCache.size >= 500) resolveCache.clear()
    resolveCache.set(cacheKey, res)
    return res
  }

  function clearResolveCache() {
    resolveCache.clear()
  }

  // Disk cache survives restarts, so a boot without network still prices.
  try {
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    if (cached && Array.isArray(cached.models)) {
      catalog = { index: indexCatalog(cached.models), fetchedAt: cached.fetchedAt || 0, error: null }
    }
  } catch {
    // absent or unreadable cache is normal on first run
  }

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
      } catch {
        // a read-only storages dir only costs us the restart-time cache
      }
    } catch (error) {
      catalog = { ...catalog, error: String((error && error.message) || error) }
    }
  }

  // Live config reaction from GUI / settings service
  ctx.on('settings/updated', (ns, next) => {
    if (ns === NS && next) {
      current = { ...config, ...next }
      clearResolveCache()
    }
  })

  ctx.on('settings/document-updated', (ns) => {
    if (!ns || ns === NS) {
      clearResolveCache()
    }
  })

  ctx.inject(['settings'], (sctx) => {
    if (typeof sctx.settings?.describe === 'function') {
      try {
        const desc = sctx.settings.describe(NS)
        if (desc?.value && typeof desc.value === 'object') {
          current = { ...config, ...desc.value }
          clearResolveCache()
        }
      } catch {
        /* namespace might not have descriptor yet */
      }
    }
  })

  // Hook the session projection so the widget can show spend breakdown.
  ctx.inject(['sessionProjections'], (pctx) => {
    pctx.sessionProjections.register(usageByModelProjection)
  })

  // Route 1: POST /dsh-cost-meter/refresh (manual catalog reload)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: REFRESH_PATH,
        method: 'POST',
        handler: async (req, res) => {
          if (!isTrustedCaller(req)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const now = Date.now()
          if (now - lastManualRefreshAt < 60_000) {
            res.writeHead(429, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'rate_limited', retryAfterMs: 60_000 - (now - lastManualRefreshAt) }))
            return
          }
          lastManualRefreshAt = now
          await refresh(null, true)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: !catalog.error,
              fetchedAt: catalog.fetchedAt,
              models: Object.keys((catalog.index && catalog.index.byId) || {}).length,
              error: catalog.error,
            }),
          )
        },
      }),
    'dsh-cost-meter: refresh route',
  )

  // Route 2: GET /dsh-cost-meter/state (the browser poller hits this)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: STATE_PATH,
        method: 'GET',
        handler: async (req, res) => {
          const cfg = current ?? config

          // On the very first request after boot, wait for the fetch if we have
          // no disk cache either. Later runs refresh in the background.
          if (!catalog.fetchedAt && !catalog.error) {
            await refresh()
          } else {
            void refresh()
          }

          const route = defaultRoute(ctx) ?? null
          const own = getCachedTariff(cfg, route)

          // Also resolve tariffs for any session routes requested in query params
          const schedules = {}
          const url = new URL(req.url, 'http://localhost')
          const extraRoutes = url.searchParams.getAll('route')
          for (const key of extraRoutes) {
            const parsed = splitRoute(key)
            if (parsed) {
              const res = getCachedTariff(cfg, parsed)
              if (res && res.schedule) schedules[key] = res.schedule
            }
          }

          const payloadObj = {
            currency: cfg.currency,
            usdRate: cfg.usdRate,
            displayTimeZone: cfg.displayTimeZone || 'Europe/Moscow',
            budgetThreshold: Number(cfg.budgetThreshold) || 0,
            route,
            source: own.source,
            matchedId: own.matchedId,
            schedules,
            fetchedAt: catalog.fetchedAt || null,
            catalogError: catalog.error,
            catalogModelsCount: Object.keys((catalog.index && catalog.index.byId) || {}).length,
            schedule: own.schedule,
          }

          const serialized = JSON.stringify(payloadObj)
          const etag = 'W/"' + createHash('sha1').update(serialized).digest('base64url').slice(0, 16) + '"'

          if (req.headers['if-none-match'] === etag) {
            res.writeHead(304, {
              'ETag': etag,
              'Cache-Control': 'no-cache',
            })
            res.end()
            return
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'ETag': etag,
          })
          res.end(serialized)
        },
      }),
    'dsh-cost-meter: state route',
  )

  // Route 3: /dsh-cost-meter/update (in-app one-click updater)
  if (ctx.webServer?.register) {
    ctx.effect(() => registerPluginUpdater(ctx, {
      endpoint: '/dsh-cost-meter/update',
      packageName: name,
      manifestUrl: new URL('../package.json', import.meta.url),
    }), 'dsh-cost-meter: updater')
  }

}
