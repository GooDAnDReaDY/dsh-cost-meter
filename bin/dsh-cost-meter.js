#!/usr/bin/env node

// dsh-cost-meter CLI — inspect live session costs, model tariffs, and trajectory.

const args = process.argv.slice(2)
const isJson = args.includes('--json')
const isHelp = args.includes('--help') || args.includes('-h')
const isVersion = args.includes('--version') || args.includes('-v')

if (isVersion) {
  try {
    const pkg = JSON.parse(await import('node:fs').then((fs) => fs.promises.readFile(new URL('../package.json', import.meta.url), 'utf8')))
    console.log(`dsh-cost-meter v${pkg.version}`)
  } catch (_) {
    console.log('dsh-cost-meter')
  }
  process.exit(0)
}

if (isHelp) {
  console.log(`
Usage: dsh-cost-meter [options]

Options:
  --json             Output raw JSON state
  --port <port>      Specify DSH webServer port (default: 3005)
  --url <url>        Specify full state URL (default: http://127.0.0.1:3005/dsh-cost-meter/state)
  -v, --version      Show version
  -h, --help         Show this help message

Examples:
  dsh-cost-meter
  dsh-cost-meter --json
  dsh-cost-meter --port 3005
`)
  process.exit(0)
}

let port = 3005
const portIdx = args.indexOf('--port')
if (portIdx !== -1 && args[portIdx + 1]) {
  const p = parseInt(args[portIdx + 1], 10)
  if (Number.isInteger(p) && p > 0 && p <= 65535) {
    port = p
  } else {
    console.error(`Invalid port "${args[portIdx + 1]}". Must be between 1 and 65535.`)
    process.exit(1)
  }
}

let url = process.env.DSH_COST_METER_URL || `http://127.0.0.1:${port}/dsh-cost-meter/state`
const urlIdx = args.indexOf('--url')
if (urlIdx !== -1 && args[urlIdx + 1]) {
  url = args[urlIdx + 1]
}

try {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https protocols are supported')
  }
} catch (e) {
  console.error(`Invalid URL "${url}": ${e.message}`)
  process.exit(1)
}

async function main() {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    const state = await res.json()

    if (isJson) {
      console.log(JSON.stringify(state, null, 2))
      return
    }

    const curr = state.currency || '$'
    const fx = Number(state.usdRate) || 1
    const model = state.route?.model || 'unknown'
    const provider = state.route?.provider ? `(${state.route.provider})` : ''

    const turns = Array.isArray(state.turns) ? state.turns : []
    const totalCostUsd = turns.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || 0), 0)
    const totalCostLocal = totalCostUsd * fx

    const ctxCur = state.contextMetrics?.currentTokens || 0
    const ctxMax = state.contextMetrics?.contextLength || 128000
    const ctxSat = state.contextMetrics?.saturationPercent || 0
    const ctxRisk = state.contextMetrics?.riskLevel || 'low'

    const schedule = state.schedule || {}
    const base = schedule.base || {}
    const hitRate = base.cacheHit !== undefined ? `$${base.cacheHit}` : '—'
    const missRate = base.input !== undefined ? `$${base.input}` : '—'
    const outRate = base.output !== undefined ? `$${base.output}` : '—'

    const vel = state.velocity?.velocityPerMin || 0
    const velSev = state.velocity?.severity || 'normal'

    const fc = state.trajectoryForecast
    const fcProj = fc ? `≈${curr}${(fc.projectedCostUsd * fx).toFixed(4)} (${fc.trajectoryTrend})` : '—'

    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                    DSH COST METER CLI                       │
├─────────────────────────────────────────────────────────────┤
│ Session Cost:     ${curr}${totalCostLocal.toFixed(4)}${curr !== '$' ? ` ($${totalCostUsd.toFixed(4)})` : ''}
│ Active Model:     ${model} ${provider}
│ Context Window:   ${ctxCur.toLocaleString()} / ${ctxMax.toLocaleString()} tok (${ctxSat}%) [${ctxRisk}]
│ Tariff (/1M tok): Hit: ${hitRate} | Miss: ${missRate} | Out: ${outRate}
│ Cost Velocity:    ${curr}${(vel * fx).toFixed(4)}/min [${velSev}]
│ Trajectory Est:   ${fcProj}
└─────────────────────────────────────────────────────────────┘`)
  } catch (err) {
    if (isJson) {
      console.error(JSON.stringify({ error: err.message }))
    } else {
      console.error(`Error connecting to DSH Cost Meter at ${url}: ${err.message}`)
      console.error(`Ensure DSH is running and the webServer plugin is active.`)
    }
    process.exit(1)
  }
}

main()
