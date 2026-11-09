// dsh-cost-meter — Client billing codes and multi-tenant project tagging (Issue #157)
// Assigns session costs to project/client cost centers with persistent aggregation.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const TAGS_FILE = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'dsh-cost-meter-tags.json')

let activeSessionTag = ''

export function sanitizeTag(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\-\.:]/g, '')
    .slice(0, 40)
}

export function getActiveSessionTag() {
  return activeSessionTag
}

export function setActiveSessionTag(raw) {
  activeSessionTag = sanitizeTag(raw)
  return activeSessionTag
}

export function loadTagsStorage(filePath = TAGS_FILE) {
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        knownTags: Array.isArray(parsed.knownTags) ? parsed.knownTags : [],
        stats: (parsed.stats && typeof parsed.stats === 'object') ? parsed.stats : {},
        lastUpdated: Number(parsed.lastUpdated) || 0,
      }
    }
  } catch (err) {
    void err
  }
  return {
    knownTags: ['default', 'internal'],
    stats: {},
    lastUpdated: 0,
  }
}

export function saveTagsStorage(data, filePath = TAGS_FILE) {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    void err
    return false
  }
}

export function recordTagSpend(tag, costDeltaUsd, tokens = {}, options = {}) {
  const clean = sanitizeTag(tag) || 'untagged'
  const cost = Number(costDeltaUsd) || 0
  const filePath = options.filePath || TAGS_FILE
  const now = options.now || Date.now()

  const storage = loadTagsStorage(filePath)

  if (!storage.knownTags.includes(clean)) {
    storage.knownTags.push(clean)
    storage.knownTags.sort()
  }

  let stat = storage.stats[clean]
  if (!stat) {
    stat = {
      tag: clean,
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      turnsCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
    }
    storage.stats[clean] = stat
  }

  stat.totalCostUsd = Math.round((stat.totalCostUsd + cost) * 1000000) / 1000000
  stat.inputTokens += Number(tokens.uncachedInputTokens || tokens.inputTokens) || 0
  stat.outputTokens += Number(tokens.outputTokens) || 0
  stat.cacheReadTokens += Number(tokens.cacheReadTokens) || 0
  stat.turnsCount += 1
  stat.lastSeenAt = now

  storage.lastUpdated = now
  saveTagsStorage(storage, filePath)

  return stat
}

export function getTagsReport(options = {}) {
  const filePath = options.filePath || TAGS_FILE
  const storage = loadTagsStorage(filePath)
  const statsList = Object.values(storage.stats).sort((a, b) => b.totalCostUsd - a.totalCostUsd)

  return {
    activeSessionTag,
    knownTags: storage.knownTags,
    stats: storage.stats,
    topTags: statsList.slice(0, 20),
    totalTrackedTags: statsList.length,
    lastUpdated: storage.lastUpdated,
  }
}
