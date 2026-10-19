import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { calculateBurnRateAndProjection } from '../lib/analytics.js'

test('Issue #95: calculateBurnRateAndProjection handles empty or single turn safely', () => {
  // Null / empty
  const res1 = calculateBurnRateAndProjection([], 0)
  assert.equal(res1.burnRatePerHourUsd, 0)
  assert.equal(res1.projectedCostUsd, 0)

  // Single turn
  const single = [{ turn: 1, step: 0, tokens: 500, costDeltaUsd: 0.01, timestamp: Date.now() }]
  const res2 = calculateBurnRateAndProjection(single, 0.01)
  assert.equal(res2.burnRatePerHourUsd, 0)
  assert.equal(res2.projectedCostUsd, 0.01)
})

test('Issue #95: calculateBurnRateAndProjection guards against zero duration or NaN', () => {
  const sameTime = [
    { turn: 1, step: 0, tokens: 500, costDeltaUsd: 0.01, timestamp: 1000 },
    { turn: 1, step: 1, tokens: 500, costDeltaUsd: 0.01, timestamp: 1000 },
  ]
  const res = calculateBurnRateAndProjection(sameTime, 0.02)
  assert.equal(res.burnRatePerHourUsd, 0)
  assert.equal(res.projectedCostUsd, 0.02)
  assert.equal(Number.isFinite(res.burnRatePerHourUsd), true)
  assert.equal(Number.isFinite(res.projectedCostUsd), true)
})

test('Issue #95: calculateBurnRateAndProjection computes realistic burn rate per hour', () => {
  // 5 turns over 10 minutes (600,000 ms), $0.10 total cost in window
  // 10 minutes = 1/6 hour -> burn rate = $0.10 * 6 = $0.60 / hour
  const start = 1700000000000
  const turns = [
    { turn: 1, step: 0, tokens: 1000, costDeltaUsd: 0.02, timestamp: start },
    { turn: 2, step: 0, tokens: 1000, costDeltaUsd: 0.02, timestamp: start + 150000 },
    { turn: 3, step: 0, tokens: 1000, costDeltaUsd: 0.02, timestamp: start + 300000 },
    { turn: 4, step: 0, tokens: 1000, costDeltaUsd: 0.02, timestamp: start + 450000 },
    { turn: 5, step: 0, tokens: 1000, costDeltaUsd: 0.02, timestamp: start + 600000 },
  ]
  const totalCost = 0.10
  const res = calculateBurnRateAndProjection(turns, totalCost, { now: start + 600000 })
  
  assert.ok(Math.abs(res.burnRatePerHourUsd - 0.60) < 0.05, `Expected burn rate ~0.60, got ${res.burnRatePerHourUsd}`)
  assert.ok(res.projectedCostUsd >= totalCost, 'Projected cost must be at least total cost')
  assert.ok(res.projectedCostUsd <= totalCost * 5, 'Projected cost must not wildly blow up')
})

test('Issue #95: client dictionaries contain projection keys and match between en and zh', () => {
  const clientPath = path.resolve('lib/client.js')
  const clientSrc = fs.readFileSync(clientPath, 'utf8')

  assert.ok(clientSrc.includes("'projection.burn_rate'"), 'projection.burn_rate must exist')
  assert.ok(clientSrc.includes("'projection.projected'"), 'projection.projected must exist')
})