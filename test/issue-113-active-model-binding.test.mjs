import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { matchModel } from '../lib/tariff.js'
import { costByModelViewSchema, usageByModelProjection } from '../lib/projection.js'

test('Issue #113: matchModel fallback when multiple providers exist and route provider is unknown', () => {
  const index = {
    byLowerId: {},
    bySuffix: {
      'custom-coder': [
        'provider-a/custom-coder',
        'provider-b/custom-coder',
      ],
    },
  }

  // Exact provider match works
  const exact = matchModel(index, { provider: 'provider-b', model: 'custom-coder' })
  assert.equal(exact, 'provider-b/custom-coder')

  // Unknown provider falls back to first candidate instead of undefined
  const fallback = matchModel(index, { provider: 'my-custom-proxy', model: 'custom-coder' })
  assert.equal(fallback, 'provider-a/custom-coder')
})

test('Issue #113: matchModel prefix fallback for short names (e.g. beam)', () => {
  const index = {
    byLowerId: {},
    bySuffix: {
      'beam-1.0-501b-a23b': [
        'reflection/beam-1.0-501b-a23b',
      ],
    },
  }

  const res = matchModel(index, { provider: 'ollama-cloud', model: 'beam' })
  assert.equal(res, 'reflection/beam-1.0-501b-a23b')
})

test('Issue #113: costByModelViewSchema validates route field and usageByModelProjection.wire.view includes route', () => {
  const validWithRoute = {
    route: { provider: 'ollama-cloud', model: 'deepseek-v3' },
    models: [
      {
        provider: 'ollama-cloud',
        model: 'deepseek-v3',
        slots: {},
      },
    ],
  }
  const parsed = costByModelViewSchema.safeParse(validWithRoute)
  assert.equal(parsed.success, true)

  const validWithNullRoute = {
    route: null,
    models: [],
  }
  assert.equal(costByModelViewSchema.safeParse(validWithNullRoute).success, true)

  // Test wire.view
  const dummyState = {
    route: { provider: 'custom-prov', model: 'test-model' },
    byKey: {
      'custom-prov/test-model': {},
    },
  }
  const viewOutput = usageByModelProjection.wire.view(dummyState)
  assert.deepEqual(viewOutput.route, { provider: 'custom-prov', model: 'test-model' })
  assert.equal(viewOutput.models.length, 1)
  assert.equal(costByModelViewSchema.safeParse(viewOutput).success, true)
})

test('Issue #113: CostMeter renders model name only without provider prefix', () => {
  let loadedModule = null
  const mockReact = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (init) => {
      if (init === null) {
        return [{
          currency: '$',
          usdRate: 1,
          displayTimeZone: 'Europe/Moscow',
          schedule: {
            base: { cacheHit: 0.1, input: 0.5, cacheWrite: 0.2, output: 1.5 },
            windows: [],
          },
          route: { provider: 'ollama-cloud', model: 'deepseek-v3' },
          turns: [],
        }, () => {}]
      }
      return [typeof init === 'function' ? init() : init, () => {}]
    },
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

  const mockWindow = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        loadedModule = factory((pkg) => (pkg === 'react' ? mockReact : {}))
      },
    },
  }

  const clientPath = path.resolve('lib/client.js')
  const clientCode = fs.readFileSync(clientPath, 'utf8')
  const fn = new Function('window', clientCode)
  fn(mockWindow)

  assert.ok(loadedModule, 'CostMeter module must load successfully')
  const CostMeter = loadedModule.CostMeter
  assert.equal(typeof CostMeter, 'function')

  const mockCtx = {
    locale: { get: () => 'en' },
    get: () => null,
  }

  // Render with modelSelection pointing to custom model
  const rendered = CostMeter({
    ctx: mockCtx,
    useProjection: (name) => {
      if (name === 'modelSelection') return { next: { provider: 'test-prov', model: 'my-custom-model' } }
      if (name === 'tokenUsage') return { inputTokens: 100, outputTokens: 50 }
      if (name === 'costByModel') return { route: { provider: 'test-prov', model: 'my-custom-model' }, models: [] }
      return undefined
    },
  })

  assert.ok(rendered, 'CostMeter should render')
  // Verify chip tooltip does NOT contain provider prefix
  const chip = rendered.children?.[0]
  if (chip && chip.props?.title) {
    assert.doesNotMatch(chip.props.title, /test-prov\s*\//, 'Tooltip must not contain provider prefix')
    assert.doesNotMatch(chip.props.title, /ollama-cloud\s*\//, 'Tooltip must not contain provider prefix')
  }
})
