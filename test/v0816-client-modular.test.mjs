import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { slotOf, usageByModelProjection, ZERO, bucketsFromUsage } from '../lib/projection.js'
import { STATE_PATH, REFRESH_PATH } from '../lib/routes.js'
import * as indexExports from '../lib/index.js'

test('Issue #74: lib/index.js decomposition and exports continuity', () => {
  const indexFile = fs.readFileSync(path.resolve('lib/index.js'), 'utf8')
  const lines = indexFile.split('\n').length
  assert.ok(lines < 320, `lib/index.js must be < 320 lines, got ${lines}`)

  // Verify re-exports from projection.js and routes.js
  assert.equal(typeof indexExports.slotOf, 'function')
  assert.equal(typeof indexExports.usageByModelProjection, 'object')
  assert.equal(indexExports.STATE_PATH, '/dsh-cost-meter/state')
  assert.equal(indexExports.REFRESH_PATH, '/dsh-cost-meter/refresh')
  assert.equal(typeof slotOf, 'function')
  assert.equal(typeof usageByModelProjection, 'object')
  assert.equal(typeof bucketsFromUsage, 'function')
  assert.deepEqual(ZERO, { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
})

test('Issue #73: client fetchWithTimeout respects timeout and abort signals', async () => {
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
  assert.equal(typeof loadedModule.fetchWithTimeout, 'function')

  // Mock global fetch to verify signal passing
  const origFetch = globalThis.fetch
  try {
    let capturedSignal = null
    globalThis.fetch = async (url, opts) => {
      capturedSignal = opts?.signal
      return { ok: true, status: 200, json: async () => ({}) }
    }

    // Call without custom signal -> should attach AbortSignal.timeout
    await loadedModule.fetchWithTimeout('/test-url', {}, 5000)
    assert.ok(capturedSignal, 'fetchWithTimeout must supply a signal')
    assert.equal(typeof capturedSignal.aborted, 'boolean')

    // Call with user signal -> should merge signals
    const userController = new AbortController()
    await loadedModule.fetchWithTimeout('/test-url-2', { signal: userController.signal }, 5000)
    assert.ok(capturedSignal, 'fetchWithTimeout must forward/merge user signal')

    // Abort user signal -> capturedSignal or downstream should react
    userController.abort()
    assert.equal(userController.signal.aborted, true)

    // Verify all 5 client fetch locations in client.js use fetchWithTimeout
    const fetchMatches = clientCode.match(/fetchWithTimeout\(/g) || []
    assert.equal(fetchMatches.length, 6, 'fetchWithTimeout must be defined and called 5 times')
  } finally {
    globalThis.fetch = origFetch
  }
})
