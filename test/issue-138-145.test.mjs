import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { analyzePromptAnatomy, detectTokenWaste } from '../lib/index.js'

const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')
const clientCode = fs.readFileSync(clientPath, 'utf8')
const indexPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
const indexCode = fs.readFileSync(indexPath, 'utf8')

test('Issue #138: analyzePromptAnatomy handles empty inputs safely', () => {
  const empty1 = analyzePromptAnatomy([], 0)
  assert.equal(empty1.totalTokens, 0)
  assert.equal(empty1.percentages.system, 0)

  const empty2 = analyzePromptAnatomy(null, 1000)
  assert.equal(empty2.totalTokens, 0)
})

test('Issue #138: analyzePromptAnatomy breaks down single turn prompt anatomy', () => {
  const turns = [
    { turn: 1, uncachedInputTokens: 4000, cacheReadTokens: 1000, outputTokens: 250, tokens: 5250 },
  ]
  const anatomy = analyzePromptAnatomy(turns, 5000)
  assert.equal(anatomy.totalTokens, 5000)
  assert.ok(anatomy.systemTokens >= 500 && anatomy.systemTokens <= 3500)
  assert.ok(anatomy.toolsTokens >= 800 && anatomy.toolsTokens <= 6000)
  assert.equal(anatomy.historyTokens, 0)
  const sumPct = anatomy.percentages.system + anatomy.percentages.tools + anatomy.percentages.history + anatomy.percentages.attachments
  assert.equal(sumPct, 100)
})

test('Issue #138: analyzePromptAnatomy tracks chat history in multi-turn conversation', () => {
  const turns = [
    { turn: 1, uncachedInputTokens: 3000, outputTokens: 800, tokens: 3800 },
    { turn: 2, uncachedInputTokens: 1000, cacheReadTokens: 3800, outputTokens: 1200, tokens: 6000 },
    { turn: 3, uncachedInputTokens: 500, cacheReadTokens: 6000, outputTokens: 500, tokens: 7000 },
  ]
  const anatomy = analyzePromptAnatomy(turns, 7000)
  assert.ok(anatomy.historyTokens > 1000, 'Expected history tokens from past turn outputs')
  assert.ok(anatomy.percentages.history > 10)
  const sumPct = anatomy.percentages.system + anatomy.percentages.tools + anatomy.percentages.history + anatomy.percentages.attachments
  assert.equal(sumPct, 100)
})

test('Issue #145: detectTokenWaste handles short or empty sessions safely', () => {
  const w1 = detectTokenWaste([])
  assert.equal(w1.hasWaste, false)
  assert.equal(w1.wasteTokens, 0)

  const w2 = detectTokenWaste([{ tokens: 5000 }, { tokens: 5000 }])
  assert.equal(w2.hasWaste, false)
})

test('Issue #145: detectTokenWaste detects repeated massive token dumps and recommends compaction', () => {
  const turns = [
    { turn: 1, tokens: 15000, uncachedInputTokens: 15000 },
    { turn: 2, tokens: 15050, uncachedInputTokens: 15050 }, // Duplicate dump
    { turn: 3, tokens: 15020, uncachedInputTokens: 15020 }, // Duplicate dump
  ]
  const waste = detectTokenWaste(turns, 0.05, { schedule: { base: { input: 0.14 } } })
  assert.equal(waste.hasWaste, true)
  assert.ok(waste.wasteTokens >= 15000, `Expected waste >= 15000, got ${waste.wasteTokens}`)
  assert.equal(waste.recommendation, 'compact')
  assert.ok(waste.wasteCostUsd > 0)
})

test('Issue #145: detectTokenWaste does not trigger on normal non-repeating sessions', () => {
  const turns = [
    { turn: 1, tokens: 800 },
    { turn: 2, tokens: 1500 },
    { turn: 3, tokens: 2300 },
    { turn: 4, tokens: 1200 },
  ]
  const waste = detectTokenWaste(turns, 0.01)
  assert.equal(waste.hasWaste, false)
  assert.equal(waste.wasteTokens, 0)
  assert.equal(waste.recommendation, 'none')
})

test('Issue #138 & #145: client.js defines UI classes and translations in en and zh', () => {
  assert.ok(clientCode.includes('dcm-anatomy-box'), 'Missing dcm-anatomy-box')
  assert.ok(clientCode.includes('dcm-anatomy-bar'), 'Missing dcm-anatomy-bar')
  assert.ok(clientCode.includes('dcm-seg-system'), 'Missing dcm-seg-system')
  assert.ok(clientCode.includes('dcm-seg-tools'), 'Missing dcm-seg-tools')
  assert.ok(clientCode.includes('dcm-seg-history'), 'Missing dcm-seg-history')
  assert.ok(clientCode.includes('dcm-seg-attachments'), 'Missing dcm-seg-attachments')
  assert.ok(clientCode.includes('dcm-waste-banner'), 'Missing dcm-waste-banner')

  const requiredKeys = [
    'anatomy.title',
    'anatomy.system',
    'anatomy.tools',
    'anatomy.history',
    'anatomy.attachments',
    'waste.alert_title',
    'waste.alert_desc',
    'waste.recommendation_compact',
    'waste.recommendation_prune',
  ]

  for (const k of requiredKeys) {
    assert.ok(clientCode.includes(`'${k}'`), `Missing translation key: ${k}`)
  }
})

test('Issue #74, #138, #145: lib/index.js maintains strict file size under 320 LOC', () => {
  const loc = indexCode.trim().split('\n').length
  assert.ok(loc <= 320, `lib/index.js must be <= 320 LOC, currently ${loc}`)
})
