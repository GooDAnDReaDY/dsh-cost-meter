import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  renderPrometheusMetrics,
  METRICS_PATH,
  loadBudgetRecord,
  saveBudgetRecord,
  recordSpend,
  getBudgetStatus,
  resetBudgetCaps,
  getTodayKey,
  getCurrentMonthKey,
  Config,
  normalizeConfig,
} from '../lib/index.js'

test('Issue #153: METRICS_PATH is exported and equals /dsh-cost-meter/metrics', () => {
  assert.equal(METRICS_PATH, '/dsh-cost-meter/metrics')
})

test('Issue #153: renderPrometheusMetrics outputs standard format with gauges and counters', () => {
  const turns = [
    {
      turn: 1,
      model: 'deepseek-chat',
      provider: 'deepseek',
      costDeltaUsd: 0.0025,
      uncachedInputTokens: 1200,
      outputTokens: 400,
      cacheReadTokens: 3800,
      cacheWriteTokens: 0,
      reasoningTokens: 150,
    },
  ]
  const burnRate = { burnRatePerHourUsd: 0.15 }
  const budgetStatus = {
    dailyLimitUsd: 5.0,
    dailySpentUsd: 1.25,
    monthlyLimitUsd: 50.0,
    monthlySpentUsd: 12.5,
    isBlocked: false,
  }
  const catalog = {
    fetchedAt: 1794155000000,
    index: { byId: { 'deepseek/deepseek-chat': {} } },
  }

  const output = renderPrometheusMetrics({
    turns,
    burnRate,
    budgetStatus,
    catalog,
    activeRoute: { provider: 'deepseek', model: 'deepseek-chat' },
  })

  assert.ok(output.includes('# HELP dsh_cost_total_usd'), 'missing dsh_cost_total_usd HELP')
  assert.ok(output.includes('# TYPE dsh_cost_total_usd gauge'), 'missing dsh_cost_total_usd TYPE')
  assert.ok(output.includes('dsh_cost_total_usd{model="deepseek-chat",provider="deepseek"} 0.002500'))

  assert.ok(output.includes('# HELP dsh_tokens_total'), 'missing dsh_tokens_total HELP')
  assert.ok(output.includes('# TYPE dsh_tokens_total counter'), 'missing dsh_tokens_total TYPE')
  assert.ok(output.includes('dsh_tokens_total{model="deepseek-chat",provider="deepseek",type="uncached_input"} 1200'))
  assert.ok(output.includes('dsh_tokens_total{model="deepseek-chat",provider="deepseek",type="output"} 400'))
  assert.ok(output.includes('dsh_tokens_total{model="deepseek-chat",provider="deepseek",type="cache_read"} 3800'))
  assert.ok(output.includes('dsh_tokens_total{model="deepseek-chat",provider="deepseek",type="reasoning"} 150'))

  assert.ok(output.includes('# HELP dsh_cache_hit_ratio'), 'missing dsh_cache_hit_ratio HELP')
  assert.ok(output.includes('dsh_cache_hit_ratio{model="deepseek-chat",provider="deepseek"} 0.7600'))

  assert.ok(output.includes('dsh_session_burn_rate_usd_hour 0.1500'))
  assert.ok(output.includes('dsh_budget_daily_limit_usd 5.00'))
  assert.ok(output.includes('dsh_budget_daily_spent_usd 1.2500'))
  assert.ok(output.includes('dsh_budget_monthly_limit_usd 50.00'))
  assert.ok(output.includes('dsh_budget_monthly_spent_usd 12.5000'))
  assert.ok(output.includes('dsh_budget_auto_paused 0'))
  assert.ok(output.includes('dsh_catalog_models_total 1'))
})

test('Issue #153: renderPrometheusMetrics handles empty session without turns', () => {
  const output = renderPrometheusMetrics({
    turns: [],
    activeRoute: { provider: 'deepseek', model: 'deepseek-coder' },
  })
  assert.ok(output.includes('dsh_cost_total_usd{model="deepseek-coder",provider="deepseek"} 0.000000'))
  assert.ok(output.includes('dsh_session_burn_rate_usd_hour 0.0000'))
  assert.ok(output.includes('dsh_budget_auto_paused 0'))
})

test('Issue #134: getTodayKey and getCurrentMonthKey format dates correctly', () => {
  const testDate = new Date('2026-11-08T15:30:00Z')
  assert.equal(getTodayKey('UTC', testDate), '2026-11-08')
  assert.equal(getCurrentMonthKey('UTC', testDate), '2026-11')
})

test('Issue #134: loadBudgetRecord and saveBudgetRecord persist spend data safely', () => {
  const testFile = join(tmpdir(), 'dsh-test-budget-' + Date.now() + '.json')
  try {
    const initial = loadBudgetRecord(testFile)
    assert.equal(initial.daily.spentUsd, 0)
    assert.equal(initial.monthly.spentUsd, 0)

    const saved = saveBudgetRecord({
      daily: { date: '2026-11-08', spentUsd: 1.5 },
      monthly: { month: '2026-11', spentUsd: 15.0 },
      lastUpdated: 123456789,
    }, testFile)
    assert.ok(saved)

    const loaded = loadBudgetRecord(testFile)
    assert.equal(loaded.daily.date, '2026-11-08')
    assert.equal(loaded.daily.spentUsd, 1.5)
    assert.equal(loaded.monthly.month, '2026-11')
    assert.equal(loaded.monthly.spentUsd, 15.0)
  } finally {
    try { fs.unlinkSync(testFile) } catch {}
  }
})

test('Issue #134: recordSpend aggregates spend and handles daily & monthly rollovers', () => {
  const testFile = join(tmpdir(), 'dsh-test-budget-rollover-' + Date.now() + '.json')
  try {
    // Initial spend
    recordSpend(0.75, {
      filePath: testFile,
      timeZone: 'UTC',
      config: { dailySpendLimitUsd: 2.0, monthlySpendLimitUsd: 20.0 },
    })

    let status = getBudgetStatus({ dailySpendLimitUsd: 2.0, monthlySpendLimitUsd: 20.0 }, { filePath: testFile, timeZone: 'UTC' })
    assert.equal(status.dailySpentUsd, 0.75)
    assert.equal(status.dailyRemainingUsd, 1.25)
    assert.equal(status.isDailyExceeded, false)
    assert.equal(status.isBlocked, false)

    // Second spend exceeding daily limit
    recordSpend(1.50, {
      filePath: testFile,
      timeZone: 'UTC',
      config: { dailySpendLimitUsd: 2.0, monthlySpendLimitUsd: 20.0, budgetHardBlock: true },
    })

    status = getBudgetStatus({ dailySpendLimitUsd: 2.0, monthlySpendLimitUsd: 20.0, budgetHardBlock: true }, { filePath: testFile, timeZone: 'UTC' })
    assert.equal(status.dailySpentUsd, 2.25)
    assert.equal(status.isDailyExceeded, true)
    assert.equal(status.isBlocked, true)
    assert.equal(status.dailyRemainingUsd, 0)
    assert.equal(status.dailyProgressRatio, 1)

    // Reset caps
    resetBudgetCaps({ filePath: testFile, timeZone: 'UTC', config: { dailySpendLimitUsd: 2.0 } })
    const resetStatus = getBudgetStatus({ dailySpendLimitUsd: 2.0 }, { filePath: testFile, timeZone: 'UTC' })
    assert.equal(resetStatus.dailySpentUsd, 0)
    assert.equal(resetStatus.isDailyExceeded, false)
  } finally {
    try { fs.unlinkSync(testFile) } catch {}
  }
})

test('Issue #153 & #134: Config schema and normalizeConfig support new settings', () => {
  assert.ok(Config.dict.exportPrometheusMetrics !== undefined, 'exportPrometheusMetrics in Config')
  assert.ok(Config.dict.dailySpendLimitUsd !== undefined, 'dailySpendLimitUsd in Config')
  assert.ok(Config.dict.monthlySpendLimitUsd !== undefined, 'monthlySpendLimitUsd in Config')
  assert.ok(Config.dict.budgetHardBlock !== undefined, 'budgetHardBlock in Config')

  const norm = normalizeConfig({
    exportPrometheusMetrics: false,
    dailySpendLimitUsd: '5.5',
    monthlySpendLimitUsd: -10, // must clamp to 0
    budgetHardBlock: true,
  })

  assert.equal(norm.exportPrometheusMetrics, false)
  assert.equal(norm.dailySpendLimitUsd, 5.5)
  assert.equal(norm.monthlySpendLimitUsd, 0)
  assert.equal(norm.budgetHardBlock, true)
})

test('Issue #153 & #134: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexPath = join(new URL('.', import.meta.url).pathname, '../lib/index.js')
  const lines = fs.readFileSync(indexPath, 'utf8').split('\n').length
  assert.ok(lines < 320, `lib/index.js has ${lines} lines, must be strictly under 320 LOC`)
})
