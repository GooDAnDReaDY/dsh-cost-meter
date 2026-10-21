import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hhmmToMinutes, parseWindow, indexCatalog, matchModel, resolveTariff, slotOf, usageByModelProjection, apply } from '../lib/index.js'

test('hhmmToMinutes and parseWindow handle valid and boundary inputs', () => {
  assert.equal(hhmmToMinutes(0), 0)
  assert.equal(hhmmToMinutes(130), 90)
  assert.equal(hhmmToMinutes(1000), 600)
  assert.equal(hhmmToMinutes(2359), 23 * 60 + 59)
  assert.equal(hhmmToMinutes(-1), undefined)
  assert.equal(hhmmToMinutes(2500), undefined)
  assert.deepEqual(parseWindow('01:00-04:00'), { start: 60, end: 240 })
  assert.deepEqual(parseWindow('06:30-10:15'), { start: 390, end: 615 })
  assert.equal(parseWindow(''), undefined)
  assert.equal(parseWindow('invalid-window'), undefined)
})

test('slotOf calculates correct 30-minute UTC slot', () => {
  assert.equal(slotOf(Date.UTC(2026, 8, 5, 0, 0, 0)), 0)
  assert.equal(slotOf(Date.UTC(2026, 8, 5, 0, 29, 59)), 0)
  assert.equal(slotOf(Date.UTC(2026, 8, 5, 0, 30, 0)), 1)
  assert.equal(slotOf(Date.UTC(2026, 8, 5, 12, 45, 0)), 25)
  assert.equal(slotOf(Date.UTC(2026, 8, 5, 23, 59, 59)), 47)
})

test('catalog indexing and model matching handle case and vendor suffixes', () => {
  const models = [
    { id: 'deepseek/deepseek-v4-flash', pricing: { prompt: '0.00000014', completion: '0.00000028' } },
    { id: 'openai/gpt-4o-mini', pricing: { prompt: '0.00000015', completion: '0.0000006' } },
    { id: 'ignored/batch:batch', pricing: { prompt: '0.00000001' } }
  ]
  const index = indexCatalog(models)
  assert.ok(index.byId['deepseek/deepseek-v4-flash'])
  assert.ok(index.byId['openai/gpt-4o-mini'])
  assert.equal(index.byId['ignored/batch:batch'], undefined)
  assert.equal(matchModel(index, { provider: 'openai', model: 'gpt-4o-mini' }, {}), 'openai/gpt-4o-mini')
  assert.equal(matchModel(index, { provider: 'openai', model: 'GPT-4O-MINI' }, {}), 'openai/gpt-4o-mini')
  assert.equal(matchModel(index, { provider: 'custom-proxy', model: 'gpt-4o-mini' }, {}), 'openai/gpt-4o-mini')
  assert.equal(matchModel(index, { provider: 'my-prov', model: 'fast' }, { 'my-prov/fast': 'openai/gpt-4o-mini' }), 'openai/gpt-4o-mini')
})

test('resolveTariff honors provider-aware resolution', () => {
  const models = [
    {
      id: 'deepseek/deepseek-v4-flash',
      pricing: {
        prompt: '0.0000002',
        completion: '0.0000008',
        input_cache_read: '0.00000005',
        input_cache_write: '0'
      }
    }
  ]
  const index = indexCatalog(models)
  const cfg = { prices: {}, deepseekPeakPrices: {}, manualOffPeakMultiplier: 1, useOpenRouter: true }
  const direct = resolveTariff(cfg, index, { provider: 'deepseek-official', model: 'deepseek-v4-flash' })
  assert.equal(direct.source, 'deepseek')
  assert.equal(direct.schedule.windows.length, 2)
  assert.equal(direct.schedule.windows[0].rates.output, 1.32)
  const openrouterRoute = resolveTariff(cfg, index, { provider: 'openrouter', model: 'deepseek/deepseek-v4-flash' })
  assert.equal(openrouterRoute.source, 'openrouter')
  assert.ok(Math.abs(openrouterRoute.schedule.base.output - 0.8) < 1e-6)
  assert.ok(Math.abs(openrouterRoute.schedule.base.input - 0.2) < 1e-6)
  const manualCfg = {
    ...cfg,
    prices: {
      'custom/model': { cacheHit: 0.1, input: 1.0, cacheWrite: 0, output: 2.0 }
    }
  }
  const manual = resolveTariff(manualCfg, index, { provider: 'custom', model: 'model' })
  assert.equal(manual.source, 'manual')
  assert.equal(manual.schedule.base.output, 2.0)
  const unknown = resolveTariff(cfg, index, { provider: 'unknown', model: 'unknown-model' })
  assert.equal(unknown.source, 'none')
  assert.equal(unknown.schedule, null)
})

test('scheduleOf preserves explicit zero override and falls back for omitted fields (Issue #52)', () => {
  const models = [
    {
      id: 'vendor/free-night-model',
      pricing: {
        prompt: '0.000002',
        completion: '0.000008',
        input_cache_read: '0.0000005',
        input_cache_write: '0.000001',
        overrides: [
          {
            utc_start: 0,
            utc_end: 800,
            prompt: '0', // Explicit zero: 0 per million
            input_cache_read: 0, // Explicit zero numeric
            // completion is omitted: should fall back to base (8)
            // input_cache_write is omitted: should fall back to base (1)
          }
        ]
      }
    }
  ]
  const index = indexCatalog(models)
  const entry = index.byId['vendor/free-night-model']
  assert.ok(entry, 'catalog entry exists')
  assert.equal(entry.base.input, 2)
  assert.equal(entry.base.output, 8)
  assert.equal(entry.base.cacheHit, 0.5)
  assert.equal(entry.base.cacheWrite, 1)

  assert.equal(entry.windows.length, 1)
  const win = entry.windows[0]
  assert.equal(win.rates.input, 0, 'explicit zero prompt must not fall back to base price')
  assert.equal(win.rates.cacheHit, 0, 'explicit zero cacheHit must not fall back to base price')
  assert.equal(win.rates.output, 8, 'omitted completion falls back to base price')
  assert.equal(win.rates.cacheWrite, 1, 'omitted cacheWrite falls back to base price')
})

test('matchModel suffix disambiguation with multiple candidates (Issue #53)', () => {
  const models = [
    { id: 'vendor-a/shared-model-name', pricing: { prompt: '0.000001', completion: '0.000002' } },
    { id: 'vendor-b/shared-model-name', pricing: { prompt: '0.000003', completion: '0.000004' } },
    { id: 'unique-vendor/unique-model', pricing: { prompt: '0.000005', completion: '0.000006' } }
  ]
  const index = indexCatalog(models)

  // Single candidate matches by suffix
  assert.equal(
    matchModel(index, { provider: 'unknown-vendor', model: 'unique-model' }, {}),
    'unique-vendor/unique-model'
  )

  // Multiple candidates match by suffix: resolves via provider prefix match
  assert.equal(
    matchModel(index, { provider: 'vendor-b', model: 'shared-model-name' }, {}),
    'vendor-b/shared-model-name'
  )
  assert.equal(
    matchModel(index, { provider: 'vendor-a', model: 'shared-model-name' }, {}),
    'vendor-a/shared-model-name'
  )

  // Multiple candidates match by suffix: unknown provider falls back to first catalog candidate (Issue #113)
  assert.equal(
    matchModel(index, { provider: 'vendor-c', model: 'shared-model-name' }, {}),
    'vendor-a/shared-model-name'
  )
})

test('usageByModelProjection satisfies production contract and validates schemas (Issue #58)', () => {
  assert.equal(usageByModelProjection.key, 'costByModel')
  assert.equal(usageByModelProjection.stateVersion, 2)
  assert.ok(usageByModelProjection.stateSchema, 'stateSchema exists')
  assert.ok(usageByModelProjection.wire, 'wire exists')
  assert.ok(usageByModelProjection.wire.viewSchema, 'wire.viewSchema exists')
  assert.equal(typeof usageByModelProjection.wire.view, 'function')

  // 1. Initial state
  const state0 = usageByModelProjection.init()
  assert.doesNotThrow(() => usageByModelProjection.stateSchema.parse(state0), 'init passes stateSchema')
  const view0 = usageByModelProjection.wire.view(state0)
  assert.doesNotThrow(() => usageByModelProjection.wire.viewSchema.parse(view0), 'init view passes viewSchema')
  assert.deepEqual(view0, { models: [] })

  // 2. Event: request/header sets the active route
  const eventHeader = {
    type: 'request/header',
    data: {
      header: {
        config: { provider: 'deepseek', model: 'deepseek-chat' }
      }
    }
  }
  const state1 = usageByModelProjection.apply(state0, eventHeader)
  assert.deepEqual(state1.route, { provider: 'deepseek', model: 'deepseek-chat' })
  assert.doesNotThrow(() => usageByModelProjection.stateSchema.parse(state1))

  // 3. Event: assistant/message with token usage
  const eventMsg = {
    type: 'assistant/message',
    time: Date.UTC(2026, 8, 25, 12, 0, 0), // slot 24
    data: {
      turn: 1,
      step: 0,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 30,
        cacheWriteTokens: 10,
      }
    }
  }
  const state2 = usageByModelProjection.apply(state1, eventMsg)
  assert.doesNotThrow(() => usageByModelProjection.stateSchema.parse(state2))

  const view2 = usageByModelProjection.wire.view(state2)
  assert.doesNotThrow(() => usageByModelProjection.wire.viewSchema.parse(view2))
  assert.equal(view2.models.length, 1)
  assert.equal(view2.models[0].provider, 'deepseek')
  assert.equal(view2.models[0].model, 'deepseek-chat')
  assert.deepEqual(view2.models[0].slots['24'], {
    uncachedInputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 30,
    cacheWriteTokens: 10,
  })

  // 4. Duplicate event deduplication (same turn, step, slot, buckets)
  const state2Dup = usageByModelProjection.apply(state2, eventMsg)
  assert.equal(state2Dup, state2, 'duplicate usage event returns same state reference')

  // 5. Checkpoint serialize and restore
  const checkpoint = JSON.stringify(state2)
  const restored = JSON.parse(checkpoint)
  assert.doesNotThrow(() => usageByModelProjection.stateSchema.parse(restored), 'restored checkpoint passes stateSchema')
  const restoredView = usageByModelProjection.wire.view(restored)
  assert.doesNotThrow(() => usageByModelProjection.wire.viewSchema.parse(restoredView), 'restored view passes viewSchema')
  assert.deepEqual(restoredView, view2)
})

test('apply registers usageByModelProjection in sessionProjections (Issue #58)', () => {
  let registeredDef = null
  const listeners = new Map()

  const fakeCtx = {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(handler)
    },
    emit(event, ...args) {
      for (const h of listeners.get(event) || []) h(...args)
    },
    inject(deps, fn) {
      if (deps.includes('sessionProjections')) {
        fn({
          sessionProjections: {
            register(def) {
              registeredDef = def
            }
          }
        })
      }
    },
    effect(fn) {
      fn()
    },
    webServer: {
      register() {}
    }
  }

  apply(fakeCtx, { prices: {} })
  assert.ok(registeredDef, 'sessionProjections.register was called')
  assert.equal(registeredDef.key, 'costByModel')
  assert.equal(registeredDef.stateVersion, 2)
  assert.ok(registeredDef.stateSchema)
  assert.ok(registeredDef.wire.viewSchema)
})

test('apply does not call settings.register and handles SettingsForms lifecycle (Issues #59, #62, #63, #64, #65, #69)', () => {
  const listeners = new Map()
  let settingsRegisterCalled = false
  let describeCalledWith = null
  let currentVal = { currency: 'EUR', usdRate: 0.92 }

  const fakeCtx = {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(handler)
    },
    emit(event, ...args) {
      for (const h of listeners.get(event) || []) h(...args)
    },
    inject(deps, fn) {
      if (deps.includes('settings')) {
        // DSH 0.2 SettingsForms: describe(options) returns an array of descriptors
        const modernSettings = {
          describe(opts) {
            describeCalledWith = opts
            return [
              { ns: 'agent-default-model', value: { provider: 'test', model: 'test' } },
              { ns: 'dsh-cost-meter', value: currentVal },
            ]
          },
          update() {},
          replace() {},
        }
        fn({ settings: modernSettings })
      }
      if (deps.includes('sessionProjections')) {
        fn({ sessionProjections: { register() {} } })
      }
    },
    effect(fn) {
      fn()
    },
    webServer: {
      register() {}
    }
  }

  // Boot: apply should NOT throw error even without settings.register
  assert.doesNotThrow(() => {
    apply(fakeCtx, { currency: '$', usdRate: 1 })
  })

  assert.equal(settingsRegisterCalled, false, 'settings.register was never called')
  assert.deepEqual(describeCalledWith, { redactSecrets: true }, 'settings.describe was called with options object')

  // Live settings update reaction via settings/document-updated
  currentVal = { currency: 'GBP', usdRate: 0.78 }
  assert.doesNotThrow(() => {
    fakeCtx.emit('settings/document-updated', 'dsh-cost-meter')
  })
})
