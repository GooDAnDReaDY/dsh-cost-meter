import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { Config, normalizeConfig } from '../lib/index.js'

test('Issue #96: Config schema includes displayMode enum with auto default', () => {
  assert.ok((Config.dict && Config.dict.displayMode), 'displayMode field must exist in Config')
  
  // Normalization behavior
  const autoConf = normalizeConfig({ displayMode: 'auto' })
  assert.equal(autoConf.displayMode, 'auto')

  const compactConf = normalizeConfig({ displayMode: 'compact' })
  assert.equal(compactConf.displayMode, 'compact')

  const fullConf = normalizeConfig({ displayMode: 'full' })
  assert.equal(fullConf.displayMode, 'full')

  const fallbackConf = normalizeConfig({ displayMode: 'invalid_mode' })
  assert.equal(fallbackConf.displayMode, 'auto')
})

test('Issue #96: client CSS contains responsive media query and compact chip rules', () => {
  const clientPath = path.resolve('lib/client.js')
  const clientSrc = fs.readFileSync(clientPath, 'utf8')

  // Media query
  assert.ok(clientSrc.includes('@media (max-width: 768px)') || clientSrc.includes('@media (max-width:768px)'), 'Must include 768px media query')
  assert.ok(clientSrc.includes('.dcm-chip-compact'), 'Must define .dcm-chip-compact rule')

  // Parity in translations
  assert.ok(clientSrc.includes("'field.displayMode'"), 'Must include field.displayMode')
  assert.ok(clientSrc.includes("'mode.compact'"), 'Must include mode.compact')

  // Strictly no hardcoded hex or rgba
  const cssMatch = clientSrc.match(/const CSS = `([^`]+)`/)
  assert.ok(cssMatch, 'CSS block must be present')
  const css = cssMatch[1]
  assert.equal(/rgba\(/i.test(css), false, 'CSS must not contain hardcoded rgba()')
  assert.equal(/#[0-9a-fA-F]{3,6}\b/i.test(css), false, 'CSS must not contain hardcoded hex colors')
})