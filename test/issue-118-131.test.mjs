import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  sanitizeCsvCell,
  generateSessionCsv,
  generateSessionJson,
  renderSummaryCardToCanvas,
} from '../lib/export.js'
import {
  getFxRate,
  normalizeCurrencyCode,
} from '../lib/fx.js'

// ------------------------------------------------------------- Issue #118 Tests
test('Issue #118: sanitizeCsvCell prevents CSV formula injection and escapes special characters', () => {
  // Dangerous prefixes must be prepended with a single quote
  assert.equal(sanitizeCsvCell('=1+1'), "'=1+1")
  assert.equal(sanitizeCsvCell('+cmd|'), "'+cmd|")
  assert.equal(sanitizeCsvCell('-5'), "'-5")
  assert.equal(sanitizeCsvCell('@test'), "'@test")
  assert.equal(sanitizeCsvCell('\tmalicious'), "'\tmalicious")

  // Safe strings without special chars remain unchanged
  assert.equal(sanitizeCsvCell('deepseek-chat'), 'deepseek-chat')
  assert.equal(sanitizeCsvCell('12400'), '12400')

  // Strings with comma or quotes get quoted
  assert.equal(sanitizeCsvCell('foo,bar'), '"foo,bar"')
  assert.equal(sanitizeCsvCell('hello "world"'), '"hello ""world"""')

  // Null and undefined return empty string
  assert.equal(sanitizeCsvCell(null), '')
  assert.equal(sanitizeCsvCell(undefined), '')
})

test('Issue #118: generateSessionCsv creates UTF-8 BOM CSV with turns and summary row', () => {
  const turns = [
    {
      turn: 1,
      step: 0,
      timestamp: 1700000000000,
      uncachedInputTokens: 1000,
      cacheReadTokens: 4000,
      cacheHitRate: 80,
      outputTokens: 300,
      costDeltaUsd: 0.002,
    },
    {
      turn: 2,
      step: 0,
      timestamp: 1700000005000,
      uncachedInputTokens: 2000,
      cacheReadTokens: 6000,
      cacheHitRate: 75,
      outputTokens: 500,
      costDeltaUsd: 0.0035,
    },
  ]

  const csv = generateSessionCsv({
    model: 'deepseek-chat',
    provider: 'deepseek',
    currency: '$',
    fx: 1,
    turns,
    totalCostUsd: 0.0055,
  })

  // Must begin with UTF-8 BOM
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel')

  // Must have headers
  assert.ok(csv.includes('Timestamp,ISO_Time,Turn,Step,Model'))
  assert.ok(csv.includes('deepseek/deepseek-chat'))

  // Must include turn rows
  assert.ok(csv.includes('1,0,deepseek/deepseek-chat,1000,4000,80,300,5300'))
  assert.ok(csv.includes('2,0,deepseek/deepseek-chat,2000,6000,75,500,8500'))

  // Must include summary row
  assert.ok(csv.includes('TOTAL'))
  assert.ok(csv.includes('3000,10000,77,800,13800'))
})

test('Issue #118: generateSessionJson returns versioned structured JSON', () => {
  const json = generateSessionJson({
    model: 'deepseek-chat',
    provider: 'deepseek',
    currency: 'RUB',
    fx: 80,
    turns: [
      {
        turn: 1,
        step: 0,
        timestamp: 1700000000000,
        uncachedInputTokens: 1000,
        cacheReadTokens: 2000,
        outputTokens: 400,
        costDeltaUsd: 0.001,
      },
    ],
    totalCostUsd: 0.001,
    cacheSavingsUsd: 0.0005,
    cacheSavingsPercent: 50,
    tier: 'Off-Peak',
  })

  assert.equal(json.version, 1)
  assert.equal(json.generator, '@goodandready/dsh-cost-meter')
  assert.equal(json.session.model, 'deepseek-chat')
  assert.equal(json.session.currency, 'RUB')
  assert.equal(json.session.totalCostLocal, 0.08) // 0.001 * 80
  assert.equal(json.session.cacheSavings.savedLocal, 0.04) // 0.0005 * 80
  assert.equal(json.turns.length, 1)
  assert.equal(json.turns[0].tokens.total, 3400)
})

test('Issue #118: renderSummaryCardToCanvas draws card on canvas mock without throwing', () => {
  const drawCalls = []
  const mockCtx = {
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: (...args) => drawCalls.push(['fillRect', ...args]),
    strokeRect: (...args) => drawCalls.push(['strokeRect', ...args]),
    fillText: (...args) => drawCalls.push(['fillText', ...args]),
    beginPath: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
  }
  const mockCanvas = {
    getContext: () => mockCtx,
  }

  const res = renderSummaryCardToCanvas(mockCanvas, {
    model: 'deepseek-chat',
    provider: 'deepseek',
    currency: '$',
    costUsd: 0.0124,
    tokens: { uncachedInputTokens: 4000, cacheReadTokens: 8000, outputTokens: 600 },
    cacheSavingsUsd: 0.003,
    cacheSavingsPercent: 60,
    tier: 'Off-Peak Tier (-50%)',
    turns: [{ turn: 1, tokens: 2000, cacheReadTokens: 1000 }],
  })

  assert.equal(res, mockCanvas)
  assert.ok(drawCalls.length > 5, 'Canvas drawing calls must be executed')
})

// ------------------------------------------------------------- Issue #131 Tests
test('Issue #131: normalizeCurrencyCode maps $, ¥, ₽, € to canonical codes', () => {
  assert.equal(normalizeCurrencyCode('$'), 'USD')
  assert.equal(normalizeCurrencyCode('USD'), 'USD')
  assert.equal(normalizeCurrencyCode('¥'), 'CNY')
  assert.equal(normalizeCurrencyCode('CNY'), 'CNY')
  assert.equal(normalizeCurrencyCode('₽'), 'RUB')
  assert.equal(normalizeCurrencyCode('RUB'), 'RUB')
  assert.equal(normalizeCurrencyCode('€'), 'EUR')
  assert.equal(normalizeCurrencyCode('EUR'), 'EUR')
})

test('Issue #131: getFxRate computes accurate conversion for multi-currency switcher', () => {
  assert.equal(getFxRate('$', 1), 1)
  assert.equal(getFxRate('USD', 1), 1)
  assert.ok(getFxRate('RUB', 80) >= 50, 'RUB rate should be positive finite')
  assert.ok(getFxRate('CNY', 7.15) >= 5, 'CNY rate should be positive finite')
  assert.ok(getFxRate('EUR', 0.92) > 0, 'EUR rate should be positive finite')
})

test('Issue #74, #118, #131: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexFile = path.resolve('lib/index.js')
  const content = fs.readFileSync(indexFile, 'utf8')
  const lines = content.split('\n').length
  assert.ok(lines < 320, `lib/index.js must be strictly < 320 LOC, got ${lines}`)
})
