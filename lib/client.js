// dsh-cost-meter — browser half.
//
// Registers one chip in `conversation.session.header.utilities` (kind: list,
// scope: session). Session-scoped slots hand the component `useProjection`,
// so the token counts come straight from dsh-token-meter's `tokenUsage`
// projection and update while a turn streams. The rate card arrives from the
// host half over GET /dsh-cost-meter/state.
//
// Not ESM: the shell loads this file as a lazy CJS factory. No import, no JSX.
window.__ModuleLoader__.load({
  id: 'dsh-cost-meter',
  factory: (require) => {
    var module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const STATE_PATH = '/dsh-cost-meter/state'
    const EMPTY_USAGE = {
      uncachedInputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
    }

    // ---------------------------------------------------------------- tariff

    /** "HH:MM-HH:MM" -> minutes from midnight; undefined when malformed. */
    function parseWindow(spec) {
      const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(spec).trim())
      if (!m) return undefined
      return { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) }
    }

    /** Whether `minute` (UTC minutes from midnight) falls inside a window that may wrap. */
    function inWindow(minute, w) {
      return w.start <= w.end ? minute >= w.start && minute < w.end : minute >= w.start || minute < w.end
    }

    /**
     * Current tariff phase plus minutes until it flips. With no windows
     * configured everything is peak and nothing ever switches.
     */
    function tariffAt(date, windows) {
      const minute = date.getUTCHours() * 60 + date.getUTCMinutes()
      const parsed = windows.map(parseWindow).filter(Boolean)
      if (parsed.length === 0) return { peak: true, minutesLeft: null }
      const peak = parsed.some((w) => inWindow(minute, w))
      // Walk forward to the first minute whose phase differs. A day is 1440
      // minutes, so this terminates; null means the phase never changes.
      for (let step = 1; step <= 1440; step += 1) {
        const probe = (minute + step) % 1440
        if (parsed.some((w) => inWindow(probe, w)) !== peak) return { peak, minutesLeft: step }
      }
      return { peak, minutesLeft: null }
    }

    /** Rate card for a route, falling back to the "*" row, then to zeros. */
    function priceFor(prices, route) {
      const key = route ? route.provider + '/' + route.model : ''
      const row = (prices && (prices[key] || prices[route ? route.model : ''] || prices['*'])) || {}
      return {
        cacheHit: Number(row.cacheHit) || 0,
        input: Number(row.input) || 0,
        cacheWrite: Number(row.cacheWrite) || 0,
        output: Number(row.output) || 0,
      }
    }

    /** Session spend in USD at the given multiplier. Prices are per 1M tokens. */
    function spendUsd(usage, price, multiplier) {
      const u = usage || EMPTY_USAGE
      const perMillion =
        (Number(u.cacheReadTokens) || 0) * price.cacheHit +
        (Number(u.uncachedInputTokens) || 0) * price.input +
        (Number(u.cacheWriteTokens) || 0) * price.cacheWrite +
        (Number(u.outputTokens) || 0) * price.output
      return (perMillion / 1e6) * multiplier
    }

    // --------------------------------------------------------------- format

    function money(value, currency) {
      const abs = Math.abs(value)
      const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4
      return currency + value.toFixed(digits)
    }

    function countdown(minutesLeft) {
      if (minutesLeft === null) return null
      const hours = Math.floor(minutesLeft / 60)
      return hours + ':' + String(minutesLeft % 60).padStart(2, '0')
    }

    function utcClock(date) {
      return (
        String(date.getUTCHours()).padStart(2, '0') + ':' + String(date.getUTCMinutes()).padStart(2, '0')
      )
    }

    // ------------------------------------------------------------ component

    const styles = {
      chip: {
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 8px',
        borderRadius: 6, border: '1px solid var(--dsw-alias-border-secondary, #0002)',
        background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: 12,
        color: 'var(--dsw-alias-label-secondary, inherit)',
      },
      dot: { width: 6, height: 6, borderRadius: '50%' },
      panel: {
        position: 'absolute', top: 30, right: 0, zIndex: 30, minWidth: 260, padding: 12,
        borderRadius: 10, border: '1px solid var(--dsw-alias-border-secondary, #0002)',
        background: 'var(--dsw-alias-bg-elevated, var(--dsw-alias-bg-primary, #fff))',
        boxShadow: '0 8px 24px #0002', fontSize: 12,
        color: 'var(--dsw-alias-label-primary, inherit)',
      },
      muted: { color: 'var(--dsw-alias-label-tertiary, #888)' },
      row: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0' },
      head: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontWeight: 600 },
      active: { fontWeight: 600 },
    }

    function CostMeter(props) {
      const useProjection = props.useProjection
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const [state, setState] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => new Date())

      // The rate card changes only when the user edits settings; refetch when
      // the panel opens rather than polling.
      const load = React.useCallback(() => {
        fetch(STATE_PATH, { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setState(data) })
          .catch(() => {})
      }, [])

      React.useEffect(() => { load() }, [load])
      React.useEffect(() => { if (open) load() }, [open, load])

      // One tick per 15s is enough for a minute-resolution countdown.
      React.useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 15000)
        return () => clearInterval(id)
      }, [])

      if (!state) return null

      const windows = state.peakWindowsUtc || []
      const tariff = tariffAt(now, windows)
      const multiplier = tariff.peak ? 1 : Number(state.offPeakMultiplier) || 1
      const price = priceFor(state.prices, state.route)
      const rate = Number(state.usdRate) || 1
      const currency = state.currency || '$'
      const total = spendUsd(usage, price, multiplier) * rate
      const left = countdown(tariff.minutesLeft)
      const hasUsage = usage !== undefined && usage !== null

      const rateRow = (label, perMillion) =>
        h('div', { style: styles.row, key: label }, [
          h('span', { key: 'l', style: styles.muted }, label),
          h('span', { key: 'off', style: tariff.peak ? styles.muted : styles.active },
            money((perMillion * (Number(state.offPeakMultiplier) || 1)) * rate, currency)),
          h('span', { key: 'peak', style: tariff.peak ? styles.active : styles.muted },
            money(perMillion * rate, currency)),
        ])

      return h('div', { style: { position: 'relative' } }, [
        h('button', {
          key: 'chip',
          type: 'button',
          style: styles.chip,
          onClick: () => setOpen((v) => !v),
          title: tariff.peak ? 'Peak tariff' : 'Off-peak tariff',
        }, [
          h('span', {
            key: 'dot',
            style: Object.assign({}, styles.dot, { background: tariff.peak ? '#e0a030' : '#2ea44f' }),
          }),
          h('span', { key: 'sum' }, (hasUsage ? '≈ ' : '') + money(total, currency)),
          left ? h('span', { key: 'left', style: styles.muted }, left) : null,
        ]),
        open ? h('div', { key: 'panel', style: styles.panel }, [
          h('div', { key: 'title', style: { fontWeight: 600, paddingBottom: 6 } },
            state.route ? state.route.provider + ' / ' + state.route.model : 'default route unknown'),
          h('div', { key: 'phase', style: styles.muted },
            (tariff.peak ? 'Peak' : 'Off-peak ×' + (Number(state.offPeakMultiplier) || 1)) +
            (left ? ' · switches in ' + left : '') + ' · now ' + utcClock(now) + ' UTC'),
          windows.length
            ? h('div', { key: 'win', style: Object.assign({}, styles.muted, { paddingBottom: 6 }) },
                'Peak: ' + windows.join(', ') + ' UTC')
            : null,
          h('div', { key: 'head', style: styles.head }, [
            h('span', { key: 'l' }, '1M tokens'),
            h('span', { key: 'o' }, 'off-peak'),
            h('span', { key: 'p' }, 'peak'),
          ]),
          rateRow('Input (cache hit)', price.cacheHit),
          rateRow('Input (miss)', price.input),
          price.cacheWrite ? rateRow('Input (cache write)', price.cacheWrite) : null,
          rateRow('Output', price.output),
          h('div', { key: 'total', style: Object.assign({}, styles.row, { paddingTop: 8, fontWeight: 600 }) }, [
            h('span', { key: 'l' }, 'Session'),
            h('span', { key: 'v' }, (hasUsage ? '≈ ' : '') + money(total, currency)),
          ]),
          hasUsage ? null : h('div', { key: 'nodata', style: styles.muted },
            'No provider usage reported yet for this session.'),
        ]) : null,
      ])
    }

    function apply(ctx) {
      ctx.slots.inject('conversation.session.header.utilities', () =>
        ctx.slots.register(
          {
            name: 'conversation.session.header.utilities',
            id: 'dsh-cost-meter',
            order: 10,
          },
          CostMeter,
        ),
      )
    }

    module.exports = { apply, inject: ['slots'] }
    return module.exports
  },
})
