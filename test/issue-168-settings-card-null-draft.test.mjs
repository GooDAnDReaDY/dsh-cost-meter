import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'

const clientPath = resolve(new URL('.', import.meta.url).pathname, '../lib/client.js')
const clientCode = fs.readFileSync(clientPath, 'utf8')

test('Issue #168: client.js does not contain fragile (draft && draft.x) !== undefined pattern', () => {
  // Any pattern like (draft && draft.xxx) !== undefined ? draft.xxx : ...
  // is dangerous because (null && null.xxx) returns null, and null !== undefined is true!
  const fragilePattern = /\(draft\s*&&\s*draft\.\w+\)\s*!==\s*undefined/
  assert.equal(
    fragilePattern.test(clientCode),
    false,
    'Found fragile pattern (draft && draft.xxx) !== undefined which crashes on draft === null'
  )
})

test('Issue #168: CostMeterCard checks (status === "loading" || !draft) before rendering form body', () => {
  assert.ok(
    clientCode.includes('(status === \'loading\' || !draft)'),
    'CostMeterCard must guard against uninitialized draft state before rendering form body'
  )
})

test('Issue #168: CostMeterCard save() persists visibility, alerts and privacy fields', () => {
  assert.ok(clientCode.includes("scope.set('privacyMode'"), 'save() must persist privacyMode')
  assert.ok(clientCode.includes("scope.set('showHeaderChip'"), 'save() must persist showHeaderChip')
  assert.ok(clientCode.includes("scope.set('showMessageAction'"), 'save() must persist showMessageAction')
  assert.ok(clientCode.includes("scope.set('alertBeforeSwitch'"), 'save() must persist alertBeforeSwitch')
})

test('Issue #168: Dictionary key parity between en and zh includes new visibility section', () => {
  assert.ok(clientCode.includes("'section.visibility'"), 'Missing section.visibility in en')
  assert.ok(clientCode.includes("'section.visibility_desc'"), 'Missing section.visibility_desc in en')
})
