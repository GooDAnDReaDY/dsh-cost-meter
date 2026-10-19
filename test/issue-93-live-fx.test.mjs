import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeCurrencyCode,
  parseCbrRates,
  parseOpenErRates,
  getFxRate,
  normalizeConfig,
  Config,
} from '../lib/index.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('Issue #93: normalizeCurrencyCode maps common symbols and aliases', () => {
  assert.equal(normalizeCurrencyCode('$'), 'USD')
  assert.equal(normalizeCurrencyCode('usd'), 'USD')
  assert.equal(normalizeCurrencyCode('₽'), 'RUB')
  assert.equal(normalizeCurrencyCode('rub'), 'RUB')
  assert.equal(normalizeCurrencyCode('Руб'), 'RUB')
  assert.equal(normalizeCurrencyCode('€'), 'EUR')
  assert.equal(normalizeCurrencyCode('eur'), 'EUR')
  assert.equal(normalizeCurrencyCode('¥'), 'CNY')
  assert.equal(normalizeCurrencyCode('cny'), 'CNY')
  assert.equal(normalizeCurrencyCode('rmb'), 'CNY')
  assert.equal(normalizeCurrencyCode('gbp'), 'GBP')
})

test('Issue #93: parseCbrRates extracts USD rate and computes cross-rates accurately', () => {
  assert.equal(parseCbrRates(null), null)
  assert.equal(parseCbrRates({}), null)
  assert.equal(parseCbrRates({ Valute: { USD: { Value: 0 } } }), null)

  const mockCbr = {
    Valute: {
      USD: { Value: 83.6177 },
      EUR: { Value: 93.7187 },
      CNY: { Value: 12.4950 },
    },
  }

  const rates = parseCbrRates(mockCbr)
  assert.ok(rates, 'Rates parsed successfully')
  assert.equal(rates.RUB, 83.618)
  assert.equal(rates.EUR, Math.round((83.6177 / 93.7187) * 10000) / 10000)
  assert.equal(rates.CNY, Math.round((83.6177 / 12.4950) * 1000) / 1000)
})

test('Issue #93: parseOpenErRates extracts valid currency rates', () => {
  assert.equal(parseOpenErRates(null), null)
  assert.equal(parseOpenErRates({}), null)

  const mockEr = {
    result: 'success',
    rates: {
      RUB: 83.208,
      EUR: 0.8908,
      CNY: 6.692,
    },
  }

  const rates = parseOpenErRates(mockEr)
  assert.ok(rates, 'Rates parsed successfully')
  assert.equal(rates.RUB, 83.208)
  assert.equal(rates.EUR, 0.8908)
  assert.equal(rates.CNY, 6.692)
})

test('Issue #93: getFxRate respects currency rules, manual override and fallback', () => {
  // USD is always 1
  assert.equal(getFxRate('$', 100, true), 1)
  assert.equal(getFxRate('USD', 50, true), 1)

  // autoFx: false preserves manual rate
  assert.equal(getFxRate('₽', 75, false), 75)
  assert.equal(getFxRate('€', 0.85, false), 0.85)

  // autoFx: true returns cached live rate
  const rubRate = getFxRate('₽', 75, true)
  assert.ok(rubRate > 50, `RUB rate should be positive live rate, got ${rubRate}`)

  // Unknown currency falls back to valid manual rate or 1
  assert.equal(getFxRate('XYZ', 42, true), 42)
  assert.equal(getFxRate('XYZ', -10, true), 1)
})

test('Issue #93: Config schema includes autoFxRate and normalizeConfig respects it', () => {
  // Check Schemastery Config schema
  assert.ok(Config, 'Config schema exported')

  // autoFxRate: true overrides manual rate with live rate for RUB
  const cfgAuto = normalizeConfig({
    currency: '₽',
    usdRate: 70,
    autoFxRate: true,
  })
  assert.equal(cfgAuto.currency, '₽')
  assert.equal(cfgAuto.autoFxRate, true)
  assert.ok(cfgAuto.usdRate > 70, 'autoFxRate should resolve live CBR rate > 70')

  // autoFxRate: false preserves configured manual usdRate
  const cfgManual = normalizeConfig({
    currency: '₽',
    usdRate: 70,
    autoFxRate: false,
  })
  assert.equal(cfgManual.currency, '₽')
  assert.equal(cfgManual.autoFxRate, false)
  assert.equal(cfgManual.usdRate, 70)
})

test('Issue #74 & #93: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexContent = fs.readFileSync(path.join(root, 'lib', 'index.js'), 'utf8')
  const lines = indexContent.split('\n').length
  assert.ok(lines < 320, `lib/index.js must be strictly < 320 LOC, got ${lines}`)
})

