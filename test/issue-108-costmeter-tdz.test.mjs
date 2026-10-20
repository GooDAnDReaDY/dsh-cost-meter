import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Issue #108: CostMeter does not throw ReferenceError (Cannot access state before initialization)', () => {
  let loadedModule = null
  let stateValue = null
  const setState = (next) => { stateValue = next }

  const mockReact = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (init) => {
      if (typeof init === 'function') init = init()
      // First useState in CostMeter is [state, setState]
      if (stateValue === null && init === null) {
        return [null, setState]
      }
      return [init, () => {}]
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

  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  const fn = new Function('window', clientCode)
  fn(mockWindow)

  assert.ok(loadedModule, 'Module should register via __ModuleLoader__')
  assert.equal(typeof loadedModule.CostMeter, 'function')

  const mockCtx = {
    locale: { get: () => 'en' },
    get: () => null,
  }

  // 1. Initial render when state is null (cold start)
  let initialRenderResult
  assert.doesNotThrow(() => {
    initialRenderResult = loadedModule.CostMeter({
      ctx: mockCtx,
      useProjection: (name) => {
        if (name === 'tokenUsage') return { inputTokens: 1000, outputTokens: 200 }
        if (name === 'costByModel') return { models: [], turns: [] }
        return undefined
      },
    })
  }, 'CostMeter must not throw ReferenceError during cold start render')
  assert.equal(initialRenderResult, null, 'Must return null before state is loaded')

  // 2. Render when state is loaded
  const mockReactWithState = {
    ...mockReact,
    useState: (init) => {
      if (init === null) {
        return [{
          currency: '$',
          usdRate: 1,
          displayTimeZone: 'Europe/Moscow',
          schedule: { windows: [] },
          route: { provider: 'deepseek', model: 'deepseek-chat' },
          turns: [
            { turn: 1, step: 1, tokens: 500, costDeltaUsd: 0.001, timestamp: Date.now() - 60000 },
            { turn: 2, step: 1, tokens: 1500, costDeltaUsd: 0.003, timestamp: Date.now() },
          ],
        }, () => {}]
      }
      return [typeof init === 'function' ? init() : init, () => {}]
    },
  }

  const mockWindow2 = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        loadedModule = factory((pkg) => (pkg === 'react' ? mockReactWithState : {}))
      },
    },
  }
  fn(mockWindow2)

  let renderedWithState
  assert.doesNotThrow(() => {
    renderedWithState = loadedModule.CostMeter({
      ctx: mockCtx,
      useProjection: (name) => {
        if (name === 'tokenUsage') return { inputTokens: 2000, outputTokens: 500 }
        if (name === 'costByModel') return {
          models: [{ provider: 'deepseek', model: 'deepseek-chat', slots: { 0: { uncachedInputTokens: 2000, outputTokens: 500 } } }],
          turns: [
            { turn: 1, step: 1, tokens: 500, costDeltaUsd: 0.001, timestamp: Date.now() - 60000 },
            { turn: 2, step: 1, tokens: 1500, costDeltaUsd: 0.003, timestamp: Date.now() },
          ],
        }
        return undefined
      },
    })
  }, 'CostMeter must not throw when rendering populated state')

  assert.ok(renderedWithState, 'Must return rendered JSX/h element tree')
})