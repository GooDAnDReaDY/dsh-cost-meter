import test from 'node:test'
import assert from 'node:assert/strict'
import { isNewerVersion, isTrustedUpdateRequest, checkUpdateStatus } from '../lib/updater.js'

test('updater: isNewerVersion semantic version comparison with prereleases', () => {
  assert.equal(isNewerVersion('0.8.2', '0.8.3'), true)
  assert.equal(isNewerVersion('0.8.2', '0.9.0'), true)
  assert.equal(isNewerVersion('0.8.2', '1.0.0'), true)
  assert.equal(isNewerVersion('0.8.2', '0.8.2'), false)
  assert.equal(isNewerVersion('0.8.3', '0.8.2'), false)
  assert.equal(isNewerVersion('0.8.2', 'invalid'), false)

  // Prerelease comparisons (SemVer 2.0.0)
  assert.equal(isNewerVersion('0.8.3-beta.1', '0.8.3'), true)
  assert.equal(isNewerVersion('0.8.3', '0.8.3-beta.1'), false)
  assert.equal(isNewerVersion('0.8.3-alpha.1', '0.8.3-beta.1'), true)
  assert.equal(isNewerVersion('0.8.3-beta.1', '0.8.3-beta.2'), true)
  assert.equal(isNewerVersion('0.8.3-beta.2', '0.8.3-beta.1'), false)
  assert.equal(isNewerVersion('0.8.3-rc.1', '0.8.3-rc.2'), true)
  assert.equal(isNewerVersion('0.8.2', '0.8.3-alpha.1'), true)
})

test('updater: isTrustedUpdateRequest security checks fail-closed', () => {
  // Trusted loopback request with header and same-origin
  const validReq = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      'x-dsh-plugin-update': '1',
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      'sec-fetch-site': 'same-origin',
    },
  }
  assert.equal(isTrustedUpdateRequest(validReq), true)

  // Missing or wrong update header
  assert.equal(isTrustedUpdateRequest({ ...validReq, headers: { ...validReq.headers, 'x-dsh-plugin-update': '0' } }), false)
  assert.equal(isTrustedUpdateRequest({ ...validReq, headers: { host: '127.0.0.1:3000' } }), false)

  // Non-loopback remote address
  assert.equal(isTrustedUpdateRequest({ ...validReq, socket: { remoteAddress: '198.51.100.24' } }), false)

  // External origin
  assert.equal(isTrustedUpdateRequest({
    ...validReq,
    headers: { ...validReq.headers, origin: 'https://attacker.example.com' }
  }), false)

  // Origin host mismatch
  assert.equal(isTrustedUpdateRequest({
    ...validReq,
    headers: { ...validReq.headers, origin: 'http://localhost:8080' }
  }), false)
})

test('updater: checkUpdateStatus inspects package manifest', async () => {
  const manifestUrl = new URL('../package.json', import.meta.url)
  const status = await checkUpdateStatus(
    { packageName: '@goodandready/dsh-cost-meter', manifestUrl, registry: 'https://127.0.0.1:9999' },
    { profileName: 'test', profileDir: '/tmp/test' }
  )
  assert.equal(status.packageName, '@goodandready/dsh-cost-meter')
  assert.ok(status.currentVersion)
  assert.equal(status.latestCheckFailed, true)
  assert.equal(status.updateAvailable, false)
})

test('client: css styles strictly use theme variables and color-mix without hardcoded rgba/hex colors', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const source = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  const cssMatch = source.match(/el\.textContent = CSS[\s\S]*?const CSS = `([^`]+)`/) || source.match(/const CSS = `([^`]+)`/)
  assert.ok(cssMatch, 'CSS block must be present in lib/client.js')
  const css = cssMatch[1]
  assert.equal(/rgba\(/i.test(css), false, 'CSS must not contain hardcoded rgba() values')
  assert.equal(/#[0-9a-fA-F]{3,6}\b/i.test(css), false, 'CSS must not contain hardcoded hex colors')
  assert.ok(css.includes('color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent)'), 'Must use color-mix for success badge')
  assert.ok(css.includes('.dcm-chevron'), 'Must define .dcm-chevron transition class')
  assert.ok(css.includes('.dcm-chevron-open'), 'Must define .dcm-chevron-open rotation class')
})
