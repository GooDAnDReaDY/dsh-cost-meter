// dsh-cost-meter — HTTP routes registration for webServer service.
import { createHash } from 'node:crypto'
import { registerPluginUpdater } from './updater.js'
import { getLastTurns, setActiveTariffRates, getActiveTariffRates } from './projection.js'
import { checkTariffAlert, formatAlertMessage } from './alerts.js'
import { getBudgetStatus, resetBudgetCaps } from './budget.js'
import { calculateBurnRateAndProjection, calculateContextMetrics, calculateCostVelocity, analyzePromptAnatomy, detectTokenWaste, simulateModelCosts, getBurnRateSeries, calculateAdvancedTrajectoryForecast, evaluatePruningTriggers, captureDiagnosticSnapshot } from './analytics.js'
import { getCachedFxState } from './fx.js'
import { METRICS_PATH, renderPrometheusMetrics } from './metrics.js'
import { getCacheTtlStatus, performCacheWarmup } from './warmup.js'
import { getActiveSessionTag, setActiveSessionTag, getTagsReport } from './tags.js'
import { getAgentsSpendReport } from './agents.js'
import { analyzeCacheEfficiency } from './advisor.js'

export const STATE_PATH = '/dsh-cost-meter/state'
export const REFRESH_PATH = '/dsh-cost-meter/refresh'
export const WARMUP_PATH = '/dsh-cost-meter/warmup'
export const TAGS_PATH = '/dsh-cost-meter/tags'
export const SESSION_TAG_PATH = '/dsh-cost-meter/session-tag'
export { METRICS_PATH } from './metrics.js'

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

  // Helper for reading JSON body safely
  const readJsonBody = async (req) => {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => { body += chunk; if (body.length > 65536) req.destroy() })
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}) } catch { resolve({}) }
      })
      req.on('error', () => resolve({}))
    })
  }

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

          const schedules = {}
          const extraRoutes = [
            ...url.searchParams.getAll('route'),
            ...url.searchParams.getAll('models').flatMap((m) => m.split(',')),
          ].slice(0, 50)
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

          if (own && own.rates) {
            setActiveTariffRates(own.rates)
          }
          const turnsList = getLastTurns()
          const sessionTotalUsd = turnsList.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || 0), 0)
          const fxRateVal = Number(cfg?.usdRate) > 0 ? Number(cfg.usdRate) : 1
          const ctxMetrics = calculateContextMetrics(turnsList, own, route)
          const costVelocity = calculateCostVelocity(turnsList, sessionTotalUsd)
          const promptAnatomy = analyzePromptAnatomy(turnsList, ctxMetrics.currentTokens)
          const tokenWaste = detectTokenWaste(turnsList, sessionTotalUsd, own)
          const trajectoryForecast = calculateAdvancedTrajectoryForecast(turnsList, sessionTotalUsd)
          const pruningTrigger = evaluatePruningTriggers(turnsList, ctxMetrics.currentTokens, ctxMetrics.contextLength, sessionTotalUsd, own)
          const budget = getBudgetStatus(cfg)
          const cacheTtl = getCacheTtlStatus(cfg)
          const activeTag = getActiveSessionTag() || cfg?.defaultSessionTag || ''
          const tagsReport = getTagsReport()
          const agentAttribution = getAgentsSpendReport(turnsList, sessionTotalUsd, cfg?.currency || '$', fxRateVal)
          const cacheAdvice = analyzeCacheEfficiency(turnsList)
          const activeRates = getActiveTariffRates()
          const minuteOfDay = Math.floor((Date.now() / 60000) % 1440)
          const tariffAlert = checkTariffAlert({
            schedule: own?.schedule,
            minute: minuteOfDay,
            leadMinutes: Number(cfg?.alertLeadMinutes) || 5,
            enabled: cfg?.alertBeforeSwitch !== false,
          })
          const alertMessage = tariffAlert ? formatAlertMessage(tariffAlert, cfg?.displayLocale || 'en') : ''

          if (costVelocity.isAnomaly) {
            const lastSnap = recentSnapshots[recentSnapshots.length - 1]
            if (!lastSnap || (Date.now() - lastSnap.timestamp > 300000)) {
              const snap = captureDiagnosticSnapshot({
                turns: turnsList,
                contextMetrics: ctxMetrics,
                velocity: costVelocity,
                route,
                anomalyType: 'cost_velocity_spike',
              })
              recentSnapshots.push(snap)
              if (recentSnapshots.length > 5) recentSnapshots.shift()
            }
          }

          const payloadObj = {
            currency: typeof cfg?.currency === 'string' && cfg.currency ? cfg.currency : '$',
            usdRate: Number(cfg?.usdRate) || 1,
            autoFxRate: cfg?.autoFxRate !== false,
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
            gitCommitTrailers: Boolean(cfg?.gitCommitTrailers),
            smartTruncation: cfg?.smartTruncation !== false,
            truncationMaxTokens: Number(cfg?.truncationMaxTokens) || 10000,
            exportPrometheusMetrics: cfg?.exportPrometheusMetrics !== false,
            metricsPath: METRICS_PATH,
            dailySpendLimitUsd: Number(cfg?.dailySpendLimitUsd) || 0,
            monthlySpendLimitUsd: Number(cfg?.monthlySpendLimitUsd) || 0,
            budgetHardBlock: Boolean(cfg?.budgetHardBlock),
            budget,
            cacheKeepAliveEnabled: Boolean(cfg?.cacheKeepAliveEnabled),
            cacheTtlMinutes: Number(cfg?.cacheTtlMinutes) || 10,
            cacheTtl,
            activeTag,
            tagsReport,
            agentAttribution,
            cacheAdvice,
            activeRates,
            tariffAlert,
            alertMessage,
            budgetResetPath: '/dsh-cost-meter/budget/reset',
            warmupPath: WARMUP_PATH,
            tagsPath: TAGS_PATH,
            sessionTagPath: SESSION_TAG_PATH,
            route,
            source: own.source,
            matchedId: own.matchedId,
            schedules,
            turns: getLastTurns(),
            burnRatePerHourUsd: calculateBurnRateAndProjection(getLastTurns(), sessionTotalUsd).burnRatePerHourUsd,
            projectedCostUsd: calculateBurnRateAndProjection(getLastTurns(), sessionTotalUsd).projectedCostUsd,
            velocity: costVelocity,
            promptAnatomy,
            tokenWaste,
            modelSimulator: simulateModelCosts(turnsList, sessionTotalUsd, route?.model),
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

  // Route 4: GET /dsh-cost-meter/metrics (Prometheus / OpenTelemetry exporter - Issue #153)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: METRICS_PATH,
        method: 'GET',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const cfg = getCurrentConfig()
          if (cfg?.exportPrometheusMetrics === false) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'metrics exporter disabled' }))
            return
          }
          const turnsList = getLastTurns()
          const sessionTotalUsd = turnsList.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || 0), 0)
          const burnRate = calculateBurnRateAndProjection(turnsList, sessionTotalUsd)
          const budget = getBudgetStatus(cfg)
          const catalog = getCatalog()
          const route = defaultRoute ? defaultRoute(ctx) : null

          const output = renderPrometheusMetrics({
            turns: turnsList,
            burnRate,
            budgetStatus: budget,
            catalog,
            activeRoute: route,
          })

          res.writeHead(200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          })
          res.end(output)
        },
      }),
    'dsh-cost-meter: metrics route',
  )

  // Route 5: POST /dsh-cost-meter/warmup (Keep-Alive Cache Pre-warming - Issue #158)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: WARMUP_PATH,
        method: 'POST',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const cfg = getCurrentConfig()
          const turnsList = getLastTurns()
          const route = defaultRoute ? defaultRoute(ctx) : null
          const own = getCachedTariff(cfg, route)
          const ctxMetrics = calculateContextMetrics(turnsList, own, route)

          const result = performCacheWarmup(cfg, {
            currentTokens: ctxMetrics.currentTokens,
            inputRatePer1M: own?.rates?.input || 0.14,
          })

          res.writeHead(result.ok ? 200 : 400, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          })
          res.end(JSON.stringify(result))
        },
      }),
    'dsh-cost-meter: warmup route',
  )

  // Route 6: GET /dsh-cost-meter/tags (Client billing codes and project tags - Issue #157)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: TAGS_PATH,
        method: 'GET',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const report = getTagsReport()
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          })
          res.end(JSON.stringify(report))
        },
      }),
    'dsh-cost-meter: tags route',
  )

  // Route 7: POST /dsh-cost-meter/session-tag (Set billing code for session - Issue #157)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: SESSION_TAG_PATH,
        method: 'POST',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const body = await readJsonBody(req)
          const newTag = setActiveSessionTag(body.tag)
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          })
          res.end(JSON.stringify({ ok: true, activeTag: newTag }))
        },
      }),
    'dsh-cost-meter: session-tag route',
  )

  // Route 8: POST /dsh-cost-meter/budget/reset (Manual budget cap reset - Issue #186)
  ctx.effect(
    () =>
      ctx.webServer.register({
        path: '/dsh-cost-meter/budget/reset',
        method: 'POST',
        handler: async (req, res) => {
          if (!isTrustedCaller(req, ctx)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'forbidden' }))
            return
          }
          const cfg = getCurrentConfig()
          const updated = resetBudgetCaps({ config: cfg })
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          })
          res.end(JSON.stringify({ ok: true, budget: updated }))
        },
      }),
    'dsh-cost-meter: reset budget route',
  )
}
