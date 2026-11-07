import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { captureDiagnosticSnapshot } from '../lib/analytics.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('Issue #140: bin/dsh-cost-meter.js exists and responds to --help and --version', () => {
  const binPath = path.join(__dirname, '..', 'bin', 'dsh-cost-meter.js')
  assert.ok(fs.existsSync(binPath), 'bin/dsh-cost-meter.js should exist')

  const helpRes = spawnSync(process.execPath, [binPath, '--help'], { encoding: 'utf8' })
  assert.equal(helpRes.status, 0)
  assert.ok(helpRes.stdout.includes('Usage: dsh-cost-meter'))
  assert.ok(helpRes.stdout.includes('--json'))

  const verRes = spawnSync(process.execPath, [binPath, '--version'], { encoding: 'utf8' })
  assert.equal(verRes.status, 0)
  assert.ok(verRes.stdout.includes('dsh-cost-meter'))
})

test('Issue #140: package.json registers bin executable and files entry', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  assert.equal(pkg.bin?.['dsh-cost-meter'], 'bin/dsh-cost-meter.js')
  assert.ok(pkg.files.includes('bin/'))
})

test('Issue #159: captureDiagnosticSnapshot records anomaly telemetry and summary', () => {
  const turns = [
    { turn: 1, step: 1, costDeltaUsd: 0.002, tokens: 2000 },
    { turn: 2, step: 2, costDeltaUsd: 0.45, tokens: 18000, uncachedInputTokens: 17000, outputTokens: 1000 },
  ]
  const anomalyInfo = { velocityPerMin: 1.25, severity: 'critical' }
  const route = { model: 'deepseek-chat', provider: 'deepseek' }

  const snap = captureDiagnosticSnapshot(turns, anomalyInfo, route)

  assert.ok(snap.id.startsWith('snap-'))
  assert.equal(snap.turn, 2)
  assert.equal(snap.step, 2)
  assert.equal(snap.velocityPerMin, 1.25)
  assert.equal(snap.severity, 'critical')
  assert.equal(snap.model, 'deepseek-chat')
  assert.equal(snap.largestStepCostUsd, 0.45)
  assert.ok(snap.summary.includes('Turn #2'))
  assert.ok(snap.summary.includes('$1.2500/min'))
})

test('Issue #159: captureDiagnosticSnapshot handles empty turns safely', () => {
  const snap = captureDiagnosticSnapshot([], { velocityPerMin: 0.2 }, { model: 'gpt-4o' })
  assert.ok(snap.id)
  assert.equal(snap.turn, 0)
  assert.equal(snap.model, 'gpt-4o')
})

test('Issue #140 & #159: lib/index.js maintains strict file size under 320 LOC', () => {
  const indexPath = path.join(__dirname, '..', 'lib', 'index.js')
  const content = fs.readFileSync(indexPath, 'utf8')
  const loc = content.split('\n').length
  assert.ok(loc <= 320, `lib/index.js has ${loc} lines, which exceeds the strict limit of 320 LOC`)
})

test('Issue #159: client.js exports captureDiagnosticSnapshot and defines dcm-snapshot-box', () => {
  const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
  const content = fs.readFileSync(clientPath, 'utf8')
  assert.ok(content.includes('captureDiagnosticSnapshot,'))
  assert.ok(content.includes('dcm-snapshot-box'))
})
