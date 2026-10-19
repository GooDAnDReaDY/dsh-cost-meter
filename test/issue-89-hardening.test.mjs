import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isTrustedCaller, getConnection, normalizeConfig } from '../lib/index.js'
import { registerRoutes, STATE_PATH, REFRESH_PATH } from '../lib/routes.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('Issue #89: getConnection traverses context defensively and finds connection service', () => {
  assert.equal(getConnection(null), undefined)
  assert.equal(getConnection({}), undefined)

  const fakeConn = { requestRejection: () => undefined }
  // Direct property
  assert.equal(getConnection({ connection: fakeConn }), fakeConn)
  // Cordis get() method
  assert.equal(getConnection({ get: (name) => name === 'connection' ? fakeConn : null }), fakeConn)
  // Cordis reflect.get
  assert.equal(getConnection({ reflect: { get: (name) => name === 'connection' ? fakeConn : null } }), fakeConn)
  // Context root traversal
  assert.equal(getConnection({ root: { connection: fakeConn } }), fakeConn)
})

test('Issue #89: isTrustedCaller enforces connection.requestRejection fail-closed', () => {
  const req = {
    socket: { remoteAddress: '192.168.1.50' },
    headers: { host: 'app.local:3080', origin: 'http://app.local:3080' },
  }

  // 1. Connection rejects with 401 Unauthorized -> must return false
  const ctx401 = { connection: { requestRejection: () => 401 } }
  assert.equal(isTrustedCaller(req, ctx401), false)

  // 2. Connection rejects with 403 Forbidden -> must return false
  const ctx403 = { connection: { requestRejection: () => 403 } }
  assert.equal(isTrustedCaller(req, ctx403), false)

  // 3. Connection throws unexpectedly -> fail-closed (must return false)
  const ctxThrow = { connection: { requestRejection: () => { throw new Error('DB timeout') } } }
  assert.equal(isTrustedCaller(req, ctxThrow), false)

  // 4. Request has connectionService rejecting -> must return false
  const reqWithConnService = {
    ...req,
    connectionService: { requestRejection: () => 401 },
  }
  assert.equal(isTrustedCaller(reqWithConnService, null), false)

  // 5. Connection admits session (rejection === undefined) -> allowed when origin matches host
  const ctxAdmitted = { connection: { requestRejection: () => undefined } }
  assert.equal(isTrustedCaller(req, ctxAdmitted), true)
})

test('Issue #89: normalizeConfig unwraps Volatile boxes and guarantees sane defaults without NaN', () => {
  // Mock Volatile<T> box
  const box = (val) => ({ get: () => val })

  const rawStartupConfig = {
    currency: box('$'),
    usdRate: box(1.0),
    displayTimeZone: box('Europe/Moscow'),
    budgetThreshold: box(50),
    useOpenRouter: box(true),
    refreshHours: box(12),
    prices: box({
      'deepseek/chat': {
        cacheHit: box(0.1),
        input: box(0.5),
        cacheWrite: box(0.5),
        output: box(2.0),
      },
    }),
  }

  const normalized = normalizeConfig(rawStartupConfig)
  assert.equal(normalized.currency, '$')
  assert.equal(normalized.usdRate, 1)
  assert.equal(normalized.displayTimeZone, 'Europe/Moscow')
  assert.equal(normalized.budgetThreshold, 50)
  assert.equal(normalized.useOpenRouter, true)
  assert.equal(normalized.refreshHours, 12)
  assert.equal(typeof normalized.prices['deepseek/chat'].input, 'number')
  assert.equal(normalized.prices['deepseek/chat'].input, 0.5)

  // Malformed / empty input fallbacks
  const fallback = normalizeConfig({
    currency: null,
    usdRate: -5,
    displayTimeZone: 123,
    budgetThreshold: 'invalid',
  })
  assert.equal(fallback.currency, '$')
  assert.equal(fallback.usdRate, 1)
  assert.equal(fallback.displayTimeZone, 'Europe/Moscow')
  assert.equal(fallback.budgetThreshold, 0)
  assert.equal(Number.isNaN(fallback.budgetThreshold), false)
})

test('Issue #89: registerRoutes passes ctx to isTrustedCaller and serializes clean JSON without raw boxes', async () => {
  let registeredRoutes = new Map()
  const mockCtx = {
    webServer: {
      register: (route) => {
        registeredRoutes.set(`${route.method} ${route.path}`, route)
        return () => {}
      },
    },
    effect: (fn) => fn(),
    connection: {
      requestRejection: (req) => {
        if (req.headers['x-auth'] === 'valid') return undefined
        return 401
      },
    },
  }

  const box = (val) => ({ get: () => val })
  const rawBoxesConfig = {
    currency: box('EUR'),
    usdRate: box(0.92),
    autoFxRate: box(false),
    displayTimeZone: box('UTC'),
    budgetThreshold: box(100),
  }

  registerRoutes(mockCtx, {
    name: '@goodandready/dsh-cost-meter',
    isTrustedCaller,
    getCachedTariff: () => ({ source: 'openrouter', schedule: { windows: [] } }),
    refresh: async () => {},
    splitRoute: () => null,
    defaultRoute: () => null,
    getCurrentConfig: () => normalizeConfig(rawBoxesConfig),
    getCatalog: () => ({ fetchedAt: 1000, error: null, index: { byId: {} } }),
  })

  const stateRoute = registeredRoutes.get('GET ' + STATE_PATH)
  assert.ok(stateRoute, 'GET /dsh-cost-meter/state registered')

  // 1. Untrusted caller (rejection 401) is blocked with 403
  let blockedStatus = 0
  let blockedBody = ''
  await stateRoute.handler(
    { socket: { remoteAddress: '192.168.1.100' }, headers: { host: 'dsh:3080' } },
    {
      writeHead: (status) => { blockedStatus = status },
      end: (data) => { blockedBody = data },
    },
  )
  assert.equal(blockedStatus, 403)
  assert.match(blockedBody, /forbidden/)

  // 2. Trusted caller receives valid clean JSON with no "{}" or NaN
  let okStatus = 0
  let okHeaders = {}
  let okBody = ''
  await stateRoute.handler(
    {
      socket: { remoteAddress: '192.168.1.100' },
      headers: { host: 'dsh:3080', origin: 'http://dsh:3080', 'x-auth': 'valid' },
      url: 'http://dsh:3080' + STATE_PATH,
    },
    {
      writeHead: (status, headers) => { okStatus = status; okHeaders = headers },
      end: (data) => { okBody = data },
    },
  )
  assert.equal(okStatus, 200)
  const parsed = JSON.parse(okBody)
  assert.equal(parsed.currency, 'EUR')
  assert.equal(parsed.usdRate, 0.92)
  assert.equal(parsed.displayTimeZone, 'UTC')
  assert.equal(parsed.budgetThreshold, 100)
  assert.notEqual(parsed.currency, '{}')
  assert.equal(Number.isNaN(parsed.budgetThreshold), false)
})

test('Issue #74 & Issue #89: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexContent = fs.readFileSync(path.join(root, 'lib', 'index.js'), 'utf8')
  const lines = indexContent.split('\n').length
  assert.ok(lines < 320, `lib/index.js must be strictly < 320 LOC, got ${lines}`)
})

