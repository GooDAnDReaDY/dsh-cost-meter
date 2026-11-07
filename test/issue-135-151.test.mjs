import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simulateModelCosts, getBurnRateSeries, REFERENCE_MODELS } from '../lib/analytics.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('Issue #135: REFERENCE_MODELS contains benchmark models', () => {
  assert.ok(Array.isArray(REFERENCE_MODELS))
  assert.ok(REFERENCE_MODELS.length >= 5)
  const ids = REFERENCE_MODELS.map((m) => m.id)
  assert.ok(ids.includes('deepseek-chat'))
  assert.ok(ids.includes('deepseek-reasoner'))
  assert.ok(ids.includes('claude-3-5-sonnet'))
  assert.ok(ids.includes('gpt-4o'))
  assert.ok(ids.includes('gpt-4o-mini'))
})

test('Issue #135: simulateModelCosts computes comparative costs and savings vs Sonnet', () => {
  const turns = [
    { turn: 1, step: 1, uncachedInputTokens: 3000, cacheReadTokens: 10000, outputTokens: 800 },
    { turn: 2, step: 2, uncachedInputTokens: 2000, cacheReadTokens: 13000, outputTokens: 600 },
  ]
  const actualCostUsd = 0.0055
  const result = simulateModelCosts(turns, actualCostUsd, 'deepseek-chat')

  assert.equal(result.totalUncached, 5000)
  assert.equal(result.totalCached, 23000)
  assert.equal(result.totalOutput, 1400)
  assert.equal(result.totalTokens, 29400)
  assert.equal(result.actualCostUsd, 0.0055)

  assert.ok(Array.isArray(result.comparisons))
  assert.equal(result.comparisons.length, REFERENCE_MODELS.length)

  const sonnet = result.comparisons.find((c) => c.id === 'claude-3-5-sonnet')
  assert.ok(sonnet)
  // Claude Sonnet: 5000 * 3.00/1M + 23000 * 0.30/1M + 1400 * 15.00/1M
  // = 0.015 + 0.0069 + 0.021 = 0.0429
  assert.ok(sonnet.simulatedCostUsd > 0.04)
  assert.ok(sonnet.diffUsd > 0)
  assert.ok(sonnet.savingsUsd > 0)
  assert.ok(result.bestSavingsVsSonnet)
  assert.ok(result.bestSavingsVsSonnet.savingsUsd > 0)
  assert.ok(result.bestSavingsVsSonnet.savingsPercent > 50)

  const current = result.comparisons.find((c) => c.id === 'deepseek-chat')
  assert.ok(current)
  assert.equal(current.isCurrent, true)
})

test('Issue #135: simulateModelCosts handles empty and fallback turns safely', () => {
  const emptyRes = simulateModelCosts([], 0)
  assert.deepEqual(emptyRes.comparisons, [])
  assert.equal(emptyRes.totalTokens, 0)
  assert.equal(emptyRes.bestSavingsVsSonnet, null)

  const fallbackTurns = [{ tokens: 10000 }]
  const fallbackRes = simulateModelCosts(fallbackTurns, 0.002, 'gpt-4o')
  assert.equal(fallbackRes.totalTokens, 10000)
  assert.ok(fallbackRes.comparisons.length > 0)
  const gpt4o = fallbackRes.comparisons.find((c) => c.id === 'gpt-4o')
  assert.equal(gpt4o.isCurrent, true)
})

test('Issue #151: getBurnRateSeries generates points and detects spikes', () => {
  const turns = [
    { turn: 1, step: 1, uncachedInputTokens: 1000, cacheReadTokens: 1500, outputTokens: 200, costDeltaUsd: 0.0004 },
    { turn: 2, step: 2, uncachedInputTokens: 1200, cacheReadTokens: 2500, outputTokens: 300, costDeltaUsd: 0.0006 },
    { turn: 3, step: 3, uncachedInputTokens: 14000, cacheReadTokens: 4000, outputTokens: 500, costDeltaUsd: 0.0040 },
  ]
  const series = getBurnRateSeries(turns)

  assert.equal(series.length, 3)
  assert.equal(series[0].turn, 1)
  assert.equal(series[0].tokens, 2700)
  assert.equal(series[0].isSpike, false)

  assert.equal(series[2].turn, 3)
  assert.equal(series[2].tokens, 18500)
  assert.equal(series[2].isSpike, true)
  assert.ok(series[2].cumulativeCostUsd >= 0.005)
})

test('Issue #151: getBurnRateSeries handles empty array', () => {
  assert.deepEqual(getBurnRateSeries([]), [])
  assert.deepEqual(getBurnRateSeries(null), [])
})

test('Issue #135 & #151: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexPath = path.join(__dirname, '..', 'lib', 'index.js')
  const content = fs.readFileSync(indexPath, 'utf8')
  const loc = content.split('\n').length
  assert.ok(loc <= 320, `lib/index.js has ${loc} lines, which exceeds the strict limit of 320 LOC`)
})

test('Issue #135 & #151: client.js exports getBurnRateSeries and simulateModelCosts', () => {
  const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
  const content = fs.readFileSync(clientPath, 'utf8')
  assert.ok(content.includes('getBurnRateSeries,'))
  assert.ok(content.includes('simulateModelCosts,'))
  assert.ok(content.includes('dcm-chart-box'))
  assert.ok(content.includes('dcm-simulator-box'))
})
