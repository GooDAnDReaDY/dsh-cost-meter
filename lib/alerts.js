// dsh-cost-meter — tariff transition alerts logic (Issue #117).

export function inWindow(minute, w) {
  return w.start < w.end
    ? minute >= w.start && minute < w.end
    : minute >= w.start || minute < w.end
}

export function ratesAt(schedule, minute) {
  if (!schedule) return { cacheHit: 0, input: 0, cacheWrite: 0, output: 0 }
  const m = ((minute % 1440) + 1440) % 1440
  for (const w of schedule.windows || []) {
    if (inWindow(m, w)) return w.rates
  }
  return schedule.base || { cacheHit: 0, input: 0, cacheWrite: 0, output: 0 }
}

export function minutesUntilChange(schedule, minute) {
  if (!schedule || !schedule.windows || schedule.windows.length === 0) return 0
  const m = ((minute % 1440) + 1440) % 1440
  const edges = []
  for (const w of schedule.windows) {
    if (typeof w.start === 'number') edges.push(w.start)
    if (typeof w.end === 'number') edges.push(w.end)
  }
  if (edges.length === 0) return 0
  edges.sort((a, b) => a - b)
  for (const edge of edges) {
    if (edge > m) return edge - m
  }
  return 1440 - m + edges[0]
}

/**
 * Check whether the current minute falls into the pre-switch alert window.
 * Returns an alert descriptor or null if no alert is triggered.
 */
export function checkTariffAlert(options) {
  const {
    schedule,
    minute,
    leadMinutes = 5,
    enabled = true,
  } = options || {}

  if (!enabled || !schedule || !Array.isArray(schedule.windows) || schedule.windows.length === 0) {
    return null
  }

  const m = ((minute % 1440) + 1440) % 1440
  const left = minutesUntilChange(schedule, m)
  const lead = Math.max(1, Math.min(30, Number(leadMinutes) || 5))

  if (left <= 0 || left > lead) {
    return null
  }

  const currentRates = ratesAt(schedule, m)
  const nextMinute = (m + left + 1) % 1440
  const nextRates = ratesAt(schedule, nextMinute)

  const isSwitchingToPeak = (nextRates.output || 0) > (currentRates.output || 0)
  const isSwitchingToOffPeak = (nextRates.output || 0) < (currentRates.output || 0)

  // If rates do not change between current and next window, no alert
  if (!isSwitchingToPeak && !isSwitchingToOffPeak) {
    return null
  }

  const direction = isSwitchingToPeak ? 'peak' : 'offpeak'
  // Stable transition window key to deduplicate notifications within the same switch
  const targetMinute = (m + left) % 1440
  const transitionKey = `${targetMinute}:${direction}`

  return {
    direction,
    leftMinutes: left,
    transitionKey,
    currentRates,
    nextRates,
    targetMinute,
  }
}

/**
 * Generate human-readable alert message in English and Chinese.
 */
export function formatAlertMessage(alert, locale = 'en') {
  if (!alert) return ''
  const isPeak = alert.direction === 'peak'
  const min = alert.leftMinutes
  if (locale === 'zh') {
    return isPeak
      ? `高峰期计费将在 ${min} 分钟后开始`
      : `特惠期将在 ${min} 分钟后开始（5折优惠）`
  }
  return isPeak
    ? `Peak tariff starts in ${min} min (higher rates)`
    : `Off-peak discount starts in ${min} min (-50% savings)`
}
