// dsh-cost-meter — HTTP routes registration for webServer service.
import { createHash } from 'node:crypto'
import { registerPluginUpdater } from './updater.js'
import { getLastTurns } from './projection.js'
import { calculateBurnRateAndProjection, calculateContextMetrics, calculateCostVelocity, analyzePromptAnatomy, detectTokenWaste, simulateModelCosts, getBurnRateSeries, calculateAdvancedTrajectoryForecast, evaluatePruningTriggers, captureDiagnosticSnapshot } from './analytics.js'
import { getCachedFxState } from './fx.js'

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
  const recentSnapshots = []

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

          const url = new URL(req.url, 'http://localhost')
          const currentQueryRoute = url.searchParams.get('currentRoute') || url.searchParams.get('model')
          const parsedCurrent = currentQueryRoute ? splitRoute(currentQueryRoute) : null
          const route = parsedCurrent ?? (defaultRoute(ctx) ?? null)
          const own = getCachedTariff(cfg, route)

          // Also resolve tariffs for any session routes requested in query params
          const schedules = {}
          const extraRoutes = [
            ...url.searchParams.getAll('route'),
            ...url.searchParams.getAll('models').flatMap((m) => m.split(',')),
          ]
          for (const key of extraRoutes) {
            if (!key) continue
            const parsed = splitRoute(key)
            if (parsed) {
              const res = getCachedTariff(cfg, parsed)
              if (res && res.schedule) {
                schedules[key] = res.schedule
                if (parsed.model) schedules[parsed.model] = res.schedule
              }
            }
          }

          const turnsList = getLastTurns()
          const fxRateVal = Number(cfg?.usdRate) > 0 ? Number(cfg.usdRate) : 1
          const ctxMetrics = calculateContextMetrics(turnsList, own, route)
          const costVelocity = calculateCostVelocity(turnsList, 0)
          const promptAnatomy = analyzePromptAnatomy(turnsList, ctxMetrics.currentTokens)
          const tokenWaste = detectTokenWaste(turnsList, 0, own)
          const trajectoryForecast = calculateAdvancedTrajectoryForecast(turnsList, 0)
          const pruningTrigger = evaluatePruningTriggers(turnsList, ctxMetrics.currentTokens, ctxMetrics.contextLength, 0, own)

          if (costVelocity.isAnomaly) {
            const lastSnap = recentSnapshots[recentSnapshots.length - 1]
            const curTurn = (turnsList && turnsList.length > 0) ? turnsList[turnsList.length - 1].turn : 1
            if (!lastSnap || lastSnap.turn !== curTurn) {
              const snap = captureDiagnosticSnapshot(turnsList, costVelocity, route)
              recentSnapshots.push(snap)
              if (recentSnapshots.length > 5) recentSnapshots.shift()
            }
          }

          const payloadObj = {
            currency: typeof cfg?.currency === 'string' && cfg.currency ? cfg.currency : '$',
            usdRate: Number(cfg?.usdRate) > 0 ? Number(cfg.usdRate) : 1,
            fxRates: { USD: 1, ...(getCachedFxState().rates || {}) },
            displayTimeZone: typeof cfg?.displayTimeZone === 'string' && cfg.displayTimeZone ? cfg.displayTimeZone : 'Europe/Moscow',
            budgetThreshold: Number(cfg?.budgetThreshold) || 0,
            privacyMode: Boolean(cfg?.privacyMode),
            showHeaderChip: cfg?.showHeaderChip !== false,
            showMessageAction: cfg?.showMessageAction !== false,
            displayMode: cfg?.displayMode || 'auto',
            alertBeforeSwitch: cfg?.alertBeforeSwitch !== false,
            alertLeadMinutes: Number(cfg?.alertLeadMinutes) || 5,
            browserNotifications: Boolean(cfg?.browserNotifications),
            route,
            source: own.source,
            matchedId: own.matchedId,
            schedules,
            turns: getLastTurns(),
            burnRatePerHourUsd: calculateBurnRateAndProjection(getLastTurns(), 0).burnRatePerHourUsd,
            projectedCostUsd: calculateBurnRateAndProjection(getLastTurns(), 0).projectedCostUsd,
            velocity: costVelocity,
            promptAnatomy,
            tokenWaste,
            modelSimulator: simulateModelCosts(turnsList, 0, route?.model),
            burnRateSeries: getBurnRateSeries(turnsList),
            trajectoryForecast,
            pruningTrigger,
            latestSnapshot: recentSnapshots[recentSnapshots.length - 1] || null,
            fetchedAt: catalog.fetchedAt || null,
            catalogError: catalog.error,
            catalogModelsCount: Object.keys((catalog.index && catalog.index.byId) || {}).length,
            schedule: own.schedule,
            contextMetrics: {
              currentTokens: ctxMetrics.currentTokens,
              contextLength: ctxMetrics.contextLength,
              saturationPercent: ctxMetrics.saturationPercent,
              riskLevel: ctxMetrics.riskLevel,
              nextTurnEstUsd: ctxMetrics.nextTurnEstUsd,
              nextTurnEstLocal: ctxMetrics.nextTurnEstUsd * fxRateVal,
            },
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