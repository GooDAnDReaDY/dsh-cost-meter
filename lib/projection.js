// dsh-cost-meter — per-model usage projection for sessionProjections service.
import { z as zod } from 'zod'

export const ZERO = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

export const MAX_TURNS_HISTORY = 30

let lastSessionTurns = []

export function getLastTurns() {
  return lastSessionTurns.slice(-MAX_TURNS_HISTORY)
}

export function resetLastTurns() {
  lastSessionTurns = []
}

export const bucketSchema = zod.object({
  uncachedInputTokens: zod.number().nonnegative(),
  outputTokens: zod.number().nonnegative(),
  cacheReadTokens: zod.number().nonnegative(),
  cacheWriteTokens: zod.number().nonnegative(),
}).strict()

export const turnRecordSchema = zod.object({
  turn: zod.number().int().nonnegative(),
  step: zod.number().int().nonnegative().optional(),
  tokens: zod.number().nonnegative(),
  uncachedInputTokens: zod.number().nonnegative().optional(),
  outputTokens: zod.number().nonnegative().optional(),
  cacheReadTokens: zod.number().nonnegative().optional(),
  cacheWriteTokens: zod.number().nonnegative().optional(),
  costDeltaUsd: zod.number().nonnegative().optional(),
  timestamp: zod.number().nonnegative(),
}).passthrough()

/** Pull the four buckets out of one provider usage record. */
export function bucketsFromUsage(usage) {
  return {
    uncachedInputTokens: Number(usage.inputTokens) || 0,
    outputTokens: Number(usage.outputTokens) || 0,
    cacheReadTokens: Number(usage.cacheReadTokens) || 0,
    cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
  }
}

export function addBuckets(base, remove, add) {
  const out = {}
  for (const k of Object.keys(ZERO)) {
    out[k] = (base[k] || 0) - ((remove && remove[k]) || 0) + (add[k] || 0)
  }
  return out
}

export function sameBuckets(a, b) {
  return a && b && Object.keys(ZERO).every((k) => (a[k] || 0) === (b[k] || 0))
}

/** The usage a streamed chunk or a finalized assistant message reports. */
export function usageOf(event) {
  if (event.type === 'assistant/chunk' && event.data.chunk && event.data.chunk.type === 'usage') {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.chunk.usage }
  }
  if (event.type === 'assistant/message' && event.data.usage !== undefined) {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.usage }
  }
  return undefined
}

/**
 * Half-hour slot of the UTC day an event falls into (0..47).
 */
export function slotOf(timeMs) {
  let ms = typeof timeMs === 'number' && Number.isFinite(timeMs) ? timeMs : NaN
  if (Number.isNaN(ms)) {
    if (timeMs instanceof Date && !Number.isNaN(timeMs.getTime())) {
      ms = timeMs.getTime()
    } else {
      ms = Date.now()
    }
  }
  const d = new Date(ms)
  return Math.floor((d.getUTCHours() * 60 + d.getUTCMinutes()) / 30)
}

export const modelSlotsSchema = zod.record(zod.string(), bucketSchema)

export const costByModelViewSchema = zod.object({
  route: zod.object({
    provider: zod.string(),
    model: zod.string(),
  }).nullable().optional(),
  models: zod.array(zod.object({
    provider: zod.string(),
    model: zod.string(),
    slots: modelSlotsSchema,
  }).strict()),
  turns: zod.array(turnRecordSchema).optional(),
}).strict()

export const costByModelStateSchema = zod.object({
  route: zod.object({
    provider: zod.string(),
    model: zod.string(),
  }).nullable(),
  byKey: zod.record(zod.string(), modelSlotsSchema),
  last: zod.object({
    turn: zod.number().int().nonnegative(),
    step: zod.number().int().nonnegative(),
    key: zod.string(),
    slot: zod.string(),
    buckets: bucketSchema,
  }).nullable(),
  turns: zod.array(turnRecordSchema).optional(),
}).strict()

export const usageByModelProjection = {
  key: 'costByModel',
  stateVersion: 2,
  stateSchema: costByModelStateSchema,
  init: () => ({ route: null, byKey: {}, last: null }),
  apply: (state, event) => {
    if (event.type === 'request/header') {
      const config = event.data && event.data.header && event.data.header.config
      const provider = config && typeof config.provider === 'string' ? config.provider : undefined
      const model = config && typeof config.model === 'string' ? config.model : undefined
      if (provider === undefined || model === undefined) return state
      if (state.route && state.route.provider === provider && state.route.model === model) return state
      return { ...state, route: { provider, model } }
    }
    const sample = usageOf(event)
    if (sample === undefined) return state
    const route = state.route || { provider: '', model: 'unknown' }
    const key = route.provider + '/' + route.model
    const slot = String(slotOf(event.time))
    const buckets = bucketsFromUsage(sample.usage)
    const previous =
      state.last !== null &&
      state.last.turn === sample.turn &&
      state.last.step === sample.step &&
      state.last.key === key &&
      state.last.slot === slot
        ? state.last.buckets
        : undefined
    if (previous !== undefined && sameBuckets(previous, buckets)) return state

    // Track turns history capped to MAX_TURNS_HISTORY
    const turnNum = typeof sample.turn === 'number' ? sample.turn : 0
    const stepNum = typeof sample.step === 'number' ? sample.step : 0
    const totalTokens = buckets.uncachedInputTokens + buckets.outputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens
    const timestamp = (typeof event.time === 'number' && Number.isFinite(event.time))
      ? event.time
      : (event.time instanceof Date && !Number.isNaN(event.time.getTime()) ? event.time.getTime() : Date.now())

    const currentTurns = Array.isArray(state.turns) ? state.turns : []
    const existingIndex = currentTurns.findIndex((t) => t.turn === turnNum && t.step === stepNum)
    let nextTurns
    if (existingIndex >= 0) {
      nextTurns = currentTurns.slice()
      nextTurns[existingIndex] = {
        turn: turnNum,
        step: stepNum,
        tokens: totalTokens,
        uncachedInputTokens: buckets.uncachedInputTokens,
        outputTokens: buckets.outputTokens,
        cacheReadTokens: buckets.cacheReadTokens,
        cacheWriteTokens: buckets.cacheWriteTokens,
        costDeltaUsd: nextTurns[existingIndex].costDeltaUsd || 0,
        timestamp,
      }
    } else {
      const newEntry = {
        turn: turnNum,
        step: stepNum,
        tokens: totalTokens,
        uncachedInputTokens: buckets.uncachedInputTokens,
        outputTokens: buckets.outputTokens,
        cacheReadTokens: buckets.cacheReadTokens,
        cacheWriteTokens: buckets.cacheWriteTokens,
        costDeltaUsd: 0,
        timestamp,
      }
      nextTurns = [...currentTurns, newEntry].slice(-MAX_TURNS_HISTORY)
    }
    lastSessionTurns = nextTurns

    const slots = state.byKey[key] || {}
    return {
      route: state.route,
      byKey: {
        ...state.byKey,
        [key]: { ...slots, [slot]: addBuckets(slots[slot] || ZERO, previous, buckets) },
      },
      last: { turn: sample.turn, step: sample.step, key, slot, buckets },
      turns: nextTurns,
    }
  },
  wire: {
    viewSchema: costByModelViewSchema,
    view: (state) => ({
      ...(state.route ? { route: state.route } : {}),
      models: Object.keys(state.byKey).map((key) => {
        const slash = key.indexOf('/')
        return {
          provider: key.slice(0, slash),
          model: key.slice(slash + 1),
          slots: state.byKey[key],
        }
      }),
      ...(state.turns && state.turns.length ? { turns: state.turns } : {}),
    }),
  },
}