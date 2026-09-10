// dsh-cost-meter — client half.
// Self-registering browser module for DeepSeek Harness.
// Unified design system aligned with @goodandready/dsh-clinebot.

window.__ModuleLoader__.load({
  id: '@goodandready/dsh-cost-meter',
  factory: (require) => {
    var module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-cost-meter'
    const STATE_PATH = '/dsh-cost-meter/state'
    const DAY = 1440

    // ----------------------------------------------------------- localization

    const ru = {
      title: 'Учёт расходов',
      subtitle: 'Тариф моделей, окна пиковых цен и стоимость сессии',
      'header.title': 'Учёт расходов (Cost Meter)',
      'header.sub': 'Мониторинг расходов токенов, автоматическое сопоставление тарифов и скидочных окон',
      'badge.catalog_ok': 'Каталог: {count} моделей',
      'badge.catalog_empty': 'Каталог: загрузка…',
      'badge.catalog_off': 'Каталог: выключен',
      'badge.catalog_err': 'Каталог: ошибка',
      'badge.deepseek': 'Тариф DeepSeek: активен',
      'section.general': 'Основные параметры',
      'section.general_desc': 'Отображение валюты, курса пересчёта и часового пояса в интерфейсе',
      'section.openrouter': 'Каталог цен OpenRouter',
      'section.openrouter_desc': 'Публичный каталог моделей для автоматического определения ставок и окон скидок',
      'section.diagnostics': 'Диагностика и статус',
      'section.diagnostics_desc': 'Текущее состояние фоновой синхронизации и кэша тарифов',
      'diag.models_count': 'Моделей в каталоге',
      'diag.last_sync': 'Последняя синхронизация',
      'diag.route': 'Активный маршрут',
      'diag.tariff_source': 'Источник тарифа',
      'field.currency': 'Символ валюты',
      'hint.currency': 'Символ валюты для отображения расходов (например, $, ₽, €).',
      'field.usdRate': 'Курс валюты к USD',
      'hint.usdRate': 'Количество единиц вашей валюты за 1 USD (1 для долларов).',
      'field.displayTimeZone': 'Временная зона (IANA)',
      'hint.displayTimeZone': 'Временная зона для отображения пиковых окон (например, Europe/Moscow, UTC).',
      'field.useOpenRouter': 'Использовать каталог OpenRouter',
      'hint.useOpenRouter': 'Автоматически загружать ставки и скидочные окна для моделей через OpenRouter API.',
      'field.refreshHours': 'Период обновления каталога (часов)',
      'hint.refreshHours': 'Интервал фонового обновления каталога в часах (от 1 до 168).',
      'settings.save': 'Сохранить настройки',
      'settings.saving': 'Сохранение…',
      'settings.saved': 'Настройки успешно сохранены',
      'settings.saveFailed': 'Ошибка сохранения: ',
      'settings.loading': 'Загрузка настроек…',
      'settings.unavailable': 'Настройки временно недоступны',
      'settings.retry': 'Повторить попытку',
      chipUnknown: 'Тариф не определён',
      routeUnknown: 'Маршрут не определён',
      catalogUnavailable: 'Каталог недоступен: ',
      peak: 'пик',
      offpeak: 'не-пик',
    }

    const en = {
      title: 'Cost Meter',
      subtitle: 'Model rates, peak discount windows and session spend',
      'header.title': 'Cost Meter',
      'header.sub': 'Token spend monitoring, automatic tariff resolution and discount windows',
      'badge.catalog_ok': 'Catalog: {count} models',
      'badge.catalog_empty': 'Catalog: loading…',
      'badge.catalog_off': 'Catalog: disabled',
      'badge.catalog_err': 'Catalog: error',
      'badge.deepseek': 'DeepSeek tariff: active',
      'section.general': 'General Parameters',
      'section.general_desc': 'Display currency, conversion rate and time zone configuration',
      'section.openrouter': 'OpenRouter Pricing Catalog',
      'section.openrouter_desc': 'Public catalog for dynamic model pricing and discount windows',
      'section.diagnostics': 'Diagnostics & Status',
      'section.diagnostics_desc': 'Current state of background synchronization and tariff cache',
      'diag.models_count': 'Catalog models',
      'diag.last_sync': 'Last sync',
      'diag.route': 'Active route',
      'diag.tariff_source': 'Tariff source',
      'field.currency': 'Currency Symbol',
      'hint.currency': 'Currency symbol shown in the UI (e.g. $, ₽, €).',
      'field.usdRate': 'USD Exchange Rate',
      'hint.usdRate': 'Units of currency per 1 USD (1 keeps USD).',
      'field.displayTimeZone': 'Time Zone (IANA)',
      'hint.displayTimeZone': 'IANA time zone for peak hours display (e.g. Europe/Moscow, UTC).',
      'field.useOpenRouter': 'Use OpenRouter Catalog',
      'hint.useOpenRouter': 'Pull rates and discount windows dynamically from public OpenRouter API.',
      'field.refreshHours': 'Catalog Refresh Interval (hours)',
      'hint.refreshHours': 'Background catalog fetch interval in hours (1 to 168).',
      'settings.save': 'Save Settings',
      'settings.saving': 'Saving…',
      'settings.saved': 'Settings saved successfully',
      'settings.saveFailed': 'Failed to save settings: ',
      'settings.loading': 'Loading settings…',
      'settings.unavailable': 'Settings temporarily unavailable',
      'settings.retry': 'Retry',
      chipUnknown: 'Unknown tariff',
      routeUnknown: 'Unknown route',
      catalogUnavailable: 'Catalog unavailable: ',
      peak: 'peak',
      offpeak: 'off-peak',
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
      const localeService = (ctx && typeof ctx.get === 'function' ? ctx.get('locale') : null) || (ctx && ctx.locale) || (ctx && ctx.services && ctx.services.locale)
      return React.useSyncExternalStore(
        React.useMemo(() => (cb) => (localeService && typeof localeService.subscribe === 'function' ? localeService.subscribe(cb) : () => {}), [localeService]),
        React.useCallback(() => (localeService && typeof localeService.getSnapshot === 'function' ? localeService.getSnapshot().active : 'ru'), [localeService]),
        React.useCallback(() => 'ru', []),
      )
    }

    // ----------------------------------------------------------------- styles

    const CSS = `
.dcm-card { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-3); border-radius: 12px; list-style: none; margin-bottom: 12px; }
.dcm-head { appearance: none; width: 100%; font: inherit; color: inherit; text-align: left; cursor: pointer; background: 0 0; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.dcm-title { color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 600; line-height: 1.4; }
.dcm-sub { color: var(--dsw-alias-label-secondary); font-size: 13px; }
.dcm-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding: 16px 0 12px; display: flex; flex-direction: column; gap: 14px; }

.dcm-section-card { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.dcm-section-title { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); display: flex; align-items: center; justify-content: space-between; }
.dcm-section-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-top: -4px; line-height: 1.4; }

.dcm-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.dcm-field { display: flex; flex-direction: column; gap: 6px; }
.dcm-row-check { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.dcm-check { width: 16px; height: 16px; accent-color: var(--dsw-alias-state-brand-primary, #6366f1); cursor: pointer; }
.dcm-label { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.dcm-hint { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.4; }

.dcm-input { height: 34px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 0 12px; font-size: 13px; width: 100%; box-sizing: border-box; }
.dcm-input:focus { outline: none; border-color: var(--dsw-alias-state-brand-primary, #6366f1); }
.dcm-input-err { border-color: var(--dsw-alias-state-error-primary, #ef4444); }

.dcm-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }
.dcm-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
.dcm-badge-ok { border-color: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); background: rgba(16,185,129,0.08); }
.dcm-badge-warn { border-color: var(--dsw-alias-state-warning-primary); color: var(--dsw-alias-state-warning-primary); background: rgba(245,158,11,0.08); }
.dcm-badge-bad { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); background: rgba(239,68,68,0.08); }

.dcm-btn { appearance: none; font: inherit; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 6px 14px; font-size: 13px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all .15s ease; }
.dcm-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-4, var(--dsw-alias-bg-layer-3)); }
.dcm-btn-primary { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); border-color: transparent; }
.dcm-btn-primary:hover:not(:disabled) { opacity: 0.9; }
.dcm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dcm-alert { padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.4; }
.dcm-alert-ok { background: rgba(16,185,129,0.1); color: var(--dsw-alias-state-success-primary); }
.dcm-alert-err { background: rgba(239,68,68,0.1); color: var(--dsw-alias-state-error-primary); }
.dcm-banner-warn { padding: 10px 14px; border-radius: 8px; background: rgba(245,158,11,0.1); color: var(--dsw-alias-state-warning-primary); font-size: 13px; }

.dcm-stat-box { padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); display: flex; flex-direction: column; gap: 2px; }
.dcm-stat-val { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.dcm-stat-lbl { font-size: 11px; color: var(--dsw-alias-label-secondary); }

.dcm-foot { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 6px; }

.dcm-chip { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font: inherit; font-size: 12px; font-variant-numeric: tabular-nums; line-height: 22px; transition: opacity .15s ease; }
.dcm-chip:hover { opacity: 0.88; }

.dcm-panel { position: absolute; top: 28px; right: 0; z-index: 40; width: 330px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base)); box-shadow: 0 10px 30px rgba(0,0,0,.28); font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary); text-align: left; font-variant-numeric: tabular-nums; }
.dcm-panel-title { font-weight: 600; padding-bottom: 4px; font-size: 13px; }
.dcm-panel-note { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dcm-hr { height: 1px; background: var(--dsw-alias-border-l2); margin: 10px -16px; border: 0; }
.dcm-panel-grid { display: grid; grid-template-columns: 1fr 60px 60px; column-gap: 6px; align-items: center; }
.dcm-panel-grid-flat { display: grid; grid-template-columns: 1fr 72px; column-gap: 6px; align-items: center; }
.dcm-panel-grid-3 { display: grid; grid-template-columns: 1fr 58px 72px; column-gap: 6px; align-items: center; }
.dcm-th { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; font-size: 11px; }
.dcm-th-num { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; text-align: right; font-size: 11px; }
.dcm-td { padding: 3px 0; }
.dcm-cell-idle { text-align: right; padding: 3px 6px; border-radius: 4px; color: var(--dsw-alias-label-tertiary); }
.dcm-num { text-align: right; color: var(--dsw-alias-label-tertiary); padding: 3px 0; }
.dcm-cost { text-align: right; padding: 3px 0; }
.dcm-section-lbl { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.dcm-total { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }
`

    function ensureStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-cost-meter-unified-css')) return
      const el = document.createElement('style')
      el.id = 'dsh-cost-meter-unified-css'
      el.dataset.dshPlugin = NS
      el.textContent = CSS
      document.head.appendChild(el)
    }

    function createErrorBoundary() {
      if (!React || typeof React.Component !== 'function') {
        return function NoopBoundary(props) { return props?.children || null }
      }
      return class ErrorBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { hasError: false, error: null }
        }
        static getDerivedStateFromError(error) {
          return { hasError: true, error }
        }
        componentDidCatch(error, errorInfo) {
          console.error('[dsh-cost-meter] React error caught:', error, errorInfo)
        }
        render() {
          if (this.state.hasError) {
            return React.createElement(
              'div',
              { className: 'dcm-alert dcm-alert-err', style: { margin: '8px 0' } },
              React.createElement('div', { style: { fontWeight: 600, marginBottom: 4 } }, '⚠️ Cost Meter UI Error:'),
              React.createElement('div', { style: { fontSize: 12, wordBreak: 'break-all' } }, String(this.state.error?.message || this.state.error)),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dcm-btn',
                  style: { marginTop: 8, fontSize: 12, padding: '3px 10px' },
                  onClick: () => this.setState({ hasError: false, error: null }),
                },
                'Retry'
              )
            )
          }
          return this.props?.children || null
        }
      }
    }
    const ErrorBoundary = createErrorBoundary()

    function refreshMirrorUntilVisible(ctx) {
      const visible = () => {
        try {
          const s = (ctx?.get && ctx.get('lanSettings')) || (ctx?.get && ctx.get('settingsScope')) || ctx?.settingsScope
          const view = s?.describe?.()?.getSnapshot?.()?.view
          return !!view && Array.isArray(view.namespaces) && view.namespaces.some((row) => row.ns === NS)
        } catch (_) {
          return false
        }
      }
      if (visible()) return () => {}
      let tries = 0
      const timer = setInterval(() => {
        if (visible() || tries >= 15) { clearInterval(timer); return }
        tries += 1
        try {
          const s = (ctx?.get && ctx.get('lanSettings')) || (ctx?.get && ctx.get('settingsScope')) || ctx?.settingsScope
          s?.describe?.()?.load?.()
        } catch (_) {}
      }, 1000)
      return () => clearInterval(timer)
    }

    function Chevron(props) {
      return React.createElement(
        'svg',
        {
          width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
          style: {
            marginLeft: 'auto',
            transform: props.open ? 'rotate(180deg)' : 'none',
            transition: 'transform .18s ease',
            color: 'var(--dsw-alias-label-secondary)',
          },
        },
        React.createElement('path', {
          d: 'M4 6L8 10L12 6',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
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

    function ago(timestamp) {
      if (!timestamp) return 'нет данных'
      const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
      if (minutes < 1) return 'только что'
      if (minutes < 60) return minutes + ' мин назад'
      const hours = Math.round(minutes / 60)
      return hours < 48 ? hours + ' ч назад' : Math.round(hours / 24) + ' дн назад'
    }

    // ---------------------------------------------------------------- card

    function CostMeterCard(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'ru' ? ru : en, en)
      const [open, setOpen] = React.useState(false)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [err, setErr] = React.useState('')
      const [saved, setSaved] = React.useState(false)
      const [diagState, setDiagState] = React.useState(null)

      const settingsScope = (ctx && typeof ctx.get === 'function' ? ctx.get('settingsScope') : null) || (ctx && ctx.settingsScope) || (ctx && ctx.services && ctx.services.settingsScope)
      const scope = React.useMemo(
        () => (settingsScope ? settingsScope.bind({ namespace: NS }) : undefined),
        [settingsScope],
      )

      const snapshot = React.useSyncExternalStore(
        React.useMemo(() => (cb) => (scope ? scope.subscribe(cb) : () => {}), [scope]),
        React.useCallback(() => (scope ? scope.getSnapshot() : { status: 'loading' }), [scope]),
        React.useCallback(() => ({ status: 'loading' }), []),
      )

      React.useEffect(() => { ensureStyles() }, [])

      // Poll state for live diagnostics
      React.useEffect(() => {
        if (!open) return
        fetch(STATE_PATH, { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setDiagState(data) })
          .catch(() => {})
      }, [open])

      const status = (snapshot && snapshot.status) || 'loading'
      const stored = (snapshot && snapshot.value) || {}

      React.useEffect(() => {
        if (status === 'ready' && draft === null) {
          setDraft({
            currency: stored.currency !== undefined ? String(stored.currency) : '$',
            usdRate: stored.usdRate !== undefined ? String(stored.usdRate) : '1',
            displayTimeZone: stored.displayTimeZone !== undefined ? String(stored.displayTimeZone) : 'Europe/Moscow',
            useOpenRouter: stored.useOpenRouter !== undefined ? Boolean(stored.useOpenRouter) : true,
            refreshHours: stored.refreshHours !== undefined ? String(stored.refreshHours) : '24',
          })
        }
      }, [status, stored, draft])

      const tzValid = draft ? isValidTimeZone(draft.displayTimeZone) : true
      const rateValid = draft ? (!isNaN(Number(draft.usdRate)) && Number(draft.usdRate) > 0) : true
      const hoursValid = draft ? (!isNaN(Number(draft.refreshHours)) && Number(draft.refreshHours) >= 1 && Number(draft.refreshHours) <= 168) : true

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

        try {
          await scope.set('useOpenRouter', Boolean(draft.useOpenRouter))
        } catch (e) { broken.push('useOpenRouter: ' + (e && e.message || String(e))) }

        const hoursNum = Number(String(draft.refreshHours).trim())
        if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 168) {
          broken.push('refreshHours: must be between 1 and 168 hours')
        } else {
          try {
            await scope.set('refreshHours', hoursNum)
          } catch (e) { broken.push('refreshHours: ' + (e && e.message || String(e))) }
        }

        setSaving(false)
        if (broken.length) {
          setErr(t('settings.saveFailed') + broken.join('; '))
          return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }

      const modelsCount = (diagState && typeof diagState.catalogModelsCount === 'number')
        ? diagState.catalogModelsCount
        : ((diagState && diagState.schedules) ? Object.keys(diagState.schedules).length : null)
      const catalogHasErr = diagState && Boolean(diagState.catalogError)
      const openRouterEnabled = draft ? Boolean(draft.useOpenRouter) : true

      return React.createElement('li', { className: 'dcm-card' },
        React.createElement('button', {
          type: 'button', className: 'dcm-head', 'aria-expanded': open,
          onClick: () => setOpen((v) => !v),
        },
          React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 } },
            React.createElement('span', { className: 'dcm-title' }, t('header.title')),
            React.createElement('span', { className: 'dcm-sub' }, t('header.sub')),
            React.createElement('div', { className: 'dcm-badges' },
              React.createElement('span', { className: 'dcm-badge dcm-badge-ok' }, t('badge.deepseek')),
              openRouterEnabled
                ? (catalogHasErr
                    ? React.createElement('span', { className: 'dcm-badge dcm-badge-bad' }, t('badge.catalog_err'))
                    : (modelsCount !== null && modelsCount > 0
                        ? React.createElement('span', { className: 'dcm-badge dcm-badge-ok' }, t('badge.catalog_ok', { count: modelsCount }))
                        : React.createElement('span', { className: 'dcm-badge dcm-badge-warn' }, t('badge.catalog_empty'))))
                : React.createElement('span', { className: 'dcm-badge dcm-badge-warn' }, t('badge.catalog_off')),
              draft && draft.displayTimeZone
                ? React.createElement('span', { className: 'dcm-badge' }, draft.displayTimeZone)
                : null,
            ),
          ),
          React.createElement(Chevron, { open }),
        ),
        open ? React.createElement('div', { className: 'dcm-body' },
          status === 'loading'
            ? React.createElement('div', { className: 'dcm-hint', style: { padding: '12px 0' } }, t('settings.loading'))
            : status !== 'ready'
              ? React.createElement('div', { className: 'dcm-alert dcm-alert-err' }, t('settings.unavailable'))
              : React.createElement(React.Fragment, null,
                  // Section 1: General Parameters
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' }, t('section.general')),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.general_desc')),
                    React.createElement('div', { className: 'dcm-grid-2' },
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
                          className: 'dcm-input' + (rateValid ? '' : ' dcm-input-err'),
                          type: 'number',
                          step: 'any',
                          value: (draft && draft.usdRate) !== undefined ? draft.usdRate : '',
                          onChange: (e) => setDraft({ ...draft, usdRate: e.target.value }),
                        }),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.usdRate')),
                      ),
                    ),
                    React.createElement('div', { className: 'dcm-field' },
                      React.createElement('label', { className: 'dcm-label' }, t('field.displayTimeZone')),
                      React.createElement('input', {
                        className: 'dcm-input' + (tzValid ? '' : ' dcm-input-err'),
                        value: (draft && draft.displayTimeZone) !== undefined ? draft.displayTimeZone : '',
                        onChange: (e) => setDraft({ ...draft, displayTimeZone: e.target.value }),
                      }),
                      React.createElement('span', { className: 'dcm-hint' },
                        tzValid
                          ? t('hint.displayTimeZone')
                          : 'Некорректный идентификатор временной зоны IANA'
                      ),
                    ),
                  ),

                  // Section 2: OpenRouter Pricing Catalog
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' }, t('section.openrouter')),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.openrouter_desc')),
                    React.createElement('div', { className: 'dcm-row-check' },
                      React.createElement('input', {
                        id: 'dcm-use-openrouter',
                        type: 'checkbox',
                        className: 'dcm-check',
                        checked: draft ? Boolean(draft.useOpenRouter) : true,
                        onChange: (e) => setDraft({ ...draft, useOpenRouter: e.target.checked }),
                      }),
                      React.createElement('label', { htmlFor: 'dcm-use-openrouter', className: 'dcm-label', style: { cursor: 'pointer' } }, t('field.useOpenRouter')),
                    ),
                    React.createElement('span', { className: 'dcm-hint', style: { marginTop: -6 } }, t('hint.useOpenRouter')),
                    React.createElement('div', { className: 'dcm-field', style: { marginTop: 4 } },
                      React.createElement('label', { className: 'dcm-label' }, t('field.refreshHours')),
                      React.createElement('input', {
                        className: 'dcm-input' + (hoursValid ? '' : ' dcm-input-err'),
                        type: 'number',
                        min: 1,
                        max: 168,
                        value: (draft && draft.refreshHours) !== undefined ? draft.refreshHours : '',
                        onChange: (e) => setDraft({ ...draft, refreshHours: e.target.value }),
                      }),
                      React.createElement('span', { className: 'dcm-hint' }, t('hint.refreshHours')),
                    ),
                  ),

                  // Section 3: Live Diagnostics
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' }, t('section.diagnostics')),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.diagnostics_desc')),
                    React.createElement('div', { className: 'dcm-grid-2' },
                      React.createElement('div', { className: 'dcm-stat-box' },
                        React.createElement('span', { className: 'dcm-stat-val' },
                          modelsCount !== null ? String(modelsCount) : '—'
                        ),
                        React.createElement('span', { className: 'dcm-stat-lbl' }, t('diag.models_count')),
                      ),
                      React.createElement('div', { className: 'dcm-stat-box' },
                        React.createElement('span', { className: 'dcm-stat-val' },
                          diagState ? ago(diagState.fetchedAt) : '—'
                        ),
                        React.createElement('span', { className: 'dcm-stat-lbl' }, t('diag.last_sync')),
                      ),
                      React.createElement('div', { className: 'dcm-stat-box' },
                        React.createElement('span', { className: 'dcm-stat-val', style: { fontSize: 12 } },
                          diagState && diagState.route ? (diagState.route.provider + '/' + diagState.route.model) : 'default'
                        ),
                        React.createElement('span', { className: 'dcm-stat-lbl' }, t('diag.route')),
                      ),
                      React.createElement('div', { className: 'dcm-stat-box' },
                        React.createElement('span', { className: 'dcm-stat-val', style: { fontSize: 12 } },
                          diagState && diagState.source ? String(diagState.source).toUpperCase() : 'DEEPSEEK'
                        ),
                        React.createElement('span', { className: 'dcm-stat-lbl' }, t('diag.tariff_source')),
                      ),
                    ),
                  ),

                  // Alerts & Action Footer
                  err ? React.createElement('div', { className: 'dcm-alert dcm-alert-err' }, err) : null,
                  saved ? React.createElement('div', { className: 'dcm-alert dcm-alert-ok' }, t('settings.saved')) : null,
                  React.createElement('div', { className: 'dcm-foot' },
                    React.createElement('button', {
                      type: 'button',
                      className: 'dcm-btn dcm-btn-primary',
                      disabled: saving || !tzValid || !rateValid || !hoursValid,
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

    function ratesAt(schedule, minute) {
      const windows = (schedule && schedule.windows) || []
      for (const w of windows) if (inWindow(minute, w)) return w.rates
      return (schedule && schedule.base) || { cacheHit: 0, input: 0, cacheWrite: 0, output: 0 }
    }

    function minutesUntilChange(schedule, minute) {
      const now = ratesAt(schedule, minute)
      for (let step = 1; step <= DAY; step += 1) {
        const probe = ratesAt(schedule, (minute + step) % DAY)
        if (probe.output !== now.output || probe.input !== now.input) return step
      }
      return null
    }

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

    function sumSlots(slots) {
      const total = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
      for (const key of Object.keys(slots || {})) {
        const b = slots[key] || {}
        for (const field of Object.keys(total)) total[field] += Number(b[field]) || 0
      }
      return total
    }

    function spendBySlots(slots, schedule) {
      let usd = 0
      for (const key of Object.keys(slots || {})) {
        const minute = (Number(key) * 30 + 15) % 1440
        usd += spendUsd(slots[key], ratesAt(schedule, minute))
      }
      return usd
    }

    function spendUsd(usage, rates) {
      const u = usage || {}
      const perMillion =
        (Number(u.cacheReadTokens) || 0) * (rates.cacheHit || 0) +
        (Number(u.uncachedInputTokens) || 0) * (rates.input || 0) +
        (Number(u.cacheWriteTokens) || 0) * (rates.cacheWrite || 0) +
        (Number(u.outputTokens) || 0) * (rates.output || 0)
      return perMillion / 1e6
    }

    function rate(value) {
      if (!value) return '—'
      const text = value < 0.1 ? value.toFixed(3) : value.toFixed(2)
      return '$' + text.replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '')
    }

    function money(value, currency) {
      const n = Number(value) || 0
      return currency + n.toFixed(Math.abs(n) >= 100 ? 0 : 2)
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

    function zoneLabel(zone) {
      if (!zone) return 'UTC'
      if (zone === 'Europe/Moscow') return 'МСК'
      const city = zone.includes('/') ? zone.slice(zone.lastIndexOf('/') + 1) : zone
      return city.replace(/_/g, ' ')
    }

    // ------------------------------------------------------------ CostMeter

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

      React.useEffect(() => { ensureStyles() }, [])

      const settingsScope = (ctx && typeof ctx.get === 'function' ? ctx.get('settingsScope') : null) || (ctx && ctx.settingsScope) || (ctx && ctx.services && ctx.services.settingsScope)
      const settingsSnap = React.useSyncExternalStore
        ? React.useSyncExternalStore(
            (cb) => (settingsScope && typeof settingsScope.subscribe === 'function' ? settingsScope.subscribe(cb) : () => {}),
            () => (settingsScope && typeof settingsScope.get === 'function' ? settingsScope.get(NS) : null),
            () => null,
          )
        : null

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

      if (!schedule) {
        return h('div', { ref: box, style: { position: 'relative' } }, [
          h('button', {
            key: 'chip', type: 'button',
            className: 'dcm-chip',
            style: { background: 'transparent', color: 'var(--dsw-alias-label-tertiary)' },
            onClick: () => setOpen((v) => !v), title: t('chipUnknown'),
          }, 'тариф ?'),
          open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
            h('div', { key: 't', className: 'dcm-panel-title' },
              state.route ? state.route.provider + ' / ' + state.route.model : t('routeUnknown')),
            h('div', { key: 'n', className: 'dcm-panel-note' },
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

      const fg = cheapNow ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-warning-primary)'
      const bg = cheapNow ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'
      const activeCell = { textAlign: 'right', padding: '3px 6px', borderRadius: 4, background: bg, color: fg, fontWeight: 600 }

      const rateRow = (label, key) => flat
        ? [
            h('div', { key: label + '-l', className: 'dcm-td' }, label),
            h('div', { key: label + '-v', className: 'dcm-cost' }, rate(active[key])),
          ]
        : [
            h('div', { key: label + '-l', className: 'dcm-td' }, label),
            h('div', { key: label + '-lo', style: cheapNow ? activeCell : undefined, className: cheapNow ? '' : 'dcm-cell-idle' }, rate(low[key])),
            h('div', { key: label + '-hi', style: cheapNow ? undefined : activeCell, className: cheapNow ? 'dcm-cell-idle' : '' }, rate(high[key])),
          ]

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
          h('div', { key: label + '-l', className: 'dcm-td' }, label),
          h('div', { key: label + '-n', className: 'dcm-num' }, tokens(n)),
          h('div', { key: label + '-v', className: 'dcm-cost' }, money(usd * fx, currency)),
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
          className: 'dcm-chip',
          style: { background: bg, color: fg, borderColor: cheapNow ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' },
          onClick: () => setOpen((v) => !v),
          title: flat ? 'Единый тариф' : cheapNow ? 'Льготный тариф' : 'Полный тариф',
        }, [
          h('span', { key: 'sum' }, hasUsage ? '≈ ' + money(total, currency) : '—'),
          left ? h('span', { key: 'left', style: { opacity: 0.75 } }, left) : null,
        ]),

        open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
          h('div', { key: 'title', className: 'dcm-panel-title' },
            (state.route ? state.route.model : 'модель') +
            (flat ? '' : ' — сейчас ' + (cheapNow ? 'не-пик' : t('peak')))),

          h('div', { key: 'note', className: 'dcm-panel-note' },
            flat
              ? 'Единая ставка, от времени суток не зависит'
              : (cheapNow ? 'Действует льготная ставка' : 'Действует полная ставка') +
                (left ? ' · смена через ' + left : '')),

          flat
            ? null
            : h('div', { key: 'clock', className: 'dcm-panel-note' },
                'Пик: ' + windowText + ' ' + zl + ' · сейчас ' + nowLocal + ' ' + zl),

          h('hr', { key: 'hr1', className: 'dcm-hr' }),

          h('div', { key: 'rates', className: flat ? 'dcm-panel-grid-flat' : 'dcm-panel-grid' }, [
            h('div', { key: 'h0', className: 'dcm-th' }, '1M токенов, $'),
            flat ? null : h('div', { key: 'h1', className: 'dcm-th-num' }, 'не-пик'),
            h('div', { key: 'h2', className: 'dcm-th-num' }, flat ? 'ставка' : 'пик'),
            rateRow('Вход (кэш-хит)', 'cacheHit'),
            rateRow('Вход (мимо кэша)', 'input'),
            showCacheWrite ? rateRow('Вход (запись в кэш)', 'cacheWrite') : null,
            rateRow('Выход', 'output'),
          ]),

          h('hr', { key: 'hr2', className: 'dcm-hr' }),

          multiModel
            ? null
            : [
                h('div', { key: 'btitle', className: 'dcm-section-lbl' }, 'Токены сессии'),
                h('div', { key: 'breakdown', className: 'dcm-panel-grid-3' }, [
                  h('div', { key: 'b0', className: 'dcm-th' }, 'токенов'),
                  h('div', { key: 'b1', className: 'dcm-th-num' }, ''),
                  h('div', { key: 'b2', className: 'dcm-th-num' }, currency),
                  spentRow('Вход (кэш-хит)', 'cacheReadTokens', 'cacheHit'),
                  spentRow('Вход (мимо кэша)', 'uncachedInputTokens', 'input'),
                  showCacheWrite ? spentRow('Вход (запись в кэш)', 'cacheWriteTokens', 'cacheWrite') : null,
                  spentRow('Выход', 'outputTokens', 'output'),
                ]),
                h('hr', { key: 'hr-models', className: 'dcm-hr' }),
              ],

          h('div', { key: 'mtitle', className: 'dcm-section-lbl' }, 'Расход по моделям'),
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
                        color: m.known ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)',
                      },
                    },
                    m.known ? (hasUsage ? money(m.cost, currency) : '—') : 'не указана стоимость',
                  ),
                ],
              ),
            ),
          ),

          h('hr', { key: 'hr3', className: 'dcm-hr' }),

          h('div', { key: 'total', className: 'dcm-total' }, [
            h('span', { key: 'l' }, 'Сессия:'),
            h('span', { key: 'v' }, hasUsage ? '≈ ' + money(total, currency) : 'нет данных'),
          ]),

          hasUsage ? null : h('div', { key: 'nodata', className: 'dcm-panel-note', style: { paddingTop: 6 } },
            'Провайдер ещё не сообщил usage для этой сессии.'),
        ]) : null,
      ])
    }

    function apply(ctx) {
      if (ctx.locale && ctx.locale.register) {
        try { ctx.locale.register(NS, { en, ru }) } catch (_) {}
      }

      refreshMirrorUntilVisible(ctx)

      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        ctx.slots.inject('conversation.session.header.utilities', () =>
          ctx.slots.register(
            { name: 'conversation.session.header.utilities', id: 'dsh-cost-meter', order: 10, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(CostMeter, { ...p, ctx: (p && p.ctx) || ctx })),
          ),
        )

        ctx.slots.inject('settings.plugin.item', () =>
          ctx.slots.register(
            { name: 'settings.plugin.item', key: NS, locale: NS, order: 20, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(CostMeterCard, { ...p, ctx: (p && p.ctx) || ctx })),
          ),
        )
      }
    }

    module.exports = { apply, inject: ['slots', 'locale', 'settingsScope'], CostMeterCard, CostMeter, ErrorBoundary, ensureStyles }
    return module.exports
  },
})
