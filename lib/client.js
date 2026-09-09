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
  id: '@goodandready/dsh-cost-meter',
  factory: (require) => {
    var module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const STATE_PATH = '/dsh-cost-meter/state'
    const DAY = 1440
    const NS = 'dsh-cost-meter'

    const en = {
      title: 'Cost Meter',
      subtitle: 'Session cost in header, token rates, and per-model breakdown',
      chipUnknown: 'tariff ?',
      chipRate: 'rate',
      offPeak: 'off-peak',
      peak: 'peak',
      flat: 'flat',
      modelsBreakdown: 'Model Breakdown',
      sessionTokens: 'Session Tokens',
      totalCost: 'Total Cost',
      noPriceSpecified: 'rate not specified',
      noUsageYet: 'Provider has not reported usage for this session yet.',
      routeUnknown: 'route unknown',
      catalogUnavailable: 'OpenRouter catalog unavailable: ',
      modelNotFound: 'Model not found in OpenRouter catalog. Set manual prices in settings (prices) or map model via modelMap.',
      'settings.loading': 'Loading settings…',
      'settings.unavailable': 'Settings unavailable (namespace is not registered yet).',
      'settings.save': 'Save',
      'settings.saving': 'Saving…',
      'settings.saved': 'Saved',
      'settings.saveFailed': 'Failed to save settings: ',
      'field.currency': 'Currency symbol',
      'field.usdRate': 'USD exchange rate',
      'field.displayTimeZone': 'Display timezone',
      'hint.currency': 'Currency symbol shown in the widget (e.g. $, ₽, €).',
      'hint.usdRate': 'Exchange rate: units of currency per 1 USD (e.g. 80 for ₽).',
      'hint.displayTimeZone': 'IANA timezone used for tariff peak/off-peak schedule.',
    }

    const ru = {
      title: 'Счётчик расходов (Cost Meter)',
      subtitle: 'Стоимость сессии в шапке, тарифы токенов и детализация по моделям',
      chipUnknown: 'тариф ?',
      chipRate: 'тариф',
      offPeak: 'не-пик',
      peak: 'пик',
      flat: 'единый',
      modelsBreakdown: 'Расход по моделям',
      sessionTokens: 'Токены сессии',
      totalCost: 'Итого за сессию',
      noPriceSpecified: 'не указана стоимость',
      noUsageYet: 'Провайдер ещё не сообщил usage для этой сессии.',
      routeUnknown: 'маршрут неизвестен',
      catalogUnavailable: 'Каталог OpenRouter недоступен: ',
      modelNotFound: 'Модель не найдена в каталоге OpenRouter. Задайте ставки вручную в настройках (prices) или сопоставьте модель через modelMap.',
      'settings.loading': 'Загрузка настроек…',
      'settings.unavailable': 'Настройки недоступны (пространство ещё не зарегистрировано).',
      'settings.save': 'Сохранить',
      'settings.saving': 'Сохранение…',
      'settings.saved': 'Сохранено',
      'settings.saveFailed': 'Не удалось сохранить настройки: ',
      'field.currency': 'Символ валюты',
      'field.usdRate': 'Курс валюты к USD',
      'field.displayTimeZone': 'Часовой пояс отображения',
      'hint.currency': 'Символ валюты, отображаемый в виджете (например, ₽, $, €).',
      'hint.usdRate': 'Сколько единиц валюты в 1 долларе США (например, 80 для ₽).',
      'hint.displayTimeZone': 'IANA таймзона для расчёта часов пика и не-пика (например, Europe/Moscow).',
    }

    let ChevronIcon = null
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
      ChevronIcon = primitives && primitives.IconChevronDownOutline14
    } catch {
      ChevronIcon = null
    }

    function Chevron(props) {
      if (ChevronIcon) {
        return React.createElement(ChevronIcon, {
          className: 'dcm-chev' + (props.open ? ' dcm-chev-open' : ''),
          style: {
            marginLeft: 'auto', flex: 'none', color: 'var(--dsw-alias-label-tertiary)',
            transition: 'transform .16s', transform: props.open ? 'rotate(180deg)' : 'none',
          },
        })
      }
      return React.createElement('svg', {
        className: 'dcm-chev' + (props.open ? ' dcm-chev-open' : ''),
        style: {
          marginLeft: 'auto', flex: 'none', color: 'var(--dsw-alias-label-tertiary)',
          transition: 'transform .16s', transform: props.open ? 'rotate(180deg)' : 'none',
        },
        width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': 'true',
      }, React.createElement('path', {
        d: 'M3.5 5.25L7 8.75L10.5 5.25', stroke: 'currentColor', strokeWidth: 1.5,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      }))
    }

    const cardCss = '.dcm-card { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); border-radius:12px; list-style:none } ' +
      '.dcm-head { appearance:none; width:100%; font:inherit; color:inherit; text-align:left; cursor:pointer; background:0 0; border:0; border-radius:12px; display:flex; align-items:center; gap:12px; padding:14px 16px } ' +
      '.dcm-title { color:var(--dsw-alias-label-primary); font-size:15px; font-weight:600; line-height:1.4 } ' +
      '.dcm-sub { color:var(--dsw-alias-label-secondary); font-size:13px } ' +
      '.dcm-body { border-top:1px solid var(--dsw-alias-border-l2); margin:0 16px; padding-bottom:8px } ' +
      '.dcm-field { display:flex; flex-direction:column; gap:6px; padding:12px 0 } ' +
      '.dcm-label { color:var(--dsw-alias-label-primary); font-size:13px; font-weight:500 } ' +
      '.dcm-hint { color:var(--dsw-alias-label-secondary); font-size:12px } ' +
      '.dcm-input { height:34px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 12px; font-size:13px } ' +
      '.dcm-foot { border-top:1px solid var(--dsw-alias-border-l2); display:flex; justify-content:flex-end; align-items:center; gap:8px; padding:12px 0 4px } ' +
      '.dcm-save { appearance:none; font:inherit; cursor:pointer; border:1px solid transparent; border-radius:8px; padding:5px 14px; font-size:13px; background:var(--dsw-alias-label-primary); color:var(--dsw-alias-bg-layer-3) } ' +
      '.dcm-msg-ok { color:var(--dsw-alias-state-success-primary); font-size:12px } ' +
      '.dcm-msg-err { color:var(--dsw-alias-state-danger-primary, #e53935); font-size:12px }';

    function ensureCardStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-cost-meter-card-styles')) return
      const el = document.createElement('style')
      el.id = 'dsh-cost-meter-card-styles'
      el.dataset.dshPlugin = 'dsh-cost-meter'
      el.textContent = cardCss
      document.head.appendChild(el)
    }

    function makeT(dict, fallback) {
      return function t(key, vars) {
        let val = (dict && dict[key]) || (fallback && fallback[key]) || key
        if (vars && typeof val === 'string') {
          for (const k of Object.keys(vars)) {
            val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]))
          }
        }
        return val
      }
    }

    function useActiveLocale(ctx) {
      return React.useSyncExternalStore(
        React.useMemo(() => (cb) => (ctx && ctx.locale ? ctx.locale.subscribe(cb) : () => {}), [ctx]),
        React.useCallback(() => (ctx && ctx.locale && ctx.locale.getSnapshot ? ctx.locale.getSnapshot().active : 'ru'), [ctx]),
        React.useCallback(() => 'ru', []),
      )
    }

    function CostMeterCard(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'ru' ? ru : en, en)
      const [open, setOpen] = React.useState(false)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [err, setErr] = React.useState('')
      const [saved, setSaved] = React.useState(false)

      const scope = React.useMemo(
        () => (ctx && ctx.settingsScope ? ctx.settingsScope.bind({ namespace: NS }) : undefined),
        [ctx],
      )

      const snapshot = React.useSyncExternalStore(
        React.useMemo(() => (cb) => (scope ? scope.subscribe(cb) : () => {}), [scope]),
        React.useCallback(() => (scope ? scope.getSnapshot() : { status: 'loading' }), [scope]),
        React.useCallback(() => ({ status: 'loading' }), []),
      )

      React.useEffect(() => { ensureCardStyles() }, [])

      const status = (snapshot && snapshot.status) || 'loading'
      const stored = (snapshot && snapshot.value) || {}

      React.useEffect(() => {
        if (status === 'ready' && draft === null) {
          setDraft({
            currency: stored.currency !== undefined ? String(stored.currency) : '$',
            usdRate: stored.usdRate !== undefined ? String(stored.usdRate) : '1',
            displayTimeZone: stored.displayTimeZone !== undefined ? String(stored.displayTimeZone) : 'Europe/Moscow',
          })
        }
      }, [status, stored, draft])

      const save = async () => {
        if (!scope || !draft) return
        setSaving(true); setErr(''); setSaved(false)
        const broken = []
        try {
          await scope.set('currency', String(draft.currency || '$'))
        } catch (e) { broken.push('currency: ' + (e && e.message || String(e))) }

        const rateNum = Number(String(draft.usdRate).trim())
        if (!Number.isFinite(rateNum) || rateNum <= 0) {
          broken.push('usdRate: must be a positive number')
        } else {
          try {
            await scope.set('usdRate', rateNum)
          } catch (e) { broken.push('usdRate: ' + (e && e.message || String(e))) }
        }

        const tzVal = String(draft.displayTimeZone || 'Europe/Moscow').trim()
        if (!isValidTimeZone(tzVal)) {
          broken.push('displayTimeZone: invalid IANA time zone')
        } else {
          try {
            await scope.set('displayTimeZone', tzVal)
          } catch (e) { broken.push('displayTimeZone: ' + (e && e.message || String(e))) }
        }

        setSaving(false)
        if (broken.length) {
          setErr(t('settings.saveFailed') + broken.join('; '))
          return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }

      return React.createElement('li', { className: 'dcm-card' },
        React.createElement('button', {
          type: 'button', className: 'dcm-head', 'aria-expanded': open,
          onClick: () => setOpen((v) => !v),
        },
          React.createElement('span', { style: { display: 'flex', flexDirection: 'column' } },
            React.createElement('span', { className: 'dcm-title' }, t('title')),
            React.createElement('span', { className: 'dcm-sub' }, t('subtitle')),
          ),
          React.createElement(Chevron, { open }),
        ),
        open ? React.createElement('div', { className: 'dcm-body' },
          status === 'loading'
            ? React.createElement('p', { className: 'dcm-hint', style: { padding: '12px 0' } }, t('settings.loading'))
            : status !== 'ready'
              ? React.createElement('p', { className: 'dcm-msg-err', style: { padding: '12px 0' } }, t('settings.unavailable'))
              : React.createElement('div', null,
                  React.createElement('div', { className: 'dcm-field' },
                    React.createElement('label', { className: 'dcm-label' }, t('field.currency')),
                    React.createElement('input', {
                      className: 'dcm-input',
                      value: (draft && draft.currency) !== undefined ? draft.currency : '',
                      onChange: (e) => setDraft({ ...draft, currency: e.target.value }),
                    }),
                    React.createElement('span', { className: 'dcm-hint' }, t('hint.currency')),
                  ),
                  React.createElement('div', { className: 'dcm-field' },
                    React.createElement('label', { className: 'dcm-label' }, t('field.usdRate')),
                    React.createElement('input', {
                      className: 'dcm-input',
                      type: 'number',
                      step: 'any',
                      value: (draft && draft.usdRate) !== undefined ? draft.usdRate : '',
                      onChange: (e) => setDraft({ ...draft, usdRate: e.target.value }),
                    }),
                    React.createElement('span', { className: 'dcm-hint' }, t('hint.usdRate')),
                  ),
                  React.createElement('div', { className: 'dcm-field' },
                    React.createElement('label', { className: 'dcm-label' }, t('field.displayTimeZone')),
                    React.createElement('input', {
                      className: 'dcm-input',
                      value: (draft && draft.displayTimeZone) !== undefined ? draft.displayTimeZone : '',
                      onChange: (e) => setDraft({ ...draft, displayTimeZone: e.target.value }),
                    }),
                    React.createElement('span', { className: 'dcm-hint' }, t('hint.displayTimeZone')),
                  ),
                  err ? React.createElement('div', { className: 'dcm-msg-err', style: { padding: '4px 0' } }, err) : null,
                  saved ? React.createElement('div', { className: 'dcm-msg-ok', style: { padding: '4px 0' } }, t('settings.saved')) : null,
                  React.createElement('div', { className: 'dcm-foot' },
                    React.createElement('button', {
                      type: 'button',
                      className: 'dcm-save',
                      disabled: saving,
                      onClick: save,
                    }, saving ? t('settings.saving') : t('settings.save')),
                  ),
                )
        ) : null,
      )
    }


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

    /** Total tokens across every half-hour slot of one model. */
    function sumSlots(slots) {
      const total = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
      for (const key of Object.keys(slots || {})) {
        const b = slots[key] || {}
        for (const field of Object.keys(total)) total[field] += Number(b[field]) || 0
      }
      return total
    }

    /**
     * Cost of one model, each half-hour slot charged at the rate that applied
     * in that slot. Slot 14 is 07:00–07:30 UTC, so its midpoint (07:15) picks
     * the window without landing on a boundary.
     */
    function spendBySlots(slots, schedule) {
      let usd = 0
      for (const key of Object.keys(slots || {})) {
        const minute = (Number(key) * 30 + 15) % 1440
        usd += spendUsd(slots[key], ratesAt(schedule, minute))
      }
      return usd
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

    function isValidTimeZone(tz) {
      if (!tz || typeof tz !== 'string') return false
      try {
        new Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch {
        return false
      }
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
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'ru' ? ru : en, en)
      const useProjection = props.useProjection
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const byModel = useProjection ? useProjection('costByModel') : undefined
      const [state, setState] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => new Date())
      const box = React.useRef(null)
      const settingsScope = ctx.settingsScope || (ctx.services && ctx.services.settingsScope)
      const settingsSnap = React.useSyncExternalStore
        ? React.useSyncExternalStore(
            (cb) => (settingsScope && typeof settingsScope.subscribe === 'function' ? settingsScope.subscribe(cb) : () => {}),
            () => (settingsScope && typeof settingsScope.get === 'function' ? settingsScope.get(NS) : null),
            () => null,
          )
        : null

      // Every model this session actually billed, so each part is priced on its
      // own tariff instead of the current model's. Usage arrives split into
      // half-hour slots of the UTC day — spend is charged at the rate that was
      // in force then, so a tariff switch never reprices what is already spent.
      const used = (byModel && Array.isArray(byModel.models) ? byModel.models : [])
        .map((m) => ({ ...m, usage: sumSlots(m && m.slots) }))
        .filter((m) => m.usage.uncachedInputTokens || m.usage.outputTokens ||
          m.usage.cacheReadTokens || m.usage.cacheWriteTokens)
      const usedKeys = used.map((m) => m.provider + '/' + m.model).sort().join(',')

      const reqSeq = React.useRef(0)

      const load = React.useCallback((keys) => {
        const seq = ++reqSeq.current
        const query = keys ? '?models=' + encodeURIComponent(keys) : ''
        fetch(STATE_PATH + query, { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && seq === reqSeq.current) setState(data)
          })
          .catch(() => {})
      }, [])
      // Refetch when the set of billed models changes — a new model needs its
      // own tariff before its tokens can be priced.
      React.useEffect(() => { load(usedKeys) }, [load, usedKeys])
      React.useEffect(() => { if (open) load(usedKeys) }, [open, load, usedKeys])
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

      const stored = (settingsSnap && settingsSnap.value) || {}
      const currency = stored.currency !== undefined ? String(stored.currency) : (state.currency || '$')
      const fx = stored.usdRate !== undefined && !isNaN(Number(stored.usdRate)) ? Number(stored.usdRate) : (Number(state.usdRate) || 1)
      const schedule = state.schedule
      const hasUsage = usage !== undefined && usage !== null
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()

      // No rate card for this route: say so instead of showing a fake zero.
      if (!schedule) {
        return h('div', { ref: box, style: { position: 'relative' } }, [
          h('button', {
            key: 'chip', type: 'button',
            style: Object.assign({}, S.chip, { background: 'transparent', color: C.muted }),
            onClick: () => setOpen((v) => !v), title: t('chipUnknown'),
          }, 'тариф ?'),
          open ? h('div', { key: 'panel', style: S.panel }, [
            h('div', { key: 't', style: S.title },
              state.route ? state.route.provider + ' / ' + state.route.model : t('routeUnknown')),
            h('div', { key: 'n', style: S.note },
              state.catalogError
                ? t('catalogUnavailable') + state.catalogError
                : 'Модель не найдена в каталоге OpenRouter. Задайте ставки вручную в настройках (prices) или сопоставьте модель через modelMap.'),
          ]) : null,
        ])
      }

      const active = ratesAt(schedule, minute)
      const { low, high, flat } = extremes(schedule)
      const cheapNow = !flat && active.output === low.output
      const left = clock(minutesUntilChange(schedule, minute))

      // Per-model spend: each model on its own tariff, at that tariff's rate
      // for the current moment. Falls back to the session-wide totals when the
      // per-model projection is unavailable (older harness, headless).
      const schedules = state.schedules || {}
      const perModel = used.map((m) => {
        const key = m.provider + '/' + m.model
        const own = schedules[key]
        const ownSchedule = own && own.schedule
        return {
          key,
          model: m.model,
          usage: m.usage,
          known: Boolean(ownSchedule),
          cost: ownSchedule ? spendBySlots(m.slots, ownSchedule) * fx : 0,
        }
      })
      const multiModel = perModel.length > 1
      const total = perModel.length
        ? perModel.reduce((sum, m) => sum + m.cost, 0)
        : spendUsd(usage, active) * fx
      const unpriced = perModel.filter((m) => !m.known)

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

      // Breakdown row for the single-model case: tokens in the bucket and what
      // they actually accrued, slot by slot, at the rate of each slot.
      const soleSlots = perModel.length === 1 ? used[0].slots : null
      const spentRow = (label, bucketField, rateField) => {
        const n = Number(usage && usage[bucketField]) || 0
        let usd = 0
        if (soleSlots) {
          for (const key of Object.keys(soleSlots)) {
            const rates = ratesAt(schedule, (Number(key) * 30 + 15) % 1440)
            usd += ((Number(soleSlots[key][bucketField]) || 0) / 1e6) * (rates[rateField] || 0)
          }
        } else {
          usd = (n / 1e6) * (active[rateField] || 0)
        }
        return [
          h('div', { key: label + '-l', style: S.td }, label),
          h('div', { key: label + '-n', style: S.num }, tokens(n)),
          h('div', { key: label + '-v', style: S.cost }, money(usd * fx, currency)),
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
            (flat ? '' : ' — сейчас ' + (cheapNow ? 'не-пик' : t('peak')))),

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

          multiModel
            ? null
            : [
                h('div', { key: 'btitle', style: S.section }, 'Токены сессии'),
                h('div', { key: 'breakdown', style: S.grid3 }, [
                  h('div', { key: 'b0', style: S.th }, 'токенов'),
                  h('div', { key: 'b1', style: S.thNum }, ''),
                  h('div', { key: 'b2', style: S.thNum }, currency),
                  spentRow('Вход (кэш-хит)', 'cacheReadTokens', 'cacheHit'),
                  spentRow('Вход (мимо кэша)', 'uncachedInputTokens', 'input'),
                  showCacheWrite ? spentRow('Вход (запись в кэш)', 'cacheWriteTokens', 'cacheWrite') : null,
                  spentRow('Выход', 'outputTokens', 'output'),
                ]),
                h('div', { key: 'hr-models', style: S.hr }),
              ],

          h('div', { key: 'mtitle', style: S.section }, 'Расход по моделям'),
          h(
            'div',
            { key: 'models-list', style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            (perModel.length
              ? perModel
              : (state.route ? [{ key: state.route.provider + '/' + state.route.model, model: state.route.model, known: Boolean(schedule), cost: 0 }] : [])
            ).map((m) =>
              h(
                'div',
                {
                  key: m.key,
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '2px 0' },
                },
                [
                  h(
                    'span',
                    {
                      key: 'name',
                      title: m.key,
                      style: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: m.known ? 200 : 130,
                      },
                    },
                    m.model,
                  ),
                  h(
                    'span',
                    {
                      key: 'val',
                      style: {
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        color: m.known ? C.label : C.muted,
                      },
                    },
                    m.known ? (hasUsage ? money(m.cost, currency) : '—') : 'не указана стоимость',
                  ),
                ],
              ),
            ),
          ),

          h('div', { key: 'hr3', style: S.hr }),

          h('div', { key: 'total', style: S.total }, [
            h('span', { key: 'l' }, 'Сессия:'),
            h('span', { key: 'v' }, hasUsage ? '≈ ' + money(total, currency) : 'нет данных'),
          ]),

          hasUsage ? null : h('div', { key: 'nodata', style: Object.assign({}, S.note, { paddingTop: 6 }) },
            'Провайдер ещё не сообщил usage для этой сессии.'),
        ]) : null,
      ])
    }

    function apply(ctx) {
      if (ctx.locale && ctx.locale.register) {
        try { ctx.locale.register(NS, { en, ru }) } catch (_) {}
      }

      ctx.slots.inject('conversation.session.header.utilities', () =>
        ctx.slots.register(
          { name: 'conversation.session.header.utilities', id: 'dsh-cost-meter', order: 10, inject: () => ({ ctx }) },
          (p) => React.createElement(CostMeter, { ...p, ctx }),
        ),
      )

      ctx.slots.inject('settings.plugin.item', () =>
        ctx.slots.register(
          { name: 'settings.plugin.item', key: NS, locale: NS, order: 20, inject: () => ({ ctx }) },
          (p) => React.createElement(CostMeterCard, { ...p, ctx }),
        ),
      )
    }

    module.exports = { apply, inject: ['slots', 'locale', 'settingsScope'] }
    return module.exports
  },
})
