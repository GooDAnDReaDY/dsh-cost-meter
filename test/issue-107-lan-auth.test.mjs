import test from 'node:test'
import assert from 'node:assert/strict'
import { isTrustedCaller } from '../lib/index.js'
import { registerRoutes, STATE_PATH, REFRESH_PATH } from '../lib/routes.js'

test('Issue #107: isTrustedCaller rejects LAN callers with forged sec-fetch-site', () => {
  const lanReq = {
    socket: { remoteAddress: '192.168.1.55' },
    headers: {
      'sec-fetch-site': 'same-origin',
    },
  }

  // Without Origin/Host or authenticated connection, forged sec-fetch-site must fail closed
  assert.equal(isTrustedCaller(lanReq, null), false)
  assert.equal(isTrustedCaller(lanReq, {}), false)

  // Even if ctx has an admitted connection, lack of matching Origin/Host or loopback rejects
  const ctxAdmitted = { connection: { requestRejection: () => undefined } }
  assert.equal(isTrustedCaller(lanReq, ctxAdmitted), false)
})

test('Issue #107: isTrustedCaller fails closed when connection service is missing for remote callers', () => {
  const remoteReqWithOrigin = {
    socket: { remoteAddress: '192.168.1.55' },
    headers: {
      host: 'dsh.local:3080',
      origin: 'http://dsh.local:3080',
    },
  }

  // When ctx is provided in route handlers but has no connection service, fail closed
  const ctxNoConn = {}
  assert.equal(isTrustedCaller(remoteReqWithOrigin, ctxNoConn), false)

  // Loopback callers without conn are still trusted
  const loopbackReq = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      host: 'localhost:3080',
      origin: 'http://localhost:3080',
    },
  }
  assert.equal(isTrustedCaller(loopbackReq, ctxNoConn), true)
})

test('Issue #107: GET /state and POST /refresh block unauthenticated LAN requests with 403', async () => {
  const routes = new Map()
  const mockCtx = {
    webServer: {
      register: (route) => {
        routes.set(`${route.method} ${route.path}`, route)
        return () => {}
      },
    },
    effect: (fn) => fn(),
    connection: {
      requestRejection: (req) => {
        // Authenticated only with valid cookie/token
        if (req.headers['x-dsh-auth'] === 'valid-token') return undefined
        return 401
      },
    },
  }

  registerRoutes(mockCtx, {
    name: '@goodandready/dsh-cost-meter',
    isTrustedCaller,
    getCachedTariff: () => ({ source: 'openrouter', schedule: { windows: [] } }),
    refresh: async () => {},
    splitRoute: () => null,
    defaultRoute: () => null,
    getCurrentConfig: () => ({}),
    getCatalog: () => ({ fetchedAt: 1000, error: null, index: { byId: {} } }),
  })

  const stateRoute = routes.get(`GET ${STATE_PATH}`)
  const refreshRoute = routes.get(`POST ${REFRESH_PATH}`)
  assert.ok(stateRoute, 'state route registered')
  assert.ok(refreshRoute, 'refresh route registered')

  // 1. LAN client attempting GET /state with forged Sec-Fetch-Site -> 403
  let stateStatus = 0
  let stateBody = ''
  await stateRoute.handler(
    {
      socket: { remoteAddress: '192.168.1.120' },
      headers: { host: '192.168.1.111:3080', 'sec-fetch-site': 'same-origin' },
      url: STATE_PATH,
    },
    {
      writeHead: (status) => { stateStatus = status },
      end: (data) => { stateBody = data },
    },
  )
  assert.equal(stateStatus, 403)
  assert.match(stateBody, /forbidden/)

  // 2. LAN client attempting POST /refresh without session -> 403
  let refreshStatus = 0
  let refreshBody = ''
  await refreshRoute.handler(
    {
      socket: { remoteAddress: '192.168.1.120' },
      headers: { host: '192.168.1.111:3080', 'sec-fetch-site': 'same-origin' },
      url: REFRESH_PATH,
    },
    {
      writeHead: (status) => { refreshStatus = status },
      end: (data) => { refreshBody = data },
    },
  )
  assert.equal(refreshStatus, 403)
  assert.match(refreshBody, /forbidden/)

  // 3. Authenticated session succeeds -> 200
  let authStatus = 0
  let authBody = ''
  await stateRoute.handler(
    {
      socket: { remoteAddress: '192.168.1.120' },
      headers: {
        host: '192.168.1.111:3080',
        origin: 'http://192.168.1.111:3080',
        'x-dsh-auth': 'valid-token',
      },
      url: STATE_PATH,
    },
    {
      writeHead: (status) => { authStatus = status },
      end: (data) => { authBody = data },
    },
  )
  assert.equal(authStatus, 200)
  assert.ok(JSON.parse(authBody).currency !== undefined)
})