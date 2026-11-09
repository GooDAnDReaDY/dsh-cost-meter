import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import {
  estimateTurnCostUsd,
  setActiveTariffRates,
  getActiveTariffRates,
  usageByModelProjection,
  getLastTurns,
  resetLastTurns,
} from '../lib/projection.js'
import { getBudgetStatus } from '../lib/budget.js'
import { getCacheTtlStatus, resetCacheActivity } from '../lib/warmup.js'
import { getTagsReport } from '../lib/tags.js'
import { getAgentsSpendReport } from '../lib/agents.js'

test('Issue #181: estimateTurnCostUsd computes accurate cost from token buckets', () => {
  const rates = { input: 0.14, cacheHit: 0.014, output: 0.28, cacheWrite: 0.14 }
  const tokens = {
    uncachedInputTokens: 1000000, // $0.14
    cacheReadTokens: 1000000,     // $0.014
    outputTokens: 1000000,        // $0.28
    cacheWriteTokens: 0,
  }
  const cost = estimateTurnCostUsd(tokens, rates)
  assert.equal(cost, 0.434)
})

test('Issue #181: usageByModelProjection updates turn costDeltaUsd and triggers activity records', () => {
  resetLastTurns()
  resetCacheActivity()
  setActiveTariffRates({ input: 0.20, cacheHit: 0.02, output: 0.50, cacheWrite: 0.20 })

  const state0 = usageByModelProjection.init()
  const event1 = {
    type: 'assistant/message',
    time: Date.now(),
    data: {
      turn: 1,
      step: 0,
      usage: {
        inputTokens: 10000,
        outputTokens: 2000,
        cacheReadTokens: 5000,
        cacheWriteTokens: 0,
      },
      agentId: 'sub-researcher',
      role: 'researcher',
      subagentName: 'Codebase Researcher',
    },
  }

  const state1 = usageByModelProjection.apply(state0, event1)
  assert.ok(state1.turns && state1.turns.length === 1)
  const turn1 = state1.turns[0]

  assert.equal(turn1.turn, 1)
  assert.equal(turn1.agentId, 'sub-researcher')
  assert.ok(turn1.costDeltaUsd > 0, 'turn costDeltaUsd must be greater than 0')

  // Check that warmup activity was updated
  const ttl = getCacheTtlStatus({ cacheTtlMinutes: 10, cacheKeepAliveEnabled: true })
  assert.ok(ttl.lastCallTimestamp > 0, 'cache activity must be recorded')

  // Check agent attribution reflects the real turn cost
  const turns = getLastTurns()
  const totalCost = turns.reduce((acc, t) => acc + (t.costDeltaUsd || 0), 0)
  assert.ok(totalCost > 0)

  const attribution = getAgentsSpendReport(turns, totalCost, '$', 1)
  assert.equal(attribution.agents.length, 1)
  assert.equal(attribution.agents[0].agentId, 'sub-researcher')
  assert.ok(attribution.agents[0].costUsd > 0, 'agent attribution costUsd must be > 0')
})

test('Issue #181: zero empty catch blocks across entire lib directory', () => {
  const libDir = resolve(new URL('.', import.meta.url).pathname, '../lib')
  const files = fs.readdirSync(libDir).filter((f) => f.endsWith('.js'))
  const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g

  for (const f of files) {
    const content = fs.readFileSync(resolve(libDir, f), 'utf8')
    const matches = content.match(emptyCatchRegex)
    assert.equal(matches, null, `File lib/${f} contains empty catch block`)
  }
})
