import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  checkTariffAlert,
  formatAlertMessage,
  minutesUntilChange,
  ratesAt,
} from '../lib/alerts.js'
import {
  formatCostReceipt,
  formatCostSummary,
  registerSlashCommand,
} from '../lib/commands.js'
import {
  turnRecordSchema,
  usageByModelProjection,
} from '../lib/projection.js'
import {
  Config,
  normalizeConfig,
} from '../lib/index.js'

const testSchedule = {
  base: { cacheHit: 0.014, input: 0.14, cacheWrite: 0.14, output: 0.28 },
  windows: [
    {
      start: 60, // 01:00 UTC
      end: 240, // 04:00 UTC
      rates: { cacheHit: 0.028, input: 0.28, cacheWrite: 0.28, output: 0.56 },
    },
    {
      start: 360, // 06:00 UTC
      end: 600, // 10:00 UTC
      rates: { cacheHit: 0.028, input: 0.28, cacheWrite: 0.28, output: 0.56 },
    },
  ],
}

// ------------------------------------------------------------- Issue #117 Tests
test('Issue #117: checkTariffAlert triggers correctly during pre-switch lead window', () => {
  // 00:56 UTC (56 min) -> 4 minutes before Peak starts at 60 min
  const alert1 = checkTariffAlert({
    schedule: testSchedule,
    minute: 56,
    leadMinutes: 5,
    enabled: true,
  })
  assert.ok(alert1, 'Alert must be triggered 4 min before peak')
  assert.equal(alert1.direction, 'peak')
  assert.equal(alert1.leftMinutes, 4)
  assert.equal(alert1.transitionKey, '60:peak')

  // 00:50 UTC (50 min) -> 10 minutes before Peak (outside 5-min lead)
  const alert2 = checkTariffAlert({
    schedule: testSchedule,
    minute: 50,
    leadMinutes: 5,
    enabled: true,
  })
  assert.equal(alert2, null, 'No alert should be triggered outside lead window')

  // 03:57 UTC (237 min) -> 3 minutes before Off-Peak starts at 240 min
  const alert3 = checkTariffAlert({
    schedule: testSchedule,
    minute: 237,
    leadMinutes: 5,
    enabled: true,
  })
  assert.ok(alert3, 'Alert must be triggered 3 min before off-peak')
  assert.equal(alert3.direction, 'offpeak')
  assert.equal(alert3.leftMinutes, 3)
  assert.equal(alert3.transitionKey, '240:offpeak')

  // Disabled alert returns null
  const alertDisabled = checkTariffAlert({
    schedule: testSchedule,
    minute: 56,
    leadMinutes: 5,
    enabled: false,
  })
  assert.equal(alertDisabled, null)

  // Flat schedule returns null
  const alertFlat = checkTariffAlert({
    schedule: { base: testSchedule.base, windows: [] },
    minute: 56,
    leadMinutes: 5,
    enabled: true,
  })
  assert.equal(alertFlat, null)
})

test('Issue #117: formatAlertMessage formats peak and offpeak messages in EN and ZH', () => {
  const peakAlert = { direction: 'peak', leftMinutes: 5 }
  const offpeakAlert = { direction: 'offpeak', leftMinutes: 3 }

  assert.ok(formatAlertMessage(peakAlert, 'en').includes('Peak tariff starts in 5 min'))
  assert.ok(formatAlertMessage(peakAlert, 'zh').includes('高峰期计费将在 5 分钟后开始'))

  assert.ok(formatAlertMessage(offpeakAlert, 'en').includes('Off-peak discount starts in 3 min'))
  assert.ok(formatAlertMessage(offpeakAlert, 'zh').includes('特惠期将在 3 分钟后开始'))
})

test('Issue #117: Config schema and normalizeConfig support alert fields', () => {
  const norm = normalizeConfig({})
  assert.equal(norm.alertBeforeSwitch, true)
  assert.equal(norm.alertLeadMinutes, 5)
  assert.equal(norm.browserNotifications, false)

  const custom = normalizeConfig({
    alertBeforeSwitch: false,
    alertLeadMinutes: 10,
    browserNotifications: true,
  })
  assert.equal(custom.alertBeforeSwitch, false)
  assert.equal(custom.alertLeadMinutes, 10)
  assert.equal(custom.browserNotifications, true)
})

// ------------------------------------------------------------- Issue #120 Tests
test('Issue #120: turnRecordSchema validates enriched turn records', () => {
  const record = {
    turn: 1,
    step: 0,
    tokens: 2500,
    uncachedInputTokens: 1000,
    cacheReadTokens: 1000,
    outputTokens: 500,
    cacheWriteTokens: 0,
    costDeltaUsd: 0.0035,
    timestamp: Date.now(),
    durationMs: 1420,
    cacheHitRate: 50,
  }

  const parsed = turnRecordSchema.safeParse(record)
  assert.equal(parsed.success, true, 'Enriched turn record must satisfy turnRecordSchema')
})

test('Issue #120: usageByModelProjection records durationMs and cacheHitRate', () => {
  let state = usageByModelProjection.init()
  state = usageByModelProjection.apply(state, {
    type: 'request/header',
    data: { header: { config: { provider: 'deepseek', model: 'deepseek-chat' } } },
    time: 1700000000000,
  })

  // Turn 1
  state = usageByModelProjection.apply(state, {
    type: 'assistant/message',
    data: {
      turn: 1,
      step: 0,
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 1000,
        cacheWriteTokens: 0,
      },
    },
    time: 1700000005000,
  })

  // Turn 2
  state = usageByModelProjection.apply(state, {
    type: 'assistant/message',
    data: {
      turn: 2,
      step: 0,
      usage: {
        inputTokens: 500,
        outputTokens: 300,
        cacheReadTokens: 1500,
        cacheWriteTokens: 0,
      },
    },
    time: 1700000010000,
  })

  assert.ok(Array.isArray(state.turns), 'Turns must be an array')
  assert.equal(state.turns.length, 2)

  const t1 = state.turns[0]
  assert.equal(t1.tokens, 2500)
  assert.equal(t1.cacheHitRate, 50) // 1000 / (1000 + 1000) = 50%

  const t2 = state.turns[1]
  assert.equal(t2.tokens, 2300)
  assert.equal(t2.cacheHitRate, 75) // 1500 / (500 + 1500) = 75%
  assert.equal(t2.durationMs, 5000) // 1700000010000 - 1700000005000
})

// ------------------------------------------------------------- Issue #125 Tests
test('Issue #125: formatCostReceipt generates comprehensive Markdown receipt', () => {
  const receipt = formatCostReceipt({
    model: 'deepseek-chat',
    provider: 'deepseek',
    currency: '$',
    fx: 1,
    costUsd: 0.0124,
    tokens: {
      uncachedInputTokens: 5000,
      outputTokens: 1200,
      cacheReadTokens: 10000,
      cacheWriteTokens: 0,
    },
    cacheSavingsUsd: 0.0035,
    cacheSavingsPercent: 67,
    tier: 'Off-Peak Tier (-50%)',
    rates: { input: 0.14, output: 0.28, cacheHit: 0.014 },
    burnRatePerHourUsd: 0.045,
    projectedCostUsd: 0.025,
    turnsCount: 3,
  })

  assert.ok(receipt.includes('Session Spend Receipt'))
  assert.ok(receipt.includes('deepseek/deepseek-chat'))
  assert.ok(receipt.includes('$0.0124'))
  assert.ok(receipt.includes('67% hit rate'))
  assert.ok(receipt.includes('$0.0035'))
  assert.ok(receipt.includes('Off-Peak Tier'))
})

test('Issue #125: formatCostSummary produces clean 1-line summary', () => {
  const summary = formatCostSummary({
    model: 'deepseek-chat',
    currency: '$',
    fx: 1,
    costUsd: 0.0124,
    tokens: {
      uncachedInputTokens: 5000,
      outputTokens: 1200,
      cacheReadTokens: 10000,
    },
  })

  assert.ok(summary.startsWith('💰 **Cost Meter**:'))
  assert.ok(summary.includes('deepseek-chat'))
  assert.ok(summary.includes('67% cache hit'))
})

test('Issue #125: registerSlashCommand registers and handles /cost subcommands', async () => {
  let registered = []
  const mockCommands = {
    register: (def) => {
      registered.push(def)
      return () => {}
    },
  }

  const mockCtx = {
    inject: (deps, fn) => {
      if (deps.includes('commands')) {
        fn({ commands: mockCommands })
      }
    },
    effect: (fn) => fn(),
  }

  registerSlashCommand(mockCtx, {
    getCurrentConfig: () => ({ currency: '$', usdRate: 1 }),
    getCachedTariff: () => ({ schedule: testSchedule, source: 'deepseek' }),
    getLastTurns: () => [
      { turn: 1, step: 0, tokens: 2000, uncachedInputTokens: 1000, cacheReadTokens: 1000, outputTokens: 0, costDeltaUsd: 0.001 },
    ],
    resetLastTurns: () => {},
    calculateBurnRateAndProjection: () => ({ burnRatePerHourUsd: 0.01, projectedCostUsd: 0.02 }),
    calculateCacheSavings: () => ({ savedUsd: 0.0005, percent: 50 }),
    ratesAt: () => ({ input: 0.14, output: 0.28, cacheHit: 0.014 }),
    splitRoute: (k) => ({ provider: 'deepseek', model: k }),
    defaultRoute: () => ({ provider: 'deepseek', model: 'deepseek-chat' }),
  })

  assert.equal(registered.length, 2, 'Must register /cost and /cost-summary')
  const costCmd = registered.find((c) => c.name === 'cost')
  assert.ok(costCmd, '/cost must be registered')

  // Test /cost receipt
  const receiptRes = await costCmd.execute('receipt')
  assert.ok(receiptRes.includes('Session Spend Receipt'))

  // Test /cost summary
  const summaryRes = await costCmd.execute('summary')
  assert.ok(summaryRes.includes('Cost Meter'))

  // Test /cost help
  const helpRes = await costCmd.execute('help')
  assert.ok(helpRes.includes('/cost receipt'))

  // Test /cost reset
  const resetRes = await costCmd.execute('reset')
  assert.ok(resetRes.includes('reset'))
})

test('Issue #74, #117, #120, #125: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexFile = path.resolve('lib/index.js')
  const content = fs.readFileSync(indexFile, 'utf8')
  const lines = content.split('\n').length
  assert.ok(lines < 320, `lib/index.js must be strictly < 320 LOC, got ${lines}`)
})
