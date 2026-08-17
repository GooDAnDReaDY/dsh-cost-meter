// dsh-cost-meter — host half.
//
// The harness deliberately does not price anything: pi-ai carries a `cost`
// field but zeroes it, and no consumer reports spend. So the rate card lives
// here, in plugin config, and the browser half does the arithmetic over the
// `tokenUsage` projection that dsh-token-meter already publishes.
//
// This half owns three things:
//   1. the rate card + tariff windows (Config, editable in the Web GUI);
//   2. GET /dsh-cost-meter/state — the browser reads the effective config and
//      the current default route from here (loopback-fenced, same origin);
//   3. nothing else. No per-turn hooks: the widget is a pure reader, so it
//      cannot corrupt a session the way an injector can.

import z from '@deepseek-ai/schemastery'

export const name = 'dsh-cost-meter'
export const inject = ['webServer']

/** Settings namespace owning the GUI-editable rate card. */
const NS = 'dsh-cost-meter'
const STATE_PATH = '/dsh-cost-meter/state'

/** One route's rate card, in USD per 1M tokens, at the PEAK (undiscounted) rate. */
const PriceRow = z.object({
  cacheHit: z.number().description('Input tokens served from the provider cache.').default(0),
  input: z.number().description('Input tokens that missed the cache.').default(0),
  cacheWrite: z.number().description('Input tokens written into the cache.').default(0),
  output: z.number().description('Output tokens (reasoning included).').default(0),
})

export const Config = z.object({
  currency: z
    .string()
    .description('Currency symbol shown in the chip.')
    .default('$'),
  usdRate: z
    .number()
    .description('How many units of `currency` one USD buys. 1 keeps everything in USD.')
    .default(1),
  peakWindowsUtc: z
    .array(z.string())
    .description('Peak windows as HH:MM-HH:MM in UTC. A window may wrap past midnight.')
    .default([]),
  offPeakMultiplier: z
    .number()
    .description('Multiplier applied to every rate outside the peak windows.')
    .default(1),
  prices: z
    .dict(PriceRow)
    .description('Rate card keyed by "provider/model". The key "*" is the fallback.')
    .default({}),
})

/** Parse "HH:MM-HH:MM" into minutes-from-midnight, or undefined when malformed. */
export function parseWindow(spec) {
  const match = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(spec).trim())
  if (!match) return undefined
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  if (start > 1439 || end > 1440 || Number(match[2]) > 59 || Number(match[4]) > 59) return undefined
  return { start, end }
}

/**
 * Resolve the agent's default provider/model without depending on the plugin
 * that owns that namespace: read it off the settings descriptors when the
 * settings service is mounted, and report nothing when it is not.
 */
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
  // Live config: the composition entry is the base layer, the GUI writes on
  // top of it. Falls back to the entry when the settings service is absent.
  let current = config
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, Config, { base: config })
    current = scope.get() ?? config
    const stop = scope.watch(() => {
      current = scope.get() ?? config
    })
    sctx.effect(() => () => {
      stop()
      current = config
    })
  })

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
          const body = {
            currency: cfg.currency,
            usdRate: cfg.usdRate,
            offPeakMultiplier: cfg.offPeakMultiplier,
            peakWindowsUtc: (cfg.peakWindowsUtc ?? []).filter((w) => parseWindow(w) !== undefined),
            prices: cfg.prices ?? {},
            route: defaultRoute(ctx) ?? null,
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify(body))
        },
      }),
    'dsh-cost-meter: state route',
  )
}
