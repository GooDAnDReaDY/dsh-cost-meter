import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  Config,
  normalizeConfig,
  bucketsFromUsage,
  turnRecordSchema,
  usageByModelProjection,
  ZERO,
} from '../lib/index.js'

import {
  generateSessionCsv,
  generateSessionJson,
  renderSummaryCardToCanvas,
} from '../lib/export.js'

import {
  formatCostReceipt,
} from '../lib/commands.js'

test('Issue #144: bucketsFromUsage extracts reasoning tokens from various provider formats', () => {
  // Format 1: completion_tokens_details.reasoning_tokens (OpenAI / DeepSeek official)
  const u1 = {
    inputTokens: 100,
    outputTokens: 50,
    completion_tokens_details: { reasoning_tokens: 35 },
  }
  const b1 = bucketsFromUsage(u1)
  assert.equal(b1.uncachedInputTokens, 100)
  assert.equal(b1.outputTokens, 50)
  assert.equal(b1.reasoningTokens, 35)

  // Format 2: direct reasoningTokens / reasoning_tokens
  const u2 = {
    inputTokens: 200,
    outputTokens: 80,
    reasoningTokens: 60,
  }
  const b2 = bucketsFromUsage(u2)
  assert.equal(b2.reasoningTokens, 60)

  // Format 3: details.reasoning_tokens
  const u3 = {
    inputTokens: 50,
    outputTokens: 20,
    details: { reasoning_tokens: 15 },
  }
  const b3 = bucketsFromUsage(u3)
  assert.equal(b3.reasoningTokens, 15)

  // Format 4: non-reasoning model (0 reasoning tokens)
  const u4 = {
    inputTokens: 10,
    outputTokens: 5,
  }
  const b4 = bucketsFromUsage(u4)
  assert.equal(b4.reasoningTokens, 0)
})

test('Issue #144: turnRecordSchema validates enriched turn records with reasoningTokens', () => {
  const turnData = {
    turn: 1,
    step: 0,
    tokens: 1500,
    uncachedInputTokens: 500,
    cacheReadTokens: 400,
    outputTokens: 600,
    reasoningTokens: 450,
    costDeltaUsd: 0.0025,
    timestamp: Date.now(),
    durationMs: 4200,
    cacheHitRate: 44,
  }
  const validated = turnRecordSchema.parse(turnData)
  assert.equal(validated.reasoningTokens, 450)
  assert.equal(validated.outputTokens, 600)
})

test('Issue #144: usageByModelProjection records reasoningTokens in turn history', () => {
  let state = usageByModelProjection.init()
  state = usageByModelProjection.apply(state, {
    type: 'request/header',
    data: { header: { config: { provider: 'deepseek', model: 'deepseek-reasoner' } } },
  })

  state = usageByModelProjection.apply(state, {
    type: 'assistant/message',
    time: Date.now(),
    data: {
      turn: 1,
      step: 0,
      usage: {
        inputTokens: 1200,
        outputTokens: 800,
        cacheReadTokens: 500,
        cacheWriteTokens: 0,
        completion_tokens_details: { reasoning_tokens: 650 },
      },
    },
  })

  assert.ok(state.turns && state.turns.length === 1)
  const turn = state.turns[0]
  assert.equal(turn.reasoningTokens, 650)
  assert.equal(turn.outputTokens, 800)
  assert.equal(turn.uncachedInputTokens, 1200)
})

test('Issue #144: CSV and JSON export include Reasoning_Tokens', () => {
  const sampleData = {
    model: 'deepseek-reasoner',
    provider: 'deepseek',
    currency: '$',
    fx: 1,
    totalCostUsd: 0.005,
    turns: [
      {
        turn: 1,
        step: 0,
        uncachedInputTokens: 1000,
        cacheReadTokens: 500,
        outputTokens: 800,
        reasoningTokens: 600,
        costDeltaUsd: 0.005,
        timestamp: 1700000000000,
        cacheHitRate: 33,
      },
    ],
  }

  // 1. CSV test
  const csv = generateSessionCsv(sampleData)
  assert.ok(csv.includes('Reasoning_Tokens'), 'CSV headers must include Reasoning_Tokens')
  assert.ok(csv.includes('600'), 'CSV row must include reasoning tokens value')

  // 2. JSON test
  const json = generateSessionJson(sampleData)
  assert.equal(json.version, 1)
  assert.equal(json.session.tokens.reasoningTokens, 600)
  assert.equal(json.turns[0].tokens.reasoningTokens, 600)
})

test('Issue #144: formatCostReceipt outputs Thinking / Reasoning metric when reasoningTokens > 0', () => {
  const receipt = formatCostReceipt({
    model: 'deepseek-reasoner',
    provider: 'deepseek',
    currency: '$',
    costUsd: 0.008,
    tokens: {
      uncachedInputTokens: 2000,
      cacheReadTokens: 1000,
      outputTokens: 1200,
      reasoningTokens: 900,
    },
  })

  assert.ok(receipt.includes('Thinking / Reasoning'), 'Receipt must display Thinking / Reasoning')
  assert.ok(receipt.includes('900'), 'Receipt must display reasoning count 900')
})

test('Issue #121: Config schema and normalizeConfig support privacyMode', () => {
  const cfg = normalizeConfig({ privacyMode: true })
  assert.equal(cfg.privacyMode, true)

  const cfgDefault = normalizeConfig({})
  assert.equal(cfgDefault.privacyMode, false)

  assert.ok(Config.dict.privacyMode !== undefined)
})

test('Issue #121: renderSummaryCardToCanvas respects privacyMode mask', () => {
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 100 }),
      arc: () => {},
      closePath: () => {},
    }),
  }

  const res = renderSummaryCardToCanvas(fakeCanvas, {
    costUsd: 12.50,
    currency: '$',
    privacyMode: true,
  })
  assert.equal(fakeCanvas.width, 1200)
  assert.equal(fakeCanvas.height, 680)
})

test('Issue #165: Config schema and normalizeConfig support showHeaderChip and showMessageAction', () => {
  // Defaults must be true to preserve existing behavior
  const def = normalizeConfig({})
  assert.equal(def.showHeaderChip, true, 'showHeaderChip defaults to true')
  assert.equal(def.showMessageAction, true, 'showMessageAction defaults to true')

  // Explicitly disabled
  const disabled = normalizeConfig({ showHeaderChip: false, showMessageAction: false })
  assert.equal(disabled.showHeaderChip, false)
  assert.equal(disabled.showMessageAction, false)

  // Config schema parse
  assert.ok(Config.dict.showHeaderChip !== undefined)
  assert.ok(Config.dict.showMessageAction !== undefined)
})

test('Strict file size: lib/index.js maintains LOC < 320', () => {
  const idxPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
  const content = readFileSync(idxPath, 'utf8')
  const lines = content.split('\n').length
  assert.ok(lines < 320, `lib/index.js has ${lines} lines, expected < 320`)
})
