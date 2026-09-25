// Tariff calculation, normalization, catalog indexing, and model matching.
// Extracted from lib/index.js for modularity (<600 LOC per file).

/**
 * DeepSeek's own tariff, from https://api-docs.deepseek.com/quick_start/pricing.
 * Their API publishes no prices (/models lists ids, there is no pricing route),
 * and OpenRouter's `deepseek/*` entries quote different numbers, so this table
 * is the authoritative source for the official route. Values are PEAK, USD per
 * 1M tokens; off-peak is exactly half. Peak: 01:00-04:00 and 06:00-10:00 UTC.
 */
export const DEEPSEEK_PEAK_RATES = {
  'deepseek-v4-flash': { cacheHit: 0.014, input: 0.44, cacheWrite: 0.44, output: 1.32 },
  'deepseek-v4-pro': { cacheHit: 0.044, input: 1.32, cacheWrite: 1.32, output: 3.96 },
}
export const DEEPSEEK_PEAK_WINDOWS = [{ start: 60, end: 240 }, { start: 360, end: 600 }]

/** Common provider / vendor aliases for seamless catalog matching. */
export const VENDOR_ALIASES = {
  'z-ai': 'zai',
  'zai': 'zai',
  'google': 'google',
  'gemini': 'google',
  'deepseek-ai': 'deepseek',
  'deepseek-official': 'deepseek',
  'deepseek': 'deepseek',
  'anthropic-ai': 'anthropic',
  'anthropic': 'anthropic',
  'openai': 'openai',
  'meta-llama': 'meta-llama',
  'meta': 'meta-llama',
}

/** OpenRouter prices are USD per token; the widget speaks per 1M tokens. */
export function perMillion(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n * 1e6 : 0
}

/** Pull the four buckets out of one OpenRouter pricing object. */
export function bucketsOf(pricing) {
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

export function overrideBucket(overrideVal, baseVal) {
  if (overrideVal !== undefined && overrideVal !== null && overrideVal !== '') {
    const n = Number(overrideVal)
    if (Number.isFinite(n)) return n * 1e6
  }
  return baseVal
}

/**
 * Normalize one catalog entry into the schedule the browser consumes:
 * a base rate card plus the discount windows that shadow it.
 */
export function scheduleOf(entry) {
  const pricing = entry.pricing || {}
  const base = bucketsOf(pricing)
  const windows = []
  for (const override of pricing.overrides || []) {
    const start = hhmmToMinutes(override.utc_start)
    const end = hhmmToMinutes(override.utc_end)
    if (start === undefined || end === undefined) continue
    // An override omits buckets it does not change; fall back to the base.
    // Explicit 0 in override must NOT fall back to non-zero base price.
    windows.push({
      start,
      end,
      rates: {
        cacheHit: overrideBucket(override.input_cache_read, base.cacheHit),
        input: overrideBucket(override.prompt, base.input),
        cacheWrite: overrideBucket(override.input_cache_write, base.cacheWrite),
        output: overrideBucket(override.completion, base.output),
      },
    })
  }
  return { base, windows }
}

/**
 * Map a harness route onto an OpenRouter id. Exact id first, then normalized
 * vendor alias + model, then vendor suffix.
 */
export function matchModel(index, route, modelMap) {
  if (!route || !index) return undefined
  const key = route.provider ? route.provider + '/' + route.model : route.model
  const mapped = modelMap && (modelMap[key] || modelMap[route.model])
  if (mapped && index.byId && index.byId[mapped]) return mapped
  if (index.byId && index.byId[key]) return key
  if (index.byId && index.byId[route.model]) return route.model

  // Provider alias check (e.g. z-ai -> zai, deepseek-official -> deepseek)
  const prov = String(route.provider || '').toLowerCase()
  const aliasProv = VENDOR_ALIASES[prov]
  if (aliasProv && route.model) {
    const aliasKey = (aliasProv + '/' + route.model).toLowerCase()
    if (index.byLowerId && index.byLowerId[aliasKey]) return index.byLowerId[aliasKey]
  }

  // Harness routes name models in their own casing (`MiniMax-M3`), the catalog
  // is lower-case (`minimax/minimax-m3`), so matching is case-insensitive.
  const lower = String(route.model).toLowerCase()
  const byLowerId = index.byLowerId || {}
  if (byLowerId[lower]) return byLowerId[lower]
  if (byLowerId[key.toLowerCase()]) return byLowerId[key.toLowerCase()]
  const bySuffix = index.bySuffix || {}
  const list = bySuffix[lower]
  if (!list || !list.length) return undefined
  if (list.length === 1) return list[0]

  // Multiple catalog entries share the same model suffix: disambiguate by provider
  if (route.provider) {
    const provLower = String(route.provider).toLowerCase()
    const normProv = VENDOR_ALIASES[provLower] || provLower
    const matched = list.find((id) => {
      const slash = id.indexOf('/')
      if (slash < 0) return false
      const prefix = id.slice(0, slash).toLowerCase()
      return prefix === normProv || prefix === provLower
    })
    if (matched) return matched
  }
  // Ambiguous suffix with no provider match: do not guess arbitrarily
  return undefined
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

/**
 * Resolve one route's tariff: manual config wins, then DeepSeek's own table,
 * then the OpenRouter catalog.
 */
export function resolveTariff(cfg, index, route) {
  if (!route) return { schedule: null, source: 'none', matchedId: null }
  const key = route.provider ? route.provider + '/' + route.model : route.model
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

  const providerLower = String(route.provider || '').toLowerCase()
  if (providerLower === 'openrouter' && cfg.useOpenRouter !== false) {
    const matchedId = matchModel(index, route, cfg.modelMap)
    if (matchedId) return { schedule: index.byId[matchedId], source: 'openrouter', matchedId }
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
