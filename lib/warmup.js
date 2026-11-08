// dsh-cost-meter — Prompt cache keep-alive pre-warming scheduler (Issue #158)
// Extends prompt caching lifetime across pauses, saving up to 90% on long-context calls.

let lastCallTimestamp = 0
let lastWarmupTimestamp = 0
let totalPrewarmsCount = 0

export function recordCacheActivity(timestamp = Date.now()) {
  lastCallTimestamp = Number(timestamp) || Date.now()
  return lastCallTimestamp
}

export function resetCacheActivity() {
  lastCallTimestamp = 0
  lastWarmupTimestamp = 0
  totalPrewarmsCount = 0
}

export function getCacheTtlStatus(config = {}, options = {}) {
  const now = options.now || Date.now()
  const ttlMinutes = Math.max(1, Math.min(60, Number(config?.cacheTtlMinutes) || 10))
  const ttlMs = ttlMinutes * 60 * 1000
  const maxInactivityMinutes = Math.max(5, Math.min(180, Number(config?.cacheMaxInactivityMinutes) || 30))
  const maxInactivityMs = maxInactivityMinutes * 60 * 1000
  const enabled = Boolean(config?.cacheKeepAliveEnabled)

  const lastActivity = Math.max(lastCallTimestamp, lastWarmupTimestamp)
  const hasActivity = lastActivity > 0

  const elapsedMs = hasActivity ? (now - lastActivity) : Infinity
  const totalInactivityMs = lastCallTimestamp > 0 ? (now - lastCallTimestamp) : Infinity

  const remainingSeconds = hasActivity ? Math.max(0, Math.round((ttlMs - elapsedMs) / 1000)) : 0
  const isExpired = !hasActivity || remainingSeconds === 0
  const isExpiringSoon = !isExpired && remainingSeconds <= 60

  const withinMaxInactivity = totalInactivityMs <= maxInactivityMs
  const canKeepAlive = enabled && hasActivity && withinMaxInactivity && !isExpired

  return {
    enabled,
    ttlMinutes,
    lastCallTimestamp,
    lastWarmupTimestamp,
    remainingSeconds,
    isExpired,
    isExpiringSoon,
    canKeepAlive,
    prewarmsCount: totalPrewarmsCount,
    maxInactivityMinutes,
    isIdleTimedOut: totalInactivityMs > maxInactivityMs && lastCallTimestamp > 0,
  }
}

export function performCacheWarmup(config = {}, options = {}) {
  const now = options.now || Date.now()
  const status = getCacheTtlStatus(config, { ...options, now })

  if (status.isIdleTimedOut) {
    return {
      ok: false,
      status: 'idle_timeout',
      message: 'Keep-alive stopped due to inactivity exceeding ' + status.maxInactivityMinutes + ' minutes',
      ttlStatus: status,
    }
  }

  lastWarmupTimestamp = now
  totalPrewarmsCount++

  const ttlMinutes = status.ttlMinutes
  const ttlMs = ttlMinutes * 60 * 1000
  const expiresAt = now + ttlMs

  // Estimated financial savings based on prompt context (assuming 90% cache discount)
  const inputTokens = Math.max(1000, Number(options.currentTokens) || 8000)
  const inputRateUsd = Number(options.inputRatePer1M) || 0.14
  const estimatedSavingsUsd = Math.round((inputTokens / 1000000) * inputRateUsd * 0.9 * 10000) / 10000

  return {
    ok: true,
    status: 'prewarmed',
    warmedAt: now,
    expiresAt,
    prewarmsCount: totalPrewarmsCount,
    estimatedSavingsUsd,
    ttlStatus: getCacheTtlStatus(config, { ...options, now }),
  }
}
