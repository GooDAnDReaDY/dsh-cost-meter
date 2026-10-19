import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateCacheSavings } from '../lib/tariff.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('Issue #92: calculateCacheSavings handles edge cases and returns zero for non-discounted rates', () => {
  // Empty / undefined inputs
  assert.deepEqual(calculateCacheSavings(null, null), { savedUsd: 0, readTokens: 0, percent: 0 })
  assert.deepEqual(calculateCacheSavings({}, {}), { savedUsd: 0, readTokens: 0, percent: 0 })

  // 0 cache tokens
  assert.deepEqual(
    calculateCacheSavings({ cacheReadTokens: 0 }, { input: 2.0, cacheHit: 0.2 }),
    { savedUsd: 0, readTokens: 0, percent: 0 }
  )

  // Flat rates (cacheHit == input)
  assert.deepEqual(
    calculateCacheSavings({ cacheReadTokens: 500_000 }, { input: 1.5, cacheHit: 1.5 }),
    { savedUsd: 0, readTokens: 0, percent: 0 }
  )

  // Inverted rates (cacheHit > input)
  assert.deepEqual(
    calculateCacheSavings({ cacheReadTokens: 500_000 }, { input: 1.0, cacheHit: 2.0 }),
    { savedUsd: 0, readTokens: 0, percent: 0 }
  )
})

test('Issue #92: calculateCacheSavings calculates accurate dollar and percent savings', () => {
  // DeepSeek-like rates: $0.14 input, $0.014 cache hit (90% discount)
  // 1,000,000 tokens: missed $0.14, hit $0.014 -> saved $0.126 (90%)
  const res = calculateCacheSavings(
    { cacheReadTokens: 1_000_000 },
    { input: 0.14, cacheHit: 0.014 }
  )
  assert.equal(res.readTokens, 1_000_000)
  assert.equal(Math.round(res.savedUsd * 1000) / 1000, 0.126)
  assert.equal(res.percent, 90)

  // 250,000 tokens with $2.0 input and $0.5 cache hit
  // missed: 0.25 * 2.0 = $0.50
  // hit: 0.25 * 0.5 = $0.125
  // saved: $0.375 (75%)
  const res2 = calculateCacheSavings(
    { cacheReadTokens: '250000' },
    { input: 2.0, cacheHit: 0.5 }
  )
  assert.equal(res2.readTokens, 250000)
  assert.equal(Math.round(res2.savedUsd * 1000) / 1000, 0.375)
  assert.equal(res2.percent, 75)
})

test('Issue #92: client module exposes cacheSavingsBySlots and spendBySlots cleanly', async () => {
  const clientPath = path.join(root, 'lib', 'client.js')
  const code = fs.readFileSync(clientPath, 'utf8')

  let loadedDef = null
  const mockWindow = {
    __ModuleLoader__: {
      load: (def) => {
        loadedDef = def
      },
    },
  }

  const fn = new Function('window', 'require', 'module', 'exports', code)
  const fakeRequire = (name) => {
    if (name === 'react') {
      return {
        createElement: () => ({}),
        useEffect: () => {},
        useState: (init) => [init, () => {}],
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        useRef: () => ({ current: null }),
      }
    }
    return {}
  }

  fn(mockWindow, fakeRequire, { exports: {} }, {})
  assert.ok(loadedDef, 'module registered with __ModuleLoader__')
  const mod = loadedDef.factory(fakeRequire)

  assert.equal(typeof mod.cacheSavingsBySlots, 'function')
  assert.equal(typeof mod.spendBySlots, 'function')

  // Test slot-based savings with peak/off-peak windows
  const schedule = {
    base: { cacheHit: 0.05, input: 0.50, cacheWrite: 0.10, output: 1.00 },
    windows: [
      {
        start: 600, // 10:00 UTC
        end: 720,   // 12:00 UTC
        rates: { cacheHit: 0.10, input: 1.00, cacheWrite: 0.20, output: 2.00 },
      },
    ],
  }

  const slots = {
    // Slot 0 (00:00 UTC): base rates (input 0.50, cacheHit 0.05)
    // 1M tokens: missed 0.50, hit 0.05 -> saved 0.45
    '0': { cacheReadTokens: 1_000_000 },
    // Slot 21 (10:30 UTC): peak window (input 1.00, cacheHit 0.10)
    // 1M tokens: missed 1.00, hit 0.10 -> saved 0.90
    '21': { cacheReadTokens: 1_000_000 },
  }

  const savings = mod.cacheSavingsBySlots(slots, schedule)
  assert.equal(savings.readTokens, 2_000_000)
  assert.equal(Math.round(savings.savedUsd * 100) / 100, 1.35)
  assert.equal(savings.percent, 90)
})

