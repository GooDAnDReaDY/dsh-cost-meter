// dsh-cost-meter — Daily and monthly spending caps with auto-pause (Issue #134)
// Persistent spend tracking across sessions in ~/.dsh/storages/dsh-cost-meter-budget.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const BUDGET_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'dsh-cost-meter-budget.json')

export function getTodayKey(timeZone = 'UTC', date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
    return parts // YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function getCurrentMonthKey(timeZone = 'UTC', date = new Date()) {
  try {
    const today = getTodayKey(timeZone, date)
    return today.slice(0, 7) // YYYY-MM
  } catch {
    return date.toISOString().slice(0, 7)
  }
}

export function loadBudgetRecord(filePath = BUDGET_FILE) {
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        daily: {
          date: String(parsed.daily?.date || ''),
          spentUsd: Number(parsed.daily?.spentUsd) || 0,
        },
        monthly: {
          month: String(parsed.monthly?.month || ''),
          spentUsd: Number(parsed.monthly?.spentUsd) || 0,
        },
        lastUpdated: Number(parsed.lastUpdated) || 0,
      }
    }
  } catch (err) {
    void err
  }
  return {
    daily: { date: '', spentUsd: 0 },
    monthly: { month: '', spentUsd: 0 },
    lastUpdated: 0,
  }
}

export function saveBudgetRecord(data, filePath = BUDGET_FILE) {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}

export function recordSpend(costDeltaUsd, options = {}) {
  const cost = Number(costDeltaUsd) || 0
  if (cost <= 0) return getBudgetStatus(options.config, options)

  const filePath = options.filePath || BUDGET_FILE
  const tz = options.timeZone || options.config?.displayTimeZone || 'UTC'
  const today = getTodayKey(tz)
  const currentMonth = getCurrentMonthKey(tz)

  const record = loadBudgetRecord(filePath)

  // Rollover day if date changed
  if (record.daily.date !== today) {
    record.daily.date = today
    record.daily.spentUsd = 0
  }

  // Rollover month if month changed
  if (record.monthly.month !== currentMonth) {
    record.monthly.month = currentMonth
    record.monthly.spentUsd = 0
  }

  record.daily.spentUsd = Math.round((record.daily.spentUsd + cost) * 1000000) / 1000000
  record.monthly.spentUsd = Math.round((record.monthly.spentUsd + cost) * 1000000) / 1000000
  record.lastUpdated = Date.now()

  saveBudgetRecord(record, filePath)
  return getBudgetStatus(options.config, { ...options, budgetRecord: record })
}

export function getBudgetStatus(config = {}, options = {}) {
  const filePath = options.filePath || BUDGET_FILE
  const tz = options.timeZone || config?.displayTimeZone || 'UTC'
  const today = getTodayKey(tz)
  const currentMonth = getCurrentMonthKey(tz)

  const record = options.budgetRecord || loadBudgetRecord(filePath)

  let dailySpent = Number(record.daily?.spentUsd) || 0
  if (record.daily?.date && record.daily.date !== today) {
    dailySpent = 0
  }

  let monthlySpent = Number(record.monthly?.spentUsd) || 0
  if (record.monthly?.month && record.monthly.month !== currentMonth) {
    monthlySpent = 0
  }

  const dailyLimit = Math.max(0, Number(config?.dailySpendLimitUsd) || 0)
  const monthlyLimit = Math.max(0, Number(config?.monthlySpendLimitUsd) || 0)
  const hardBlock = Boolean(config?.budgetHardBlock)

  const isDailyExceeded = dailyLimit > 0 && dailySpent >= dailyLimit
  const isMonthlyExceeded = monthlyLimit > 0 && monthlySpent >= monthlyLimit
  const isBlocked = hardBlock && (isDailyExceeded || isMonthlyExceeded)

  const dailyRemaining = dailyLimit > 0 ? Math.max(0, dailyLimit - dailySpent) : null
  const monthlyRemaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - monthlySpent) : null

  const dailyRatio = dailyLimit > 0 ? Math.min(1, dailySpent / dailyLimit) : 0
  const monthlyRatio = monthlyLimit > 0 ? Math.min(1, monthlySpent / monthlyLimit) : 0

  return {
    dailyLimitUsd: dailyLimit,
    dailySpentUsd: Math.round(dailySpent * 10000) / 10000,
    dailyRemainingUsd: dailyRemaining !== null ? Math.round(dailyRemaining * 10000) / 10000 : null,
    dailyProgressRatio: Math.round(dailyRatio * 1000) / 1000,
    isDailyExceeded,

    monthlyLimitUsd: monthlyLimit,
    monthlySpentUsd: Math.round(monthlySpent * 10000) / 10000,
    monthlyRemainingUsd: monthlyRemaining !== null ? Math.round(monthlyRemaining * 10000) / 10000 : null,
    monthlyProgressRatio: Math.round(monthlyRatio * 1000) / 1000,
    isMonthlyExceeded,

    hardBlock,
    isBlocked,
    date: today,
    month: currentMonth,
  }
}

export function resetBudgetCaps(options = {}) {
  const filePath = options.filePath || BUDGET_FILE
  const tz = options.timeZone || options.config?.displayTimeZone || 'UTC'
  const record = {
    daily: { date: getTodayKey(tz), spentUsd: 0 },
    monthly: { month: getCurrentMonthKey(tz), spentUsd: 0 },
    lastUpdated: Date.now(),
  }
  saveBudgetRecord(record, filePath)
  return getBudgetStatus(options.config, { ...options, budgetRecord: record })
}
