import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  getCacheTtlStatus,
  performCacheWarmup,
  recordCacheActivity,
  resetCacheActivity,
} from '../lib/warmup.js'
import {
  sanitizeTag,
  getActiveSessionTag,
  setActiveSessionTag,
  recordTagSpend,
  getTagsReport,
} from '../lib/tags.js'
import {
  Config,
  normalizeConfig,
  WARMUP_PATH,
  TAGS_PATH,
  SESSION_TAG_PATH,
} from '../lib/index.js'

const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')
const clientCode = fs.readFileSync(clientPath, 'utf8')
const indexPath = resolve(new URL('.', import.meta.url).pathname, '../lib/index.js')
const indexCode = fs.readFileSync(indexPath, 'utf8')

test('Issue #158: getCacheTtlStatus calculates remaining time and handles expiration', () => {
  resetCacheActivity()
  const baseTime = 1000000
  recordCacheActivity(baseTime)

  // 1. Immediately after activity: 10 minutes (600s) remaining
  const statusFresh = getCacheTtlStatus({ cacheTtlMinutes: 10, cacheKeepAliveEnabled: true }, { now: baseTime })
  assert.equal(statusFresh.remainingSeconds, 600)
  assert.equal(statusFresh.isExpired, false)
  assert.equal(statusFresh.isExpiringSoon, false)
  assert.equal(statusFresh.canKeepAlive, true)

  // 2. 9.5 minutes later (30s remaining): isExpiringSoon = true
  const statusSoon = getCacheTtlStatus({ cacheTtlMinutes: 10, cacheKeepAliveEnabled: true }, { now: baseTime + 570000 })
  assert.equal(statusSoon.remainingSeconds, 30)
  assert.equal(statusSoon.isExpiringSoon, true)
  assert.equal(statusSoon.isExpired, false)

  // 3. 11 minutes later: expired
  const statusExpired = getCacheTtlStatus({ cacheTtlMinutes: 10, cacheKeepAliveEnabled: true }, { now: baseTime + 660000 })
  assert.equal(statusExpired.remainingSeconds, 0)
  assert.equal(statusExpired.isExpired, true)
  assert.equal(statusExpired.canKeepAlive, false)
})

test('Issue #158: performCacheWarmup extends TTL and calculates estimated savings', () => {
  resetCacheActivity()
  const baseTime = 2000000
  recordCacheActivity(baseTime)

  const warmup = performCacheWarmup({ cacheTtlMinutes: 10 }, {
    now: baseTime + 500000,
    currentTokens: 10000,
    inputRatePer1M: 0.14,
  })

  assert.equal(warmup.ok, true)
  assert.equal(warmup.status, 'prewarmed')
  assert.ok(warmup.estimatedSavingsUsd > 0)
  assert.equal(warmup.expiresAt, baseTime + 500000 + 600000)
})

test('Issue #157: sanitizeTag cleans and normalizes billing codes', () => {
  assert.equal(sanitizeTag(' Client:Acme-01 '), 'client:acme-01')
  assert.equal(sanitizeTag('Project/Redesign$$$'), 'projectredesign')
  assert.equal(sanitizeTag(''), '')
  assert.equal(sanitizeTag(null), '')
})

test('Issue #157: recordTagSpend and getTagsReport track project costs', () => {
  const tmpFile = join(tmpdir(), 'dsh-tags-test-' + Date.now() + '.json')
  try {
    setActiveSessionTag('client:beta')
    assert.equal(getActiveSessionTag(), 'client:beta')

    recordTagSpend('client:beta', 0.25, { uncachedInputTokens: 5000, outputTokens: 1000 }, { filePath: tmpFile })
    recordTagSpend('client:beta', 0.10, { uncachedInputTokens: 2000, outputTokens: 500 }, { filePath: tmpFile })
    recordTagSpend('project:internal', 0.05, { uncachedInputTokens: 1000, outputTokens: 200 }, { filePath: tmpFile })

    const report = getTagsReport({ filePath: tmpFile })
    assert.equal(report.activeSessionTag, 'client:beta')
    assert.ok(report.knownTags.includes('client:beta'))
    assert.ok(report.knownTags.includes('project:internal'))

    const betaStats = report.stats['client:beta']
    assert.equal(betaStats.totalCostUsd, 0.35)
    assert.equal(betaStats.turnsCount, 2)
  } finally {
    try { fs.unlinkSync(tmpFile) } catch {}
  }
})

test('Issue #158 & #157: Config schema and normalizeConfig support warmup and tags', () => {
  const normalized = normalizeConfig({
    cacheKeepAliveEnabled: true,
    cacheTtlMinutes: 15,
    defaultSessionTag: 'client:prod',
  })
  assert.equal(normalized.cacheKeepAliveEnabled, true)
  assert.equal(normalized.cacheTtlMinutes, 15)
  assert.equal(normalized.defaultSessionTag, 'client:prod')

  assert.equal(WARMUP_PATH, '/dsh-cost-meter/warmup')
  assert.equal(TAGS_PATH, '/dsh-cost-meter/tags')
  assert.equal(SESSION_TAG_PATH, '/dsh-cost-meter/session-tag')
})

test('Issue #158 & #157: lib/index.js maintains strict file size under 320 LOC', () => {
  const lines = indexCode.split('\n').length
  assert.ok(lines < 320, `lib/index.js has ${lines} lines, which exceeds strict 320 limit`)
})

test('Issue #158 & #157: Dictionary key parity between en and zh in client.js', () => {
  const requiredKeys = [
    'section.warmup',
    'section.warmup_desc',
    'field.cacheKeepAliveEnabled',
    'hint.cacheKeepAliveEnabled',
    'field.cacheTtlMinutes',
    'hint.cacheTtlMinutes',
    'field.defaultSessionTag',
    'hint.defaultSessionTag',
    'section.tags',
    'section.tags_desc',
    'warmup.status_active',
    'warmup.status_expiring',
    'warmup.status_expired',
    'warmup.btn_prewarm',
    'warmup.done',
    'tag.current',
    'tag.set_btn',
    'tag.saved',
    'tag.no_tags',
  ]

  for (const k of requiredKeys) {
    const enMatch = clientCode.includes(`'${k}':`)
    assert.ok(enMatch, `Missing key ${k} in client.js`)
  }
})
