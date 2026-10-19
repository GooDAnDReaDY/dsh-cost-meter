import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  usageByModelProjection,
  getLastTurns,
  resetLastTurns,
  MAX_TURNS_HISTORY,
  turnRecordSchema,
} from '../lib/projection.js'

test('Issue #94: MAX_TURNS_HISTORY is defined and capped between 25 and 30', () => {
  assert.ok(typeof MAX_TURNS_HISTORY === 'number', 'MAX_TURNS_HISTORY must be a number')
  assert.ok(MAX_TURNS_HISTORY >= 25 && MAX_TURNS_HISTORY <= 30, 'MAX_TURNS_HISTORY must be between 25 and 30')
})

test('Issue #94: turnRecordSchema validates turn records with all fields', () => {
  const valid = {
    turn: 1,
    step: 2,
    tokens: 1500,
    uncachedInputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costDeltaUsd: 0.005,
    timestamp: Date.now(),
  }
  assert.doesNotThrow(() => turnRecordSchema.parse(valid))
  
  // Minimal valid
  const minimal = {
    turn: 0,
    tokens: 0,
    timestamp: 12345678,
  }
  assert.doesNotThrow(() => turnRecordSchema.parse(minimal))

  // Invalid negative tokens
  assert.throws(() => turnRecordSchema.parse({ turn: 1, tokens: -10, timestamp: 123 }))
})

test('Issue #94: usageByModelProjection records and caps turns history to MAX_TURNS_HISTORY', () => {
  resetLastTurns()
  let state = usageByModelProjection.init()
  assert.equal(state.turns, undefined)

  // 1. Send first header
  state = usageByModelProjection.apply(state, {
    type: 'request/header',
    data: { header: { config: { provider: 'anthropic', model: 'claude-3-5-sonnet' } } }
  })

  // 2. Stream chunks for turn 1, step 0
  const chunk1 = {
    type: 'assistant/chunk',
    time: 1000,
    data: { turn: 1, step: 0, chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 20 } } }
  }
  state = usageByModelProjection.apply(state, chunk1)
  assert.equal(state.turns.length, 1)
  assert.equal(state.turns[0].turn, 1)
  assert.equal(state.turns[0].step, 0)
  assert.equal(state.turns[0].tokens, 120)

  // Streaming continuation: chunk 2 in same step updates tokens in place
  const chunk2 = {
    type: 'assistant/chunk',
    time: 1100,
    data: { turn: 1, step: 0, chunk: { type: 'usage', usage: { inputTokens: 100, outputTokens: 50 } } }
  }
  state = usageByModelProjection.apply(state, chunk2)
  assert.equal(state.turns.length, 1, 'streaming chunks for same step must update existing record without duplicating')
  assert.equal(state.turns[0].tokens, 150)

  // 3. Emit 40 subsequent distinct steps across turns to test capping
  for (let i = 2; i <= 40; i++) {
    state = usageByModelProjection.apply(state, {
      type: 'assistant/message',
      time: 2000 + i * 100,
      data: { turn: i, step: 0, usage: { inputTokens: i * 10, outputTokens: 5 } }
    })
  }

  assert.equal(state.turns.length, MAX_TURNS_HISTORY, `turns length must be capped at ${MAX_TURNS_HISTORY}`)
  // Last entry should be turn 40
  assert.equal(state.turns[state.turns.length - 1].turn, 40)
  
  // getLastTurns() returns matching history
  const history = getLastTurns()
  assert.equal(history.length, MAX_TURNS_HISTORY)
  assert.equal(history[history.length - 1].turn, 40)

  // View serialization passes schema
  const view = usageByModelProjection.wire.view(state)
  assert.doesNotThrow(() => usageByModelProjection.wire.viewSchema.parse(view))
  assert.ok(Array.isArray(view.turns))
  assert.equal(view.turns.length, MAX_TURNS_HISTORY)
})

test('Issue #94: client dictionaries and CSS contain sparkline styles and translations', () => {
  const clientPath = path.resolve('lib/client.js')
  const clientSrc = fs.readFileSync(clientPath, 'utf8')

  // Check en and zh dictionary keys
  assert.ok(clientSrc.includes("'sparkline.title'"), 'sparkline.title must exist in client dictionaries')
  assert.ok(clientSrc.includes("'sparkline.steps'"), 'sparkline.steps must exist in client dictionaries')

  // Check CSS classes
  assert.ok(clientSrc.includes('.dcm-sparkline-box'), 'CSS must define .dcm-sparkline-box')
  assert.ok(clientSrc.includes('.dcm-spark-bar'), 'CSS must define .dcm-spark-bar')
  assert.ok(clientSrc.includes('.dcm-spark-peak'), 'CSS must define .dcm-spark-peak')

  // Enforce zero hardcoded hex or rgba in client CSS
  const cssMatch = clientSrc.match(/const CSS = `([^`]+)`/)
  assert.ok(cssMatch, 'CSS block must be present')
  const css = cssMatch[1]
  assert.equal(/rgba\(/i.test(css), false, 'CSS must not contain hardcoded rgba()')
  assert.equal(/#[0-9a-fA-F]{3,6}\b/i.test(css), false, 'CSS must not contain hardcoded hex colors')
})
