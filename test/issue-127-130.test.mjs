import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractAgentMeta,
  getAgentsSpendReport,
  analyzeCacheEfficiency,
  turnRecordSchema,
  usageByModelProjection,
  usageOf,
} from '../lib/index.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')

test('Issue #127: extractAgentMeta handles various event payloads and fallbacks', () => {
  // Empty event fallback
  assert.deepEqual(extractAgentMeta(null), { agentId: 'root', role: 'root', subagentName: 'Root Agent' })
  assert.deepEqual(extractAgentMeta({}), { agentId: 'root', role: 'root', subagentName: 'Root Agent' })

  // Explicit data fields
  const ev1 = {
    data: { agentId: 'researcher-1', role: 'researcher', subagentName: 'Deep Researcher' }
  }
  assert.deepEqual(extractAgentMeta(ev1), {
    agentId: 'researcher-1',
    role: 'researcher',
    subagentName: 'Deep Researcher',
  })

  // Metadata / chunk fields
  const ev2 = {
    data: { chunk: { agentId: 'coder-sub', type: 'usage' } },
    metadata: { role: 'developer', subagentName: 'Coder Bot' }
  }
  assert.deepEqual(extractAgentMeta(ev2), {
    agentId: 'coder-sub',
    role: 'developer',
    subagentName: 'Coder Bot',
  })

  // Agent object in data
  const ev3 = {
    data: { agent: { id: 'reviewer-agent', role: 'qa', name: 'Reviewer' } }
  }
  assert.deepEqual(extractAgentMeta(ev3), {
    agentId: 'reviewer-agent',
    role: 'qa',
    subagentName: 'Reviewer',
  })
})

test('Issue #127: turnRecordSchema validates agent attribution fields', () => {
  const validTurn = {
    turn: 1,
    step: 2,
    agentId: 'researcher-42',
    role: 'researcher',
    subagentName: 'Researcher Alpha',
    tokens: 4500,
    uncachedInputTokens: 3000,
    cacheReadTokens: 1000,
    outputTokens: 500,
    costDeltaUsd: 0.0125,
    timestamp: Date.now(),
  }
  const parsed = turnRecordSchema.safeParse(validTurn)
  assert.ok(parsed.success, 'turnRecordSchema should validate turn with agent metadata')
  assert.equal(parsed.data.agentId, 'researcher-42')
  assert.equal(parsed.data.role, 'researcher')
  assert.equal(parsed.data.subagentName, 'Researcher Alpha')
})

test('Issue #127: usageOf and projection.apply record agent attribution to turns', () => {
  const event = {
    type: 'assistant/message',
    time: Date.now(),
    data: {
      turn: 1,
      step: 1,
      agentId: 'coder-99',
      role: 'coder',
      subagentName: 'Coder Pro',
      usage: {
        inputTokens: 1500,
        outputTokens: 500,
        cacheReadTokens: 2000,
        cacheWriteTokens: 0,
      },
    },
  }

  const sample = usageOf(event)
  assert.equal(sample.agentId, 'coder-99')
  assert.equal(sample.role, 'coder')
  assert.equal(sample.subagentName, 'Coder Pro')

  const state0 = usageByModelProjection.init()
  const state1 = usageByModelProjection.apply(state0, {
    type: 'request/header',
    data: { header: { config: { provider: 'openrouter', model: 'deepseek/deepseek-chat' } } },
  })
  const state2 = usageByModelProjection.apply(state1, event)

  assert.ok(Array.isArray(state2.turns))
  assert.equal(state2.turns.length, 1)
  assert.equal(state2.turns[0].agentId, 'coder-99')
  assert.equal(state2.turns[0].role, 'coder')
  assert.equal(state2.turns[0].subagentName, 'Coder Pro')
  assert.equal(state2.turns[0].tokens, 4000)
})

test('Issue #127: getAgentsSpendReport groups spend hierarchically and preserves total session cost integrity', () => {
  const turns = [
    {
      turn: 1,
      agentId: 'root',
      role: 'root',
      subagentName: 'Root Agent',
      tokens: 2000,
      uncachedInputTokens: 1500,
      cacheReadTokens: 0,
      outputTokens: 500,
      costDeltaUsd: 0.005,
    },
    {
      turn: 2,
      agentId: 'researcher',
      role: 'researcher',
      subagentName: 'Web Researcher',
      tokens: 6000,
      uncachedInputTokens: 4000,
      cacheReadTokens: 1000,
      outputTokens: 1000,
      costDeltaUsd: 0.015,
    },
    {
      turn: 3,
      agentId: 'coder',
      role: 'coder',
      subagentName: 'Backend Coder',
      tokens: 12000,
      uncachedInputTokens: 8000,
      cacheReadTokens: 2000,
      outputTokens: 2000,
      costDeltaUsd: 0.030,
    },
    {
      turn: 4,
      agentId: 'researcher',
      role: 'researcher',
      subagentName: 'Web Researcher',
      tokens: 4000,
      uncachedInputTokens: 3000,
      cacheReadTokens: 500,
      outputTokens: 500,
      costDeltaUsd: 0.010,
    },
  ]

  const totalSessionCostUsd = 0.060 // sum is exactly 0.005 + 0.015 + 0.030 + 0.010 = 0.060
  const report = getAgentsSpendReport(turns, totalSessionCostUsd, '$', 1)

  assert.ok(report.hasSubagents, 'Session with multiple agents should have hasSubagents=true')
  assert.equal(report.agents.length, 3, 'Should have root, researcher, and coder')

  // Root should be first
  assert.equal(report.agents[0].agentId, 'root')
  assert.ok(report.agents[0].isRoot)
  assert.equal(report.agents[0].tokens, 2000)
  assert.equal(report.agents[0].costUsd, 0.005)

  // Top spender among subagents should be coder (0.030 USD, 12000 tokens)
  assert.equal(report.topSpender.agentId, 'coder')
  assert.equal(report.topSpender.name, 'Backend Coder')
  assert.equal(report.topSpender.costUsd, 0.030)

  // Researcher aggregated: turns 2 and 4 = 10000 tokens, 0.025 USD
  const researcher = report.agents.find((a) => a.agentId === 'researcher')
  assert.ok(researcher)
  assert.equal(researcher.tokens, 10000)
  assert.equal(researcher.costUsd, 0.025)
  assert.equal(researcher.turnCount, 2)

  // Sum of individual agent costs must preserve total session cost integrity
  const sumCost = report.agents.reduce((acc, a) => acc + a.costUsd, 0)
  assert.equal(Number(sumCost.toFixed(4)), totalSessionCostUsd)

  // Sum of percentages must equal approx 100%
  const sumPct = report.agents.reduce((acc, a) => acc + a.percentage, 0)
  assert.ok(sumPct >= 99.8 && sumPct <= 100.2)
})

test('Issue #130: analyzeCacheEfficiency heuristics and recommendation trigger thresholds', () => {
  // Case 1: < 5 turns -> collecting data, no recommendation
  const fewTurns = [
    { uncachedInputTokens: 1000, cacheReadTokens: 100 },
    { uncachedInputTokens: 1000, cacheReadTokens: 100 },
    { uncachedInputTokens: 1000, cacheReadTokens: 100 },
  ]
  const resFew = analyzeCacheEfficiency(fewTurns)
  assert.equal(resFew.hasRecommendation, false)
  assert.equal(resFew.status, 'collecting_data')

  // Case 2: >= 5 turns, cache hit rate < 40% (e.g. 10% hit rate) -> Suboptimal, triggers advice
  const badTurns = [
    { uncachedInputTokens: 900, cacheReadTokens: 100 },
    { uncachedInputTokens: 900, cacheReadTokens: 100 },
    { uncachedInputTokens: 900, cacheReadTokens: 100 },
    { uncachedInputTokens: 900, cacheReadTokens: 100 },
    { uncachedInputTokens: 900, cacheReadTokens: 100 },
  ]
  const resBad = analyzeCacheEfficiency(badTurns)
  assert.equal(resBad.hasRecommendation, true)
  assert.equal(resBad.status, 'suboptimal')
  assert.equal(resBad.hitRate, 10)
  assert.equal(resBad.potentialSavingsPct, 50)
  assert.equal(resBad.tipKey, 'advisor.cache_tip')
  assert.ok(resBad.tipText.includes('Pin static system prompts'))
  assert.ok(resBad.estimatedSavingsUsd > 0)

  // Case 3: >= 5 turns, cache hit rate >= 70% (e.g. 80% hit rate) -> Optimal
  const goodTurns = [
    { uncachedInputTokens: 200, cacheReadTokens: 800 },
    { uncachedInputTokens: 200, cacheReadTokens: 800 },
    { uncachedInputTokens: 200, cacheReadTokens: 800 },
    { uncachedInputTokens: 200, cacheReadTokens: 800 },
    { uncachedInputTokens: 200, cacheReadTokens: 800 },
  ]
  const resGood = analyzeCacheEfficiency(goodTurns)
  assert.equal(resGood.hasRecommendation, false)
  assert.equal(resGood.status, 'optimal')
  assert.equal(resGood.hitRate, 80)

  // Case 4: >= 5 turns, cache hit rate between 40% and 70% (e.g. 50%) -> Moderate
  const modTurns = [
    { uncachedInputTokens: 500, cacheReadTokens: 500 },
    { uncachedInputTokens: 500, cacheReadTokens: 500 },
    { uncachedInputTokens: 500, cacheReadTokens: 500 },
    { uncachedInputTokens: 500, cacheReadTokens: 500 },
    { uncachedInputTokens: 500, cacheReadTokens: 500 },
  ]
  const resMod = analyzeCacheEfficiency(modTurns)
  assert.equal(resMod.hasRecommendation, false)
  assert.equal(resMod.status, 'moderate')
  assert.equal(resMod.hitRate, 50)
})

test('Issue #127 & #130: client locale dictionary key parity and UI integrity', () => {
  const clientContent = readFileSync(join(rootDir, 'lib', 'client.js'), 'utf8')

  // Check required keys exist in code
  const requiredKeys = [
    'agents.attribution_title',
    'agents.top_spender',
    'agents.root',
    'agents.subagent',
    'agents.no_subagents',
    'advisor.cache_title',
    'advisor.cache_tip',
    'advisor.hit_rate_badge',
  ]

  for (const k of requiredKeys) {
    assert.ok(clientContent.includes("'" + k + "':"), 'client.js must define key ' + k)
  }

  // Check zero hex colors in our newly added styles
  const agentBoxMatch = clientContent.match(/agents-attribution-box[\s\S]*?\}\)\(\),/)?.[0]
  assert.ok(agentBoxMatch, 'agents-attribution-box must be present')
  assert.ok(!agentBoxMatch.includes('#'), 'agentBoxMatch must not contain hex colors')
  assert.ok(!agentBoxMatch.includes('rgba('), 'agentBoxMatch must not contain rgba colors')

  const cacheAdvisorMatch = clientContent.match(/cache-advisor-box[\s\S]*?\]\) : null,/)?.[0]
  assert.ok(cacheAdvisorMatch, 'cache-advisor-box must be present')
  assert.ok(!cacheAdvisorMatch.includes('#'), 'cacheAdvisorMatch must not contain hex colors')
  assert.ok(!cacheAdvisorMatch.includes('rgba('), 'cacheAdvisorMatch must not contain rgba colors')
})

test('Issue #127 & #130: lib/index.js maintains strict limit under 320 LOC', () => {
  const content = readFileSync(join(rootDir, 'lib', 'index.js'), 'utf8')
  const lines = content.split('\n')
  assert.ok(lines.length < 320, 'lib/index.js must be under 320 LOC (current: ' + lines.length + ')')
})
