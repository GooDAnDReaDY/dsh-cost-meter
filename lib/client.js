// dsh-cost-meter — browser half.
//
// One chip in `conversation.session.header.utilities` (kind: list, scope:
// session). Session-scoped slots hand the component `useProjection`, so token
// counts come from dsh-token-meter's `tokenUsage` projection and move while a
// turn streams. The tariff schedule arrives from the host over GET
// /dsh-cost-meter/state — a base rate card plus UTC discount windows.
//
// The client owns only the clock: which window is active now, when it flips,
// and which variant of the day is the cheap one.
//
// Not ESM: the shell loads this file as a lazy CJS factory. No import, no JSX.
window.__ModuleLoader__.load({
  id: 'dsh-cost-meter',
  factory: (require) => {
    var module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const STATE_PATH = '/dsh-cost-meter/state'
    const DAY = 1440

    // ---------------------------------------------------------------- tariff

    function inWindow(minute, w) {
      return w.start <= w.end ? minute >= w.start && minute < w.end : minute >= w.start || minute < w.end
    }

    /** Rates in force at a given UTC minute: the last matching window, else base. */
    function ratesAt(schedule, minute) {
      const windows = (schedule && schedule.windows) || []
      for (const w of windows) if (inWindow(minute, w)) return w.rates
      return (schedule && schedule.base) || { cacheHit: 0, input: 0, cacheWrite: 0, output: 0 }
    }

    /** Minutes until the rate card changes, or null when it never does. */
    function minutesUntilChange(schedule, minute) {
      const now = ratesAt(schedule, minute)
      for (let step = 1; step <= DAY; step += 1) {
        const probe = ratesAt(schedule, (minute + step) % DAY)
        if (probe.output !== now.output || probe.input !== now.input) return step
      }
      return null
    }

    /**
     * The day's two extremes, by output rate: what the widget labels
     * "не-пик" and "пик". Equal extremes mean a flat tariff.
     */
    function extremes(schedule) {
      let low = null
      let high = null
      for (let minute = 0; minute < DAY; minute += 1) {
        const r = ratesAt(schedule, minute)
        if (!low || r.output < low.output) low = r
        if (!high || r.output > high.output) high = r
      }
      return { low: low || {}, high: high || {}, flat: !low || !high || low.output === high.output }
    }

    /** Session spend in USD for one rate card. */
    function spendUsd(usage, rates) {
      const u = usage || {}
      const perMillion =
        (Number(u.cacheReadTokens) || 0) * (rates.cacheHit || 0) +
        (Number(u.uncachedInputTokens) || 0) * (rates.input || 0) +
        (Number(u.cacheWriteTokens) || 0) * (rates.cacheWrite || 0) +
        (Number(u.outputTokens) || 0) * (rates.output || 0)
      return perMillion / 1e6
    }

    // --------------------------------------------------------------- format

    function rate(value) {
      if (!value) return '—'
      const text = value < 0.1 ? value.toFixed(3) : value.toFixed(2)
      return '$' + text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
    }

    function money(value, currency) {
      return currency + value.toFixed(Math.abs(value) >= 100 ? 0 : 2)
    }

    function tokens(value) {
      const n = Number(value) || 0
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
      return String(n)
    }

    function clock(minutes) {
      if (minutes === null) return null
      return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0')
    }

    function hhmm(minute) {
      return String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
    }

    /**
     * Render a UTC minute-of-day in the display zone. Built from a real Date so
     * the zone's current offset (and any DST) comes from Intl, not arithmetic.
     */
    function hhmmInZone(minute, zone, reference) {
      const d = new Date(Date.UTC(
        reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), 0, minute,
      ))
      try {
        return new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone,
        }).format(d)
      } catch {
        return hhmm(minute)
      }
    }

    /** Short zone label for the panel: "МСК" for Moscow, else the city part. */
    function zoneLabel(zone) {
      if (!zone) return 'UTC'
      if (zone === 'Europe/Moscow') return 'МСК'
      const city = zone.includes('/') ? zone.slice(zone.lastIndexOf('/') + 1) : zone
      return city.replace(/_/g, ' ')
    }

    function ago(timestamp) {
      if (!timestamp) return 'нет данных'
      const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
      if (minutes < 60) return minutes + ' мин назад'
      const hours = Math.round(minutes / 60)
      return hours < 48 ? hours + ' ч назад' : Math.round(hours / 24) + ' дн назад'
    }

    // ---------------------------------------------------------------- styles

    const C = {
      label: 'var(--dsw-alias-label-primary)',
      muted: 'var(--dsw-alias-label-tertiary)',
      line: 'var(--dsw-alias-border-l2)',
      panelBg: 'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base))',
      okFg: 'var(--dsw-alias-state-success-primary)',
      okBg: 'var(--dsw-alias-state-success-tertiary)',
      warnFg: 'var(--dsw-alias-state-warn-primary)',
      warnBg: 'var(--dsw-alias-state-warn-tertiary)',
    }

    const S = {
      chip: {
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px',
        borderRadius: 6, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12,
        fontVariantNumeric: 'tabular-nums', lineHeight: '22px',
      },
      panel: {
        position: 'absolute', top: 28, right: 0, zIndex: 40, width: 320, padding: '12px 14px',
        borderRadius: 10, border: '1px solid ' + C.line, background: C.panelBg,
        boxShadow: '0 10px 30px rgba(0,0,0,.28)', fontSize: 12, lineHeight: 1.5,
        color: C.label, textAlign: 'left', fontVariantNumeric: 'tabular-nums',
      },
      title: { fontWeight: 600, paddingBottom: 4 },
      note: { color: C.muted },
      hr: { height: 1, background: C.line, margin: '10px -14px' },
      grid: { display: 'grid', gridTemplateColumns: '1fr 60px 60px', columnGap: 6, alignItems: 'center' },
      gridFlat: { display: 'grid', gridTemplateColumns: '1fr 72px', columnGap: 6, alignItems: 'center' },
      grid3: { display: 'grid', gridTemplateColumns: '1fr 58px 72px', columnGap: 6, alignItems: 'center' },
      th: { color: C.muted, paddingBottom: 4 },
      thNum: { color: C.muted, paddingBottom: 4, textAlign: 'right' },
      td: { padding: '3px 0' },
      cellIdle: { textAlign: 'right', padding: '3px 6px', borderRadius: 4, color: C.muted },
      num: { textAlign: 'right', color: C.muted, padding: '3px 0' },
      cost: { textAlign: 'right', padding: '3px 0' },
      section: { color: C.muted, paddingBottom: 4 },
      total: { display: 'flex', justifyContent: 'space-between', fontWeight: 600 },
    }

    // ------------------------------------------------------------ component

    function CostMeter(props) {
      const useProjection = props.useProjection
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const [state, setState] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => new Date())
      const box = React.useRef(null)

      const load = React.useCallback(() => {
        fetch(STATE_PATH, { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setState(data) })
          .catch(() => {})
      }, [])

      React.useEffect(() => { load() }, [load])
      React.useEffect(() => { if (open) load() }, [open, load])
      React.useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 15000)
        return () => clearInterval(id)
      }, [])
      React.useEffect(() => {
        if (!open) return undefined
        const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
      }, [open])

      if (!state) return null

      const currency = state.currency || '$'
      const fx = Number(state.usdRate) || 1
      const schedule = state.schedule
      const hasUsage = usage !== undefined && usage !== null
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()

      // No rate card for this route: say so instead of showing a fake zero.
      if (!schedule) {
        return h('div', { ref: box, style: { position: 'relative' } }, [
          h('button', {
            key: 'chip', type: 'button',
            style: Object.assign({}, S.chip, { background: 'transparent', color: C.muted }),
            onClick: () => setOpen((v) => !v), title: 'Тариф неизвестен',
          }, 'тариф ?'),
          open ? h('div', { key: 'panel', style: S.panel }, [
            h('div', { key: 't', style: S.title },
              state.route ? state.route.provider + ' / ' + state.route.model : 'маршрут неизвестен'),
            h('div', { key: 'n', style: S.note },
              state.catalogError
                ? 'Каталог OpenRouter недоступен: ' + state.catalogError
                : 'Модель не найдена в каталоге OpenRouter. Задайте ставки вручную в настройках (prices) или сопоставьте модель через modelMap.'),
          ]) : null,
        ])
      }

      const active = ratesAt(schedule, minute)
      const { low, high, flat } = extremes(schedule)
      const cheapNow = !flat && active.output === low.output
      const left = clock(minutesUntilChange(schedule, minute))
      const total = spendUsd(usage, active) * fx

      const fg = cheapNow ? C.okFg : C.warnFg
      const bg = cheapNow ? C.okBg : C.warnBg
      const activeCell = { textAlign: 'right', padding: '3px 6px', borderRadius: 4, background: bg, color: fg, fontWeight: 600 }

      // Two tiers: cheap and full side by side, the active one filled.
      // One tier: a single plain column, no highlight to explain.
      const rateRow = (label, key) => flat
        ? [
            h('div', { key: label + '-l', style: S.td }, label),
            h('div', { key: label + '-v', style: S.cost }, rate(active[key])),
          ]
        : [
            h('div', { key: label + '-l', style: S.td }, label),
            h('div', { key: label + '-lo', style: cheapNow ? activeCell : S.cellIdle }, rate(low[key])),
            h('div', { key: label + '-hi', style: cheapNow ? S.cellIdle : activeCell }, rate(high[key])),
          ]

      // Breakdown row: tokens in the bucket and what they cost right now.
      const spentRow = (label, count, perMillionRate) => {
        const n = Number(count) || 0
        return [
          h('div', { key: label + '-l', style: S.td }, label),
          h('div', { key: label + '-n', style: S.num }, tokens(n)),
          h('div', { key: label + '-v', style: S.cost }, money((n / 1e6) * (perMillionRate || 0) * fx, currency)),
        ]
      }

      const showCacheWrite = Number(usage && usage.cacheWriteTokens) > 0
      const zone = state.displayTimeZone || 'Europe/Moscow'
      const zl = zoneLabel(zone)
      const windowText = (schedule.windows || [])
        .map((w) => hhmmInZone(w.start, zone, now) + '–' + hhmmInZone(w.end, zone, now))
        .join(', ')
      const nowLocal = hhmmInZone(minute, zone, now)

      return h('div', { ref: box, style: { position: 'relative' } }, [
        h('button', {
          key: 'chip', type: 'button',
          style: Object.assign({}, S.chip, { background: bg, color: fg }),
          onClick: () => setOpen((v) => !v),
          title: flat ? 'Единый тариф' : cheapNow ? 'Льготный тариф' : 'Полный тариф',
        }, [
          h('span', { key: 'sum' }, hasUsage ? '≈ ' + money(total, currency) : '—'),
          left ? h('span', { key: 'left', style: { opacity: 0.75 } }, left) : null,
        ]),

        open ? h('div', { key: 'panel', style: S.panel }, [
          h('div', { key: 'title', style: S.title },
            (state.route ? state.route.model : 'модель') +
            (flat ? '' : ' — сейчас ' + (cheapNow ? 'не-пик' : 'пик'))),

          h('div', { key: 'note', style: S.note },
            flat
              ? 'Единая ставка, от времени суток не зависит'
              : (cheapNow ? 'Действует льготная ставка' : 'Действует полная ставка') +
                (left ? ' · смена через ' + left : '')),

          flat
            ? null
            : h('div', { key: 'clock', style: S.note },
                'Пик: ' + windowText + ' ' + zl + ' · сейчас ' + nowLocal + ' ' + zl),

          h('div', { key: 'hr1', style: S.hr }),

          h('div', { key: 'rates', style: flat ? S.gridFlat : S.grid }, [
            h('div', { key: 'h0', style: S.th }, '1M токенов, $'),
            flat ? null : h('div', { key: 'h1', style: S.thNum }, 'не-пик'),
            h('div', { key: 'h2', style: S.thNum }, flat ? 'ставка' : 'пик'),
            rateRow('Вход (кэш-хит)', 'cacheHit'),
            rateRow('Вход (мимо кэша)', 'input'),
            showCacheWrite ? rateRow('Вход (запись в кэш)', 'cacheWrite') : null,
            rateRow('Выход', 'output'),
          ]),

          h('div', { key: 'hr2', style: S.hr }),

          h('div', { key: 'btitle', style: S.section }, 'Из чего сложилась сумма (по текущей ставке)'),
          h('div', { key: 'breakdown', style: S.grid3 }, [
            h('div', { key: 'b0', style: S.th }, 'токенов'),
            h('div', { key: 'b1', style: S.thNum }, ''),
            h('div', { key: 'b2', style: S.thNum }, currency),
            spentRow('Вход (кэш-хит)', usage && usage.cacheReadTokens, active.cacheHit),
            spentRow('Вход (мимо кэша)', usage && usage.uncachedInputTokens, active.input),
            showCacheWrite ? spentRow('Вход (запись в кэш)', usage && usage.cacheWriteTokens, active.cacheWrite) : null,
            spentRow('Выход', usage && usage.outputTokens, active.output),
          ]),

          h('div', { key: 'hr3', style: S.hr }),

          h('div', { key: 'total', style: S.total }, [
            h('span', { key: 'l' }, 'Сессия:'),
            h('span', { key: 'v' }, hasUsage ? '≈ ' + money(total, currency) : 'нет данных'),
          ]),

          h('div', { key: 'src', style: Object.assign({}, S.note, { paddingTop: 6 }) },
            state.source === 'openrouter'
              ? 'Цены: OpenRouter · ' + state.matchedId + ' · обновлены ' + ago(state.fetchedAt)
              : state.source === 'deepseek'
                ? 'Цены: официальный прайс DeepSeek'
                : 'Цены: заданы вручную в настройках'),

          hasUsage ? null : h('div', { key: 'nodata', style: S.note },
            'Провайдер ещё не сообщил usage для этой сессии.'),
        ]) : null,
      ])
    }

    function apply(ctx) {
      ctx.slots.inject('conversation.session.header.utilities', () =>
        ctx.slots.register(
          { name: 'conversation.session.header.utilities', id: 'dsh-cost-meter', order: 10 },
          CostMeter,
        ),
      )
    }

    module.exports = { apply, inject: ['slots'] }
    return module.exports
  },
})
