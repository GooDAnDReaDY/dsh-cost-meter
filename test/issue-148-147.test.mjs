import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateAdvancedTrajectoryForecast, evaluatePruningTriggers } from '../lib/analytics.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('Issue #148: calculateAdvancedTrajectoryForecast computes trajectory with confidence bounds', () => {
  const turns = [
    { turn: 1, step: 1, costDeltaUsd: 0.002, tokens: 3000 },
    { turn: 2, step: 2, costDeltaUsd: 0.003, tokens: 4500 },
    { turn: 3, step: 3, costDeltaUsd: 0.005, tokens: 7000 },
    { turn: 4, step: 4, costDeltaUsd: 0.008, tokens: 11000 },
  ]
  const currentTotal = 0.018
  const fc = calculateAdvancedTrajectoryForecast(turns, currentTotal)

  assert.ok(fc.projectedCostUsd > currentTotal, 'Projected cost should exceed current total')
  assert.ok(fc.minCostUsd <= fc.projectedCostUsd, 'Min cost should be <= projected cost')
  assert.ok(fc.maxCostUsd >= fc.projectedCostUsd, 'Max cost should be >= projected cost')
  assert.equal(fc.trajectoryTrend, 'accelerating')
  assert.equal(fc.confidence, 'medium')
  assert.ok(fc.estimatedRemainingSteps > 0)
})

test('Issue #148: calculateAdvancedTrajectoryForecast handles empty or single turn safely', () => {
  const empty = calculateAdvancedTrajectoryForecast([], 0)
  assert.equal(empty.projectedCostUsd, 0)
  assert.equal(empty.confidence, 'low')
  assert.equal(empty.estimatedRemainingSteps, 0)

  const single = calculateAdvancedTrajectoryForecast([{ turn: 1, costDeltaUsd: 0.01 }], 0.01)
  assert.equal(single.projectedCostUsd, 0.01)
  assert.equal(single.confidence, 'low')
})

test('Issue #147: evaluatePruningTriggers identifies bloated past turns and computes savings', () => {
  const turns = [
    { turn: 1, step: 1, uncachedInputTokens: 8000, outputTokens: 500, tokens: 8500 },
    { turn: 2, step: 2, uncachedInputTokens: 9000, outputTokens: 600, tokens: 9600 },
    { turn: 3, step: 3, uncachedInputTokens: 1200, outputTokens: 400, tokens: 1600 },
    { turn: 4, step: 4, uncachedInputTokens: 1500, outputTokens: 300, tokens: 1800 },
  ]
  const res = evaluatePruningTriggers(turns, 45000, 128000, 0.02, { schedule: { base: { input: 0.14 } } })

  assert.equal(res.shouldPrune, true)
  assert.ok(res.prunableTokens >= 10000)
  assert.ok(res.savingsPerTurnUsd > 0)
  assert.ok(res.candidateSteps.includes(1))
  assert.ok(res.candidateSteps.includes(2))
  assert.ok(!res.candidateSteps.includes(4), 'Recent turns should not be marked for pruning')
  assert.ok(res.formattedSteps.includes('#1'))
})

test('Issue #147: evaluatePruningTriggers triggers on high saturation', () => {
  const turns = [
    { turn: 1, step: 1, tokens: 2000 },
    { turn: 2, step: 2, tokens: 2000 },
    { turn: 3, step: 3, tokens: 2000 },
  ]
  // 100,000 / 128,000 = 78% saturation
  const res = evaluatePruningTriggers(turns, 100000, 128000, 0.05)
  assert.equal(res.shouldPrune, true)
  assert.equal(res.reason, 'critical_saturation')
})

test('Issue #148 & #147: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexPath = path.join(__dirname, '..', 'lib', 'index.js')
  const content = fs.readFileSync(indexPath, 'utf8')
  const loc = content.split('\n').length
  assert.ok(loc <= 320, `lib/index.js has ${loc} lines, which exceeds the strict limit of 320 LOC`)
})

test('Issue #148 & #147: client.js exports new functions and defines styles', () => {
  const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
  const content = fs.readFileSync(clientPath, 'utf8')
  assert.ok(content.includes('calculateAdvancedTrajectoryForecast,'))
  assert.ok(content.includes('evaluatePruningTriggers,'))
  assert.ok(content.includes('dcm-forecast-box'))
  assert.ok(content.includes('dcm-pruning-box'))
})
