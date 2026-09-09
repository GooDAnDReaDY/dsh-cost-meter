import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTariff, indexCatalog } from '../lib/index.js'

test('time zone validation and boundary checks', () => {
  function isValidTimeZone(tz) {
    if (!tz || typeof tz !== 'string') return false
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: tz })
      return true
    } catch {
      return false
    }
  }

  assert.equal(isValidTimeZone('Europe/Moscow'), true)
  assert.equal(isValidTimeZone('UTC'), true)
  assert.equal(isValidTimeZone('America/New_York'), true)
  assert.equal(isValidTimeZone('Europe/Moskow'), false)
  assert.equal(isValidTimeZone(''), false)
  assert.equal(isValidTimeZone(null), false)
})

test('route split and query sanitization logic', () => {
  const cfg = {
    useOpenRouter: true,
    prices: {},
    modelMap: {},
  }
  const index = indexCatalog([
    { id: 'openai/gpt-4o', pricing: { prompt: '0.000005', completion: '0.000015' } }
  ])

  const resolved = resolveTariff(cfg, index, { provider: 'openrouter', model: 'openai/gpt-4o' })
  assert.equal(resolved.source, 'openrouter')
  assert.equal(resolved.schedule.base.input, 5)
  assert.equal(resolved.schedule.base.output, 15)

  // Query string sanitization helper
  function sanitizeModelKeys(asked) {
    const out = []
    for (const key of (asked ? asked.split(',') : []).slice(0, 24)) {
      const trimmed = String(key || '').trim()
      if (!trimmed || trimmed.length > 128) continue
      out.push(trimmed)
    }
    return out
  }

  assert.deepEqual(sanitizeModelKeys('openai/gpt-4o, anthropic/claude-3-5-sonnet '), ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'])
  assert.deepEqual(sanitizeModelKeys('   ,  '), [])
  assert.deepEqual(sanitizeModelKeys('a'.repeat(200) + ',valid/model'), ['valid/model'])
})
