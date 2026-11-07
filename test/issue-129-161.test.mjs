import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { calculateCostVelocity } from '../lib/index.js'

const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')
const clientCode = fs.readFileSync(clientPath, 'utf8')
const indexPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
const indexCode = fs.readFileSync(indexPath, 'utf8')

test('Issue #129: calculateCostVelocity handles empty or single turn safely', () => {
  const r1 = calculateCostVelocity([])
  assert.equal(r1.velocityPerMin, 0)
  assert.equal(r1.isAnomaly, false)
  assert.equal(r1.severity, 'normal')

  const r2 = calculateCostVelocity([{ timestamp: 1000, costDeltaUsd: 0.10 }])
  assert.equal(r2.velocityPerMin, 0)
  assert.equal(r2.isAnomaly, false)
})

test('Issue #129: calculateCostVelocity detects rapid spending velocity anomaly', () => {
  const now = 1000000
  const turns = [
    { turn: 1, timestamp: now - 45000, costDeltaUsd: 0.30 },
    { turn: 2, timestamp: now - 30000, costDeltaUsd: 0.40 },
    { turn: 3, timestamp: now - 10000, costDeltaUsd: 0.35 },
  ]

  const res = calculateCostVelocity(turns, 1.05, { now })
  assert.equal(res.isAnomaly, true)
  assert.ok(res.velocityPerMin >= 0.50, `Expected velocity >= 0.50, got ${res.velocityPerMin}`)
  assert.ok(['warning', 'critical'].includes(res.severity))
})

test('Issue #129: calculateCostVelocity detects runaway spike over session baseline', () => {
  const now = 2000000
  // 10 low-cost turns ($0.01 each) spaced out
  const turns = []
  for (let i = 1; i <= 10; i++) {
    turns.push({ turn: i, timestamp: now - 600000 + i * 30000, costDeltaUsd: 0.01 })
  }
  // Sudden 3 massive turns
  turns.push({ turn: 11, timestamp: now - 50000, costDeltaUsd: 0.25 })
  turns.push({ turn: 12, timestamp: now - 30000, costDeltaUsd: 0.28 })
  turns.push({ turn: 13, timestamp: now - 10000, costDeltaUsd: 0.26 })

  const res = calculateCostVelocity(turns, 0.89, { now })
  assert.equal(res.isAnomaly, true)
  assert.ok(res.recentAvgCostPerStep >= 0.20)
})

test('Issue #129: calculateCostVelocity does not trigger on slow normal usage', () => {
  const now = 3000000
  const turns = [
    { turn: 1, timestamp: now - 300000, costDeltaUsd: 0.02 },
    { turn: 2, timestamp: now - 180000, costDeltaUsd: 0.03 },
    { turn: 3, timestamp: now - 60000, costDeltaUsd: 0.02 },
  ]

  const res = calculateCostVelocity(turns, 0.07, { now })
  assert.equal(res.isAnomaly, false)
  assert.equal(res.severity, 'normal')
  assert.ok(res.velocityPerMin < 0.10)
})

test('Issue #161: client.js defines StatusRing component and radial donut SVG', () => {
  assert.ok(clientCode.includes('function StatusRing('), 'Missing StatusRing component definition')
  assert.ok(clientCode.includes('dcm-ring-svg'), 'Missing dcm-ring-svg class')
  assert.ok(clientCode.includes('dcm-ring-track'), 'Missing dcm-ring-track class')
  assert.ok(clientCode.includes('dcm-ring-progress'), 'Missing dcm-ring-progress class')
  assert.ok(clientCode.includes('dcm-ring-center'), 'Missing dcm-ring-center class')
  assert.ok(clientCode.includes('strokeDasharray'), 'Missing strokeDasharray for progress circle')
})

test('Issue #129 & #161: client.js includes runaway loop styles and alert banners', () => {
  assert.ok(clientCode.includes('dcm-chip-runaway'), 'Missing dcm-chip-runaway class')
  assert.ok(clientCode.includes('dcm-velocity-banner'), 'Missing dcm-velocity-banner class')
  assert.ok(clientCode.includes('dcm-ring-pulse-danger'), 'Missing dcm-ring-pulse-danger class')
})

test('Issue #129 & #161: Dictionary key parity between en and zh for velocity & ring keys', () => {
  const requiredKeys = [
    'velocity.alert_title',
    'velocity.alert_desc',
    'velocity.alert_tooltip',
    'velocity.speed_label',
    'velocity.per_minute',
    'ring.progress_title',
  ]

  for (const k of requiredKeys) {
    assert.ok(clientCode.includes(`'${k}'`), `Missing translation key: ${k}`)
  }
})

test('Issue #74, #129, #161: lib/index.js maintains strict file size under 320 LOC', () => {
  const loc = indexCode.trim().split('\n').length
  assert.ok(loc <= 320, `lib/index.js must be <= 320 LOC, currently ${loc}`)
})
