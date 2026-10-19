// dsh-cost-meter — HTTP routes registration for webServer service.
import { createHash } from 'node:crypto'
import { registerPluginUpdater } from './updater.js'
import { getLastTurns } from './projection.js'
import { calculateBurnRateAndProjection } from './analytics.js'

export const STATE_PATH = '/dsh-cost-meter/state'
export const REFRESH_PATH = '/dsh-cost-meter/refresh'

export function registerRoutes(ctx, options) {
  const {
    name,
    isTrustedCaller,
    getCachedTariff,
    refresh,
    splitRoute,
    defaultRoute,
    getCurrentConfig,
    getCatalog,
  } = options

  let lastManualRefreshAt = 0

  // Route 1: POST /dsh-cost-meter/refresh (manual catalog reload)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: REFRESH_PATH,
        method: 'POST',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
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
          const catalog = getCatalog()
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
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const cfg = getCurrentConfig()
          let catalog = getCatalog()

          // On the very first request after boot, wait for the fetch if we have
          // no disk cache either. Later runs refresh in the background.
          if (!catalog.fetchedAt && !catalog.error) {
            await refresh()
            catalog = getCatalog()
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
            currency: typeof cfg?.currency === 'string' && cfg.currency ? cfg.currency : '$',
            usdRate: Number(cfg?.usdRate) > 0 ? Number(cfg.usdRate) : 1,
            displayTimeZone: typeof cfg?.displayTimeZone === 'string' && cfg.displayTimeZone ? cfg.displayTimeZone : 'Europe/Moscow',
            budgetThreshold: Number(cfg?.budgetThreshold) || 0,
            displayMode: cfg?.displayMode || 'auto',
            route,
            source: own.source,
            matchedId: own.matchedId,
            schedules,
            turns: getLastTurns(),
            burnRatePerHourUsd: calculateBurnRateAndProjection(getLastTurns(), 0).burnRatePerHourUsd,
            projectedCostUsd: calculateBurnRateAndProjection(getLastTurns(), 0).projectedCostUsd,
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