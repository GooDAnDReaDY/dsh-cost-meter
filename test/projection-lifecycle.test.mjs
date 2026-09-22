import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hhmmToMinutes, parseWindow, indexCatalog, matchModel, resolveTariff, slotOf } from '../lib/index.js'

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
