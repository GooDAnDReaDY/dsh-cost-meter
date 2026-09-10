import test from 'node:test'
import assert from 'node:assert/strict'
import { slotOf, matchModel, splitRoute } from '../lib/index.js'

test('slotOf handles undefined, null, invalid date, and Date instances without producing NaN', () => {
  const sUndefined = slotOf(undefined)
  assert.equal(typeof sUndefined, 'number')
  assert.ok(Number.isFinite(sUndefined) && sUndefined >= 0 && sUndefined < 48)

  const sNull = slotOf(null)
  assert.equal(typeof sNull, 'number')
  assert.ok(Number.isFinite(sNull) && sNull >= 0 && sNull < 48)

  const sNaN = slotOf(NaN)
  assert.equal(typeof sNaN, 'number')
  assert.ok(Number.isFinite(sNaN) && sNaN >= 0 && sNaN < 48)

  const sInvalidStr = slotOf('not-a-date')
  assert.equal(typeof sInvalidStr, 'number')
  assert.ok(Number.isFinite(sInvalidStr) && sInvalidStr >= 0 && sInvalidStr < 48)

  const now = new Date()
  const sDate = slotOf(now)
  const expectedSlot = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 30)
  assert.equal(sDate, expectedSlot)
})

test('matchModel is resilient against uninitialized or empty catalog index on cold start', () => {
  // Empty index should return undefined and NOT throw TypeError
  const emptyIndex = { byId: {}, byLowerId: {}, bySuffix: {} }
  assert.equal(matchModel(emptyIndex, { provider: 'test', model: 'foo' }), undefined)

  // Incompletely initialized index without byLowerId must not throw
  const missingLowerId = { byId: {}, bySuffix: {} }
  assert.doesNotThrow(() => {
    const res = matchModel(missingLowerId, { provider: 'test', model: 'foo' })
    assert.equal(res, undefined)
  })

  // Populated index
  const validIndex = {
    byId: { 'deepseek/deepseek-chat': { base: {} } },
    byLowerId: { 'deepseek/deepseek-chat': 'deepseek/deepseek-chat' },
    bySuffix: { 'deepseek-chat': ['deepseek/deepseek-chat'] },
  }
  assert.equal(matchModel(validIndex, { provider: 'deepseek', model: 'deepseek-chat' }), 'deepseek/deepseek-chat')
  assert.equal(matchModel(validIndex, { provider: 'other', model: 'deepseek-chat' }), 'deepseek/deepseek-chat')
})

test('splitRoute supports both provider/model and standalone model identifiers', () => {
  assert.deepEqual(splitRoute('openai/gpt-4o'), { provider: 'openai', model: 'gpt-4o' })
  assert.deepEqual(splitRoute('deepseek/deepseek-v4-pro:0731'), { provider: 'deepseek', model: 'deepseek-v4-pro:0731' })
  assert.deepEqual(splitRoute('deepseek-chat'), { provider: '', model: 'deepseek-chat' })
  assert.deepEqual(splitRoute('  glm-5.3-flash  '), { provider: '', model: 'glm-5.3-flash' })
  assert.equal(splitRoute(''), undefined)
  assert.equal(splitRoute(null), undefined)
})

test('client module exposes ErrorBoundary and unified classes in CSS', async () => {
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

  // Evaluate client script in sandbox
  const fs = await import('node:fs')
  const path = await import('node:path')
  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  const fn = new Function('window', clientCode)
  fn(mockWindow)

  assert.ok(loadedModule, 'Module should register via __ModuleLoader__')
  assert.equal(typeof loadedModule.apply, 'function')
  assert.equal(typeof loadedModule.CostMeterCard, 'function')
  assert.equal(typeof loadedModule.CostMeter, 'function')
  assert.equal(typeof loadedModule.ErrorBoundary, 'function')

  // Verify ErrorBoundary handles exceptions
  const BoundaryClass = loadedModule.ErrorBoundary
  const boundaryInstance = new BoundaryClass({})
  boundaryInstance.state = { hasError: true, error: new Error('Simulation test') }
  const renderedFallback = boundaryInstance.render()
  assert.ok(renderedFallback)
  assert.equal(renderedFallback.props.className, 'dcm-alert dcm-alert-err')
})
