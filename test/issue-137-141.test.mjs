import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getFallbackContextLength,
  calculateContextMetrics,
} from '../lib/analytics.js'

test('Issue #137: getFallbackContextLength resolves expected model context limits', () => {
  assert.equal(getFallbackContextLength('anthropic/claude-3-5-sonnet'), 200000)
  assert.equal(getFallbackContextLength('google/gemini-1.5-pro'), 1000000)
  assert.equal(getFallbackContextLength('deepseek/deepseek-chat'), 128000)
  assert.equal(getFallbackContextLength('deepseek/deepseek-reasoner'), 128000)
  assert.equal(getFallbackContextLength('openai/gpt-4o'), 128000)
  assert.equal(getFallbackContextLength('qwen/qwq-32b'), 128000)
  assert.equal(getFallbackContextLength('unknown-custom'), 128000)
})

test('Issue #137: calculateContextMetrics calculates accurate saturation and risk levels', () => {
  const tariff = {
    contextLength: 128000,
    schedule: {
      base: { input: 0.14 },
    },
  }
  const route = { provider: 'deepseek', model: 'deepseek-chat' }

  // 1. Empty turns
  const mEmpty = calculateContextMetrics([], tariff, route)
  assert.equal(mEmpty.currentTokens, 0)
  assert.equal(mEmpty.contextLength, 128000)
  assert.equal(mEmpty.saturationPercent, 0)
  assert.equal(mEmpty.riskLevel, 'low')
  assert.equal(mEmpty.nextTurnEstUsd, 0)

  // 2. Low risk (< 50%)
  const turnsLow = [
    { turn: 1, step: 0, uncachedInputTokens: 10000, cacheReadTokens: 15000 },
  ]
  const mLow = calculateContextMetrics(turnsLow, tariff, route)
  assert.equal(mLow.currentTokens, 25000)
  assert.equal(mLow.saturationPercent, 20)
  assert.equal(mLow.riskLevel, 'low')
  assert.ok(mLow.nextTurnEstUsd > 0)

  // 3. Moderate risk (50% - 80%)
  const turnsMod = [
    { turn: 1, step: 0, uncachedInputTokens: 30000, cacheReadTokens: 40000 },
  ]
  const mMod = calculateContextMetrics(turnsMod, tariff, route)
  assert.equal(mMod.currentTokens, 70000)
  assert.equal(mMod.saturationPercent, 55)
  assert.equal(mMod.riskLevel, 'moderate')

  // 4. High risk (> 80% — compaction risk)
  const turnsHigh = [
    { turn: 1, step: 0, uncachedInputTokens: 40000, cacheReadTokens: 70000 },
  ]
  const mHigh = calculateContextMetrics(turnsHigh, tariff, route)
  assert.equal(mHigh.currentTokens, 110000)
  assert.equal(mHigh.saturationPercent, 86)
  assert.equal(mHigh.riskLevel, 'high')
})

test('Issue #141: client script defines odometer styling and prefers-reduced-motion override', () => {
  const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')
  const scriptContent = readFileSync(clientPath, 'utf8')
  assert.ok(scriptContent.includes('.dcm-odometer'), 'Client CSS must contain .dcm-odometer class')
  assert.ok(scriptContent.includes('prefers-reduced-motion'), 'Client CSS must respect prefers-reduced-motion')
  assert.ok(scriptContent.includes('dcm-context-gauge'), 'Client CSS must contain .dcm-context-gauge class')
  assert.ok(scriptContent.includes('dcm-risk-high'), 'Client CSS must contain .dcm-risk-high class')
})

test('Issue #74, #137, #141: lib/index.js maintains strict file size under 320 LOC', () => {
  const idxPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
  const content = readFileSync(idxPath, 'utf8')
  const lines = content.split('\n').length
  assert.ok(lines < 320, `lib/index.js has ${lines} lines, expected < 320`)
})
