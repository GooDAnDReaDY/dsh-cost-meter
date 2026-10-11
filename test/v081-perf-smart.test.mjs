import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  Config,
  VENDOR_ALIASES,
  matchModel,
  resolveTariff,
  indexCatalog,
  hhmmToMinutes,
} from '../lib/index.js'

test('v0.8.1: Config includes budgetThreshold with default 0', () => {
  const dict = Config.dict || {}
  assert.ok(dict.budgetThreshold, 'budgetThreshold must be defined on Config schema')
  assert.equal(dict.budgetThreshold.meta && dict.budgetThreshold.meta.default, 0)
})

test('v0.8.1: Vendor aliases normalize provider names', () => {
  assert.equal(VENDOR_ALIASES['z-ai'], 'zai')
  assert.equal(VENDOR_ALIASES['deepseek-official'], 'deepseek')
  assert.equal(VENDOR_ALIASES['gemini'], 'google')

  const sampleModels = [
    { id: 'zai/glm-4-plus', pricing: { prompt: 0.000005, completion: 0.000005 } },
    { id: 'deepseek/deepseek-chat', pricing: { prompt: 0.000001, completion: 0.000002 } },
  ]
  const index = indexCatalog(sampleModels)

  // Route with z-ai provider alias matches zai in catalog
  const matchedZai = matchModel(index, { provider: 'z-ai', model: 'glm-4-plus' })
  assert.equal(matchedZai, 'zai/glm-4-plus')

  const matchedDs = matchModel(index, { provider: 'deepseek-official', model: 'deepseek-chat' })
  assert.equal(matchedDs, 'deepseek/deepseek-chat')
})

test('v0.8.1: O(K) minutesUntilChange matches expected schedule window transitions and extremes memoizes', () => {
  let loadedModule = null
  const mockWindow = {
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        if (id === '@goodandready/dsh-cost-meter') {
          const mockReact = {
            createElement: (type, props, ...children) => ({ type, props, children }),
            useState: (init) => [init, () => {}],
            useEffect: () => {},
            useMemo: (fn) => fn(),
            useCallback: (fn) => fn,
            useRef: (init) => ({ current: init }),
            useSyncExternalStore: () => ({ status: 'ready', value: {} }),
            Fragment: 'Fragment',
            Component: class MockComponent {
              constructor(props) { this.props = props; this.state = {} }
              setState(next) { this.state = Object.assign(this.state, typeof next === 'function' ? next(this.state) : next) }
            },
          }
          loadedModule = factory((pkg) => (pkg === 'react' ? mockReact : {}))
        }
      },
    },
  }

  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  const fn = new Function('window', clientCode)
  fn(mockWindow)

  assert.ok(loadedModule, 'Client module must be loaded')
  const { minutesUntilChange, extremes, ratesAt } = loadedModule

  const schedule = {
    base: { cacheHit: 0.007, input: 0.22, cacheWrite: 0.22, output: 0.66 },
    windows: [
      { start: 60, end: 240, rates: { cacheHit: 0.014, input: 0.44, cacheWrite: 0.44, output: 1.32 } },
      { start: 360, end: 600, rates: { cacheHit: 0.014, input: 0.44, cacheWrite: 0.44, output: 1.32 } },
    ],
  }

  // At minute 0 (00:00 UTC): off-peak. Next window starts at 60 (01:00 UTC). Diff = 60.
  const diff0 = minutesUntilChange(schedule, 0)
  assert.equal(diff0, 60)

  // At minute 59: diff should be 1 minute
  const diff59 = minutesUntilChange(schedule, 59)
  assert.equal(diff59, 1)

  // At minute 60: peak. Next rate change is window end at 240. Diff = 180.
  const diff60 = minutesUntilChange(schedule, 60)
  assert.equal(diff60, 180)

  // Extremes memoization
  const ext1 = extremes(schedule)
  const ext2 = extremes(schedule)
  assert.equal(ext1, ext2) // Same reference from WeakMap
  assert.equal(ext1.flat, false)
  assert.equal(ext1.low.output, 0.66)
  assert.equal(ext1.high.output, 1.32)
})

test('v0.8.1: resolveTariff caching behavior and resilience', () => {
  const cfg = {
    prices: {
      'custom/fast': { input: 1.0, output: 2.0, cacheHit: 0.5, cacheWrite: 0.5 },
    },
  }
  const index = indexCatalog([])
  const res = resolveTariff(cfg, index, { provider: 'custom', model: 'fast' })
  assert.equal(res.source, 'manual')
  assert.equal(res.schedule.base.input, 1.0)
})

test('Issue #67: tariff parsing safely unwraps Volatile boxed numerics and peak windows', async () => {
  const { unwrapVolatile, perMillion, overrideBucket } = await import('../lib/tariff.js')

  // Boxed volatile number in perMillion
  const boxedPrice = { get: () => '0.0000015' }
  assert.equal(perMillion(boxedPrice), 1.5)

  // Boxed volatile number in overrideBucket
  const boxedOverride = { get: () => 2.5 }
  assert.equal(overrideBucket(boxedOverride, 1.0), 2.5 * 1e6)

  // Boxed volatile values in resolveTariff
  const volatileCfg = {
    prices: {
      'custom/boxed': {
        input: { get: () => 1.25 },
        output: { get: () => 2.5 },
        cacheHit: { get: () => 0.1 },
        cacheWrite: { get: () => 0.2 },
      },
    },
    manualOffPeakMultiplier: { get: () => 0.5 },
    manualPeakWindowsUtc: { get: () => ['10:00-14:00'] },
  }

  const index = indexCatalog([])
  const res = resolveTariff(volatileCfg, index, { provider: 'custom', model: 'boxed' })
  assert.equal(res.source, 'manual')
  assert.equal(res.schedule.windows.length, 1)
  assert.equal(res.schedule.windows[0].start, 600)
  assert.equal(res.schedule.windows[0].end, 840)
  assert.equal(res.schedule.windows[0].rates.input, 1.25)
  assert.equal(res.schedule.base.input, 0.625)

  // manualPeakWindowsUtc is non-array volatile or undefined doesn't throw TypeError
  const nullWindowsCfg = {
    prices: { 'test/model': { input: 1 } },
    manualPeakWindowsUtc: { get: () => null },
  }
  const resNull = resolveTariff(nullWindowsCfg, index, { provider: 'test', model: 'model' })
  assert.equal(resNull.source, 'manual')
  assert.equal(resNull.schedule.windows.length, 0)
})
