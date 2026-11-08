import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'

import {
  formatGitCommitTrailers,
  appendCostTrailers,
  parseGitCommitTrailers,
} from '../lib/git-trailer.js'

import {
  estimateOutputTokens,
  smartMiddleTruncate,
  calculateTruncationSavings,
} from '../lib/truncation.js'

import { Config, normalizeConfig } from '../lib/index.js'

const indexPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')

test('Issue #143: formatGitCommitTrailers produces RFC-compliant Git trailers', () => {
  const trailers = formatGitCommitTrailers({
    totalCostUsd: 0.2345,
    currency: '$',
    fx: 1,
    inputTokens: 45200,
    outputTokens: 2100,
    cacheHitRate: 85.4,
    model: 'deepseek-chat',
    provider: 'deepseek',
  })

  assert.ok(trailers.includes('Token-Cost: $0.2345'))
  assert.ok(trailers.includes('Tokens-Input: 45.2k'))
  assert.ok(trailers.includes('Tokens-Output: 2.1k'))
  assert.ok(trailers.includes('Tokens-Cache-Hit: 85%'))
  assert.ok(trailers.includes('Model: deepseek/deepseek-chat'))
})

test('Issue #143: formatGitCommitTrailers handles million tokens and currency conversion', () => {
  const trailers = formatGitCommitTrailers({
    totalCostUsd: 1.50,
    currency: '₽',
    fx: 80,
    inputTokens: 1250000,
    outputTokens: 50000,
    cacheHitRate: 92,
    model: 'gpt-4o',
    provider: '',
  })

  assert.ok(trailers.includes('Token-Cost: ₽120.00'))
  assert.ok(trailers.includes('Tokens-Input: 1.3M'))
  assert.ok(trailers.includes('Tokens-Output: 50.0k'))
  assert.ok(trailers.includes('Tokens-Cache-Hit: 92%'))
  assert.ok(trailers.includes('Model: gpt-4o'))
})

test('Issue #143: appendCostTrailers cleanly appends trailers separated by newline', () => {
  const commitMsg = 'feat(auth): add OAuth2 provider support'
  const withTrailers = appendCostTrailers(commitMsg, {
    totalCostUsd: 0.12,
    currency: '$',
    inputTokens: 10000,
    outputTokens: 500,
    model: 'deepseek-chat',
  })

  assert.ok(withTrailers.startsWith('feat(auth): add OAuth2 provider support\n\n'))
  assert.ok(withTrailers.includes('Token-Cost: $0.12'))
  assert.ok(withTrailers.includes('Model: deepseek-chat'))
})

test('Issue #143: parseGitCommitTrailers parses trailers from git commit messages', () => {
  const rawMsg = `feat(checkout): implement stripe checkout session

Detailed commit description explaining changes.

Token-Cost: $0.45
Tokens-Input: 25.0k
Tokens-Output: 1.2k
Tokens-Cache-Hit: 88%
Model: anthropic/claude-3-5-sonnet`

  const parsed = parseGitCommitTrailers(rawMsg)
  assert.equal(parsed.found, true)
  assert.equal(parsed.cost, 0.45)
  assert.equal(parsed.currency, '$')
  assert.equal(parsed.inputTokens, 25000)
  assert.equal(parsed.outputTokens, 1200)
  assert.equal(parsed.cacheHitRate, 88)
  assert.equal(parsed.model, 'anthropic/claude-3-5-sonnet')
})

test('Issue #143: parseGitCommitTrailers returns false found on commits without trailers', () => {
  const rawMsg = 'docs: update README.md'
  const parsed = parseGitCommitTrailers(rawMsg)
  assert.equal(parsed.found, false)
  assert.equal(parsed.cost, 0)
})

test('Issue #154: smartMiddleTruncate leaves outputs below threshold untouched', () => {
  const shortText = 'Line 1\nLine 2\nLine 3'
  const res = smartMiddleTruncate(shortText, { maxTokens: 1000 })
  assert.equal(res.truncated, false)
  assert.equal(res.text, shortText)
  assert.equal(res.savedTokens, 0)
})

test('Issue #154: smartMiddleTruncate preserves head and tail while compacting middle', () => {
  // Generate 500 lines of sample logs
  const lines = []
  for (let i = 1; i <= 500; i++) {
    lines.push(`[TEST-LOG-${i}] status check line with detailed trace data ${i * 100}`)
  }
  const hugeText = lines.join('\n')

  const res = smartMiddleTruncate(hugeText, {
    maxTokens: 500, // force threshold exceed
    headLines: 50,
    tailLines: 30,
  })

  assert.equal(res.truncated, true)
  assert.ok(res.savedTokens > 0)
  assert.ok(res.text.includes('[TEST-LOG-1]'))
  assert.ok(res.text.includes('[TEST-LOG-50]'))
  assert.ok(!res.text.includes('[TEST-LOG-150]')) // middle line pruned
  assert.ok(res.text.includes('[TEST-LOG-471]'))
  assert.ok(res.text.includes('[TEST-LOG-500]'))
  assert.ok(res.text.includes('truncated by Cost Meter to preserve session budget'))
})

test('Issue #154: calculateTruncationSavings computes accurate dollar savings', () => {
  const savings = calculateTruncationSavings(50000, 0.55)
  assert.equal(savings.savedTokens, 50000)
  assert.equal(savings.savedUsd, 0.0275)
})

test('Issue #143 & #154: Config and normalizeConfig support new settings', () => {
  assert.ok(Config.dict.gitCommitTrailers !== undefined, 'Missing gitCommitTrailers in Config schema')
  assert.ok(Config.dict.smartTruncation !== undefined, 'Missing smartTruncation in Config schema')
  assert.ok(Config.dict.truncationMaxTokens !== undefined, 'Missing truncationMaxTokens in Config schema')

  const normalized = normalizeConfig({
    gitCommitTrailers: true,
    smartTruncation: false,
    truncationMaxTokens: 15000,
  })

  assert.equal(normalized.gitCommitTrailers, true)
  assert.equal(normalized.smartTruncation, false)
  assert.equal(normalized.truncationMaxTokens, 15000)
})

test('Issue #143 & #154: lib/index.js maintains strict file size under 320 LOC', () => {
  const content = fs.readFileSync(indexPath, 'utf8')
  const loc = content.split('\n').length
  assert.ok(loc <= 320, `lib/index.js has ${loc} lines, which exceeds the strict limit of 320 LOC`)
})

test('Issue #143 & #154: lib/client.js CSS strictly uses theme variables without hex/rgba colors', () => {
  const clientCode = fs.readFileSync(clientPath, 'utf8')
  const cssMatch = clientCode.match(/const CSS = `([\s\S]*?)`/)
  assert.ok(cssMatch, 'CSS constant not found in lib/client.js')
  const css = cssMatch[1]

  const hexMatches = css.match(/#[0-9a-fA-F]{3,8}/g) || []
  assert.deepEqual(hexMatches, [], 'Found hardcoded hex colors in CSS')

  const rgbaMatches = css.match(/rgba?\(/g) || []
  assert.deepEqual(rgbaMatches, [], 'Found hardcoded rgb/rgba colors in CSS')
})
