// dsh-cost-meter — Live Foreign Exchange (FX) rate provider.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const CBR_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'
const OPEN_ER_URL = 'https://open.er-api.com/v6/latest/USD'
const FX_CACHE_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'dsh-cost-meter-fx.json')
const FX_TTL_MS = 12 * 3600_000 // 12 hours

let inMemoryCache = {
  fetchedAt: 0,
  rates: { RUB: 80, EUR: 0.92, CNY: 7.15 },
}

// Load disk cache synchronously on module load
try {
  const cached = JSON.parse(readFileSync(FX_CACHE_FILE, 'utf8'))
  if (cached && typeof cached === 'object' && cached.rates) {
    inMemoryCache = {
      fetchedAt: Number(cached.fetchedAt) || 0,
      rates: { ...inMemoryCache.rates, ...cached.rates },
    }
  }
} catch {
  // safe fallback to defaults on fresh install or read-only filesystem
}

export function normalizeCurrencyCode(symbolOrCode) {
  const str = String(symbolOrCode || '').trim().toUpperCase()
  if (str === '₽' || str === 'RUB' || str === 'РУБ') return 'RUB'
  if (str === '€' || str === 'EUR') return 'EUR'
  if (str === '¥' || str === 'CNY' || str === 'RMB') return 'CNY'
  if (str === '$' || str === 'USD') return 'USD'
  return str
}

export function parseCbrRates(body) {
  if (!body || !body.Valute || typeof body.Valute !== 'object') return null
  const usd = Number(body.Valute.USD && body.Valute.USD.Value)
  const eur = Number(body.Valute.EUR && body.Valute.EUR.Value)
  const cny = Number(body.Valute.CNY && body.Valute.CNY.Value)
  if (!usd || usd <= 0) return null

  const rates = { RUB: Math.round(usd * 1000) / 1000 }
  if (eur > 0) rates.EUR = Math.round((usd / eur) * 10000) / 10000
  if (cny > 0) rates.CNY = Math.round((usd / cny) * 1000) / 1000
  return rates
}

export function parseOpenErRates(body) {
  if (!body || !body.rates || typeof body.rates !== 'object') return null
  const r = body.rates
  const rates = {}
  if (Number(r.RUB) > 0) rates.RUB = Math.round(Number(r.RUB) * 1000) / 1000
  if (Number(r.EUR) > 0) rates.EUR = Math.round(Number(r.EUR) * 10000) / 10000
  if (Number(r.CNY) > 0) rates.CNY = Math.round(Number(r.CNY) * 1000) / 1000
  return Object.keys(rates).length ? rates : null
}

export async function fetchLiveRates(signal) {
  // 1. Primary: CBR daily JSON
  try {
    const cbrSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000)
    const res = await fetch(CBR_URL, { signal: cbrSignal, headers: { accept: 'application/json' } })
    if (res.ok) {
      const parsed = parseCbrRates(await res.json())
      if (parsed) return parsed
    }
  } catch {
    // fallback to secondary
  }

  // 2. Secondary: Open Exchange Rates API (open.er-api.com)
  try {
    const fallbackSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000)
    const res = await fetch(OPEN_ER_URL, { signal: fallbackSignal, headers: { accept: 'application/json' } })
    if (res.ok) {
      const parsed = parseOpenErRates(await res.json())
      if (parsed) return parsed
    }
  } catch {
    // fail-safe
  }

  return null
}

export async function refreshFxRates(signal, force = false) {
  const age = Date.now() - inMemoryCache.fetchedAt
  if (!force && inMemoryCache.fetchedAt > 0 && age < FX_TTL_MS) {
    return inMemoryCache.rates
  }
  const fresh = await fetchLiveRates(signal)
  if (fresh) {
    inMemoryCache = {
      fetchedAt: Date.now(),
      rates: { ...inMemoryCache.rates, ...fresh },
    }
    try {
      mkdirSync(dirname(FX_CACHE_FILE), { recursive: true })
      writeFileSync(FX_CACHE_FILE, JSON.stringify(inMemoryCache))
    } catch {
      // transient or read-only filesystem
    }
  }
  return inMemoryCache.rates
}

export function getFxRate(currencySymbolOrCode, manualRate, autoFx = true) {
  const code = normalizeCurrencyCode(currencySymbolOrCode)
  if (code === 'USD') return 1

  const fallback = Number(manualRate) > 0 ? Number(manualRate) : 1
  if (autoFx === false) return fallback

  const live = inMemoryCache.rates[code]
  if (live && Number(live) > 0) {
    return Number(live)
  }
  return fallback
}

export function getCachedFxState() {
  return {
    fetchedAt: inMemoryCache.fetchedAt,
    rates: { ...inMemoryCache.rates },
  }
}

