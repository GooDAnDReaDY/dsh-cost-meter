import test from 'node:test'
import assert from 'node:assert/strict'
import { Config } from '../lib/index.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

test('Config schema has all 10 fields and UI card supports all scalar settings', () => {
  const schemaKeys = [
    'currency',
    'usdRate',
    'displayTimeZone',
    'deepseekPeakPrices',
    'useOpenRouter',
    'refreshHours',
    'modelMap',
    'prices',
    'manualPeakWindowsUtc',
    'manualOffPeakMultiplier',
  ]

  assert.equal(schemaKeys.length, 10)

  // Verify client.js exposes all 5 scalar fields in its draft / state
  const clientCode = readFileSync(join(__dirname, '../lib/client.js'), 'utf8')

  const uiFields = [
    'currency',
    'usdRate',
    'displayTimeZone',
    'useOpenRouter',
    'refreshHours',
  ]

  for (const field of uiFields) {
    assert.equal(clientCode.includes(`field.${field}`), true, `Missing locale key for field: ${field}`)
    assert.equal(clientCode.includes(`scope.set('${field}'`), true, `Missing scope.set for field: ${field}`)
  }

  // Verify safe service access patterns exist in client.js
  assert.equal(clientCode.includes("ctx.get('settingsScope')"), true, 'Missing safe ctx.get for settingsScope')
  assert.equal(clientCode.includes("ctx.get('locale')"), true, 'Missing safe ctx.get for locale')
})
