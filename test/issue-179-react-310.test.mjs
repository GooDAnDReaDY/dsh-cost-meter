import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')

test('Issue #179: CostMeter declares all React hooks strictly before any component returns', () => {
  const clientContent = readFileSync(join(rootDir, 'lib', 'client.js'), 'utf8')

  // Extract CostMeter function body
  const costMeterMatch = clientContent.match(/function CostMeter\(props\)\s*\{([\s\S]*?)\n    function apply/)?.[1]
  assert.ok(costMeterMatch, 'CostMeter function must be found in lib/client.js')

  const lines = costMeterMatch.split('\n')

  let firstReturnLine = -1
  const hookLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect hook invocations (React.use... or custom use...)
    if (line.match(/^const\s+.*?=\s*(?:React\.use|use[A-Z])/) || line.match(/^React\.use/)) {
      hookLines.push({ lineIndex: i + 1, text: line })
    }

    // Detect top-level component early returns (not inside nested callbacks)
    // In CostMeter, top-level lines have standard indentation (6 spaces)
    if (lines[i].match(/^\s{6}if\s*\(.*?\)\s*return(?:\s+null|\s+undefined|\s+h\()/)) {
      if (firstReturnLine === -1) {
        firstReturnLine = i + 1
      }
    }
  }

  assert.ok(firstReturnLine > 0, 'CostMeter must have top-level return statements')
  assert.ok(hookLines.length > 0, 'CostMeter must have hook declarations')

  // Verify EVERY hook line is strictly before firstReturnLine
  for (const hook of hookLines) {
    assert.ok(
      hook.lineIndex < firstReturnLine,
      `React hook at line ${hook.lineIndex} ("${hook.text}") must appear before the first early return at line ${firstReturnLine} to prevent React error #310`
    )
  }
})
