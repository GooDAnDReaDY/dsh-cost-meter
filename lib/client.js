// dsh-cost-meter — client half.
// Self-registering browser module for DeepSeek Harness.
// Unified design system aligned with @goodandready/dsh-clinebot and DSH tokens.
// Canonical languages: English (en) and Chinese (zh).

window.__ModuleLoader__.load({
  id: '@goodandready/dsh-cost-meter',
  factory: (require) => {
    var module = { exports: {} }
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-cost-meter'
    // Plugins page row seat (DSH 0.1.6-alpha.2): key = '<package name>#<row id>'.
    const PKG = '@goodandready/dsh-cost-meter'
    const ROW_ID = 'dsh-cost-meter'
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID
    const STATE_PATH = '/dsh-cost-meter/state'
    const REFRESH_PATH = '/dsh-cost-meter/refresh'
    const UPDATE_PATH = '/dsh-cost-meter/update'
    const DAY = 1440

    // ----------------------------------------------------------- localization

    const en = {
      title: 'Cost Meter',
      subtitle: 'Model rates, peak discount windows and session spend',
      'header.title': 'Cost Meter',
      'header.sub': 'Token spend monitoring, automatic tariff resolution and discount windows',
      'update.checking': 'Checking for updates…',
      'update.up_to_date': 'Up to date',
      'update.available': 'Update available: v{latestVersion} (current: v{currentVersion})',
      'update.btn': 'Update Now',
      'update.updating': 'Updating…',
      'update.done': 'Successfully updated to v{version}! Please restart DSH.',
      'update.failed': 'Update failed: {error}',
      'badge.catalog_ok': 'Catalog: {count} models',
      'badge.catalog_empty': 'Catalog: loading…',
      'badge.catalog_off': 'Catalog: disabled',
      'badge.catalog_err': 'Catalog: error',
      'badge.catalog_stale': 'Cache: offline',
      'badge.deepseek': 'DeepSeek tariff: active',
      'section.general': 'General Parameters',
      'section.general_desc': 'Display currency, conversion rate, budget threshold and time zone configuration',
      'section.openrouter': 'OpenRouter Pricing Catalog',
      'section.openrouter_desc': 'Public catalog for dynamic model pricing and discount windows',
      'section.diagnostics': 'Diagnostics & Status',
      'section.diagnostics_desc': 'Current state of background synchronization and tariff cache',
      'diag.models_count': 'Catalog models',
      'diag.last_sync': 'Last sync',
      'diag.route': 'Active route',
      'diag.tariff_source': 'Tariff source',
      'field.currency': 'Currency Symbol',
      'hint.currency': 'Currency symbol shown in the UI (e.g. $, ¥, €).',
      'field.usdRate': 'USD Exchange Rate',
      'hint.usdRate': 'Units of currency per 1 USD (1 keeps USD).',
      'field.budgetThreshold': 'Session Budget Threshold (USD)',
      'hint.budgetThreshold': 'Warn via chip color when session spend exceeds this amount (0 disables).',
      'field.displayTimeZone': 'Time Zone (IANA)',
      'hint.displayTimeZone': 'IANA time zone for peak hours display (e.g. Europe/Moscow, Asia/Shanghai, UTC).',
      'field.useOpenRouter': 'Use OpenRouter Catalog',
      'hint.useOpenRouter': 'Pull rates and discount windows dynamically from public OpenRouter API.',
      'field.refreshHours': 'Catalog Refresh Interval (hours)',
      'hint.refreshHours': 'Background catalog fetch interval in hours (1 to 168).',
      'action.sync_now': 'Sync Now',
      'action.syncing': 'Syncing…',
      'action.sync_ok': 'Catalog updated',
      'action.sync_err': 'Sync failed',
      'action.sync_rate_limited': 'Wait {seconds}s',
      'action.copy_report': 'Copy Summary',
      'action.copied': 'Copied!',
      'savings.hint': '💡 50% discount starts in {time} ({clock} {zone})',
      'savings.cache_saved': '⚡ Context cache saved: ≈ {amount} ({percent}%)',
      'budget.exceeded': '⚠️ Budget limit exceeded: {limit}',
      'models.show_more': 'Show all {count} models',
      'models.show_less': 'Show fewer',
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
      'rate.per_1m': '1M tokens, $',
      'rate.cache_hit': 'Input (cache hit)',
      'rate.input': 'Input (cache miss)',
      'rate.cache_write': 'Input (cache write)',
      'rate.output': 'Output',
      'tokens.session': 'Session Tokens',
      'tokens.tokens_col': 'Tokens',
      'tokens.models_spent': 'Spend by Model',
      'tokens.session_total': 'Session total:',
      'tokens.no_usage_yet': 'Provider has not reported usage for this session yet.',
      'tokens.not_priced': 'Not priced',
      'tz.invalid': 'Invalid IANA time zone identifier',
    }

    const zh = {
      title: '成本计量器',
      subtitle: '模型费率、高峰优惠窗口与会话消费统计',
      'header.title': '成本计量器 (Cost Meter)',
      'header.sub': 'Token 消费监控、费率自动匹配与折扣窗口管理',
      'update.checking': '正在检查更新…',
      'update.up_to_date': '已是最新版本',
      'update.available': '发现新版本 v{latestVersion}（当前版本 v{currentVersion}）',
      'update.btn': '立即更新',
      'update.updating': '正在更新…',
      'update.done': '更新成功至 v{version}！请重启 DSH 服务生效。',
      'update.failed': '更新失败：{error}',
      'badge.catalog_ok': '目录：{count} 个模型',
      'badge.catalog_empty': '目录：加载中…',
      'badge.catalog_off': '目录：已禁用',
      'badge.catalog_err': '目录：错误',
      'badge.catalog_stale': '缓存：离线',
      'badge.deepseek': 'DeepSeek 费率：生效中',
      'section.general': '基础参数',
      'section.general_desc': '显示货币、汇率转换、预算阈值与时区设置',
      'section.openrouter': 'OpenRouter 定价目录',
      'section.openrouter_desc': '用于自动获取模型价格与折扣窗口的公开价格目录',
      'section.diagnostics': '诊断与状态',
      'section.diagnostics_desc': '后台同步与费率缓存当前状态',
      'diag.models_count': '目录中模型数',
      'diag.last_sync': '上次同步',
      'diag.route': '当前路由',
      'diag.tariff_source': '费率来源',
      'field.currency': '货币符号',
      'hint.currency': '界面中显示的货币符号（例如：$、¥、€）。',
      'field.usdRate': 'USD 汇率',
      'hint.usdRate': '每 1 美元对应的本币金额（1 为美元）。',
      'field.budgetThreshold': '会话预算阈值 (USD)',
      'hint.budgetThreshold': '当会话消费超出该金额时在状态指示器报警（0 表示禁用）。',
      'field.displayTimeZone': '时区 (IANA)',
      'hint.displayTimeZone': '显示高峰时段的 IANA 时区（例如：Asia/Shanghai、UTC）。',
      'field.useOpenRouter': '使用 OpenRouter 目录',
      'hint.useOpenRouter': '通过公开的 OpenRouter API 自动拉取费率与折扣窗口。',
      'field.refreshHours': '目录刷新周期 (小时)',
      'hint.refreshHours': '后台刷新价格目录的时间间隔（1 至 168 小时）。',
      'action.sync_now': '立即同步',
      'action.syncing': '同步中…',
      'action.sync_ok': '目录已更新',
      'action.sync_err': '同步失败',
      'action.sync_rate_limited': '请等待 {seconds} 秒',
      'action.copy_report': '复制消费报告',
      'action.copied': '已复制！',
      'savings.hint': '💡 5 折优惠将在 {time} 后生效 ({clock} {zone})',
      'savings.cache_saved': '⚡ 上下文缓存节省：≈ {amount} ({percent}%)',
      'budget.exceeded': '⚠️ 已超出预算上限：{limit}',
      'models.show_more': '查看全部 {count} 个模型',
      'models.show_less': '收起',
      'settings.save': '保存设置',
      'settings.saving': '保存中…',
      'settings.saved': '设置已成功保存',
      'settings.saveFailed': '保存设置失败：',
      'settings.loading': '加载设置中…',
      'settings.unavailable': '设置暂时不可用',
      'settings.retry': '重试',
      chipUnknown: '费率未知',
      routeUnknown: '路由未知',
      catalogUnavailable: '价格目录不可用：',
      peak: '高峰',
      offpeak: '低谷',
      'rate.per_1m': '每 1M tokens ($)',
      'rate.cache_hit': '输入 (命中缓存)',
      'rate.input': '输入 (未命中)',
      'rate.cache_write': '输入 (写入缓存)',
      'rate.output': '输出',
      'tokens.session': '会话 Tokens',
      'tokens.tokens_col': 'Tokens 数',
      'tokens.models_spent': '各模型消费',
      'tokens.session_total': '会话总计：',
      'tokens.no_usage_yet': '提供商尚未报告当前会话的用量数据。',
      'tokens.not_priced': '未定价',
      'tz.invalid': '无效的 IANA 时区标识',
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
        React.useCallback(() => {
          const snap = localeService && typeof localeService.getSnapshot === 'function' ? localeService.getSnapshot() : null
          const active = snap ? (snap.active || snap.locale || 'en') : 'en'
          return String(active).startsWith('zh') ? 'zh' : 'en'
        }, [localeService]),
        React.useCallback(() => 'en', []),
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
.dcm-check { width: 16px; height: 16px; accent-color: var(--dsw-alias-state-brand-primary); cursor: pointer; }
.dcm-label { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.dcm-hint { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.4; }

.dcm-input { height: 34px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 0 12px; font-size: 13px; width: 100%; box-sizing: border-box; }
.dcm-input:focus { outline: none; border-color: var(--dsw-alias-state-brand-primary); }
.dcm-input-err { border-color: var(--dsw-alias-state-error-primary); }

.dcm-chevron { display: inline-flex; align-items: center; justify-content: center; transition: transform .16s ease; color: var(--dsw-alias-label-tertiary); }
.dcm-chevron-open { transform: rotate(180deg); }

.dcm-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }
.dcm-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
.dcm-badge-ok { border-color: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent); }
.dcm-badge-warn { border-color: var(--dsw-alias-state-warning-primary); color: var(--dsw-alias-state-warning-primary); background: color-mix(in srgb, var(--dsw-alias-state-warning-primary) 8%, transparent); }
.dcm-badge-bad { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }

.dcm-btn { appearance: none; font: inherit; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 6px 14px; font-size: 13px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all .15s ease; }
.dcm-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-4, var(--dsw-alias-bg-layer-3)); }
.dcm-btn-primary { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); border-color: transparent; }
.dcm-btn-primary:hover:not(:disabled) { opacity: 0.9; }
.dcm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dcm-btn-sm { padding: 4px 10px; font-size: 12px; border-radius: 6px; }

.dcm-alert { padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.4; }
.dcm-alert-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent); color: var(--dsw-alias-state-success-primary); }
.dcm-alert-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); color: var(--dsw-alias-state-error-primary); }
.dcm-tip-box { padding: 8px 12px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-brand-primary) 20%, transparent); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 1.4; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dcm-cache-box { padding: 7px 11px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent); color: var(--dsw-alias-state-success-primary); font-size: 11.5px; font-weight: 500; line-height: 1.4; font-variant-numeric: tabular-nums; }

.dcm-stat-box { padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); display: flex; flex-direction: column; gap: 2px; }
.dcm-stat-val { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.dcm-stat-lbl { font-size: 11px; color: var(--dsw-alias-label-secondary); }

.dcm-foot { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 6px; }

/* Native dot-indicator chip */
.dcm-chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; font-size: 12px; font-variant-numeric: tabular-nums; line-height: 24px; transition: all .15s ease; user-select: none; }
.dcm-chip:hover { border-color: var(--dsw-alias-border-l3, var(--dsw-alias-label-tertiary)); background: var(--dsw-alias-bg-layer-3); }
.dcm-dot { width: 6.5px; height: 6.5px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dcm-dot-ok { background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 5px color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent); }
.dcm-dot-warn { background: var(--dsw-alias-state-warning-primary); box-shadow: 0 0 5px color-mix(in srgb, var(--dsw-alias-state-warning-primary) 40%, transparent); }
.dcm-dot-err { background: var(--dsw-alias-state-error-primary); box-shadow: 0 0 6px color-mix(in srgb, var(--dsw-alias-state-error-primary) 70%, transparent); animation: dcm-pulse 1.8s infinite ease-in-out; }
.dcm-dot-idle { background: var(--dsw-alias-label-tertiary); }

.dcm-chip-timer { opacity: 0.72; font-size: 11px; padding-left: 2px; border-left: 1px solid var(--dsw-alias-border-l2); }
@media (max-width: 680px) {
  .dcm-chip-timer { display: none; }
}

@keyframes dcm-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

.dcm-panel { position: absolute; top: 30px; right: 0; z-index: 40; width: 336px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base)); box-shadow: var(--dsw-alias-shadow-layer-3, 0 10px 32px var(--dsw-alias-bg-base)); font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary); text-align: left; font-variant-numeric: tabular-nums; }
.dcm-panel-title { font-weight: 600; padding-bottom: 2px; font-size: 13.5px; display: flex; justify-content: space-between; align-items: baseline; }
.dcm-panel-note { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dcm-hr { height: 1px; background: var(--dsw-alias-border-l2); margin: 10px -16px; border: 0; }
.dcm-panel-grid { display: grid; grid-template-columns: 1fr 62px 62px; column-gap: 6px; align-items: center; }
.dcm-panel-grid-flat { display: grid; grid-template-columns: 1fr 76px; column-gap: 6px; align-items: center; }
.dcm-panel-grid-3 { display: grid; grid-template-columns: 1fr 60px 74px; column-gap: 6px; align-items: center; }
.dcm-th { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; font-size: 11px; }
.dcm-th-num { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; text-align: right; font-size: 11px; }
.dcm-td { padding: 3.5px 0; color: var(--dsw-alias-label-secondary); }
.dcm-cell-idle { text-align: right; padding: 3px 6px; border-radius: 4px; color: var(--dsw-alias-label-tertiary); }
.dcm-num { text-align: right; color: var(--dsw-alias-label-tertiary); padding: 3.5px 0; }
.dcm-cost { text-align: right; padding: 3.5px 0; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dcm-section-lbl { color: var(--dsw-alias-label-tertiary); padding-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.dcm-total { display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; }
.dcm-accordion-btn { appearance: none; background: transparent; border: 0; color: var(--dsw-alias-state-brand-primary); font: inherit; font-size: 11.5px; cursor: pointer; padding: 2px 0; text-align: left; }
.dcm-accordion-btn:hover { text-decoration: underline; }
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

    function getSettingsScope(ctx) {
      return (ctx && typeof ctx.get === 'function' ? ctx.get('settingsScope') : null) || (ctx && ctx.settingsScope) || (ctx && ctx.services && ctx.services.settingsScope) || null
    }

    function refreshMirrorUntilVisible(ctx) {
      const s = getSettingsScope(ctx)
      const visible = () => {
        try {
          const view = s?.describe?.()?.getSnapshot?.()?.view
          return !!view && Array.isArray(view.namespaces) && view.namespaces.some((row) => row.ns === NS)
        } catch (e) {
          if (ctx?.logger?.debug) ctx.logger.debug('[dsh-cost-meter] mirror check error: ' + (e?.message || e))
          return false
        }
      }
      if (!s || visible()) return () => {}
      let tries = 0
      const timer = setInterval(() => {
        if (visible() || tries >= 15) {
          if (!visible() && tries >= 15 && ctx?.logger?.warn) {
            ctx.logger.warn('[dsh-cost-meter] settings mirror did not appear after 15 attempts')
          }
          clearInterval(timer)
          return
        }
        tries += 1
        try {
          s?.describe?.()?.load?.()
        } catch (e) {
          if (ctx?.logger?.debug) ctx.logger.debug('[dsh-cost-meter] settings load error: ' + (e?.message || e))
        }
      }, 1000)
      return () => clearInterval(timer)
    }

    let ChevronIcon = null
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
      ChevronIcon = primitives && (primitives.IconChevronDownOutline14 || primitives.IconChevronDownOutline)
    } catch (e) {
      ChevronIcon = null
    }

    function FallbackChevron(props) {
      return React.createElement(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 14 14',
          fill: 'none',
          'aria-hidden': true,
        },
        React.createElement('path', {
          d: 'M3.5 5.25L7 8.75L10.5 5.25',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function Chevron(props) {
      const icon = ChevronIcon
        ? React.createElement(ChevronIcon, { 'aria-hidden': true })
        : React.createElement(FallbackChevron, null)
      return React.createElement(
        'span',
        {
          className: 'dcm-chevron' + (props.open ? ' dcm-chevron-open' : ''),
          style: { marginLeft: 'auto' },
        },
        icon,
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

    function ago(timestamp, locale) {
      if (!timestamp) return '—'
      const isZh = locale === 'zh'
      const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
      if (minutes < 1) return isZh ? '刚刚' : 'just now'
      if (minutes < 60) return minutes + (isZh ? ' 分钟前' : ' min ago')
      const hours = Math.round(minutes / 60)
      return hours < 48 ? hours + (isZh ? ' 小时前' : ' hrs ago') : Math.round(hours / 24) + (isZh ? ' 天前' : ' days ago')
    }

    // ---------------------------------------------------------------- card

    function CostMeterCard(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'zh' ? zh : en, en)
      const page = !!(props && props.view === 'page')
      const [open, setOpen] = React.useState(!!page)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [err, setErr] = React.useState('')
      const [saved, setSaved] = React.useState(false)
      const [diagState, setDiagState] = React.useState(null)

      // Manual sync button state
      const [syncing, setSyncing] = React.useState(false)
      const [syncMsg, setSyncMsg] = React.useState('')

      // Plugin in-app updater state
      const [updateState, setUpdateState] = React.useState({
        checking: false,
        updating: false,
        currentVersion: '0.8.3',
        latestVersion: '',
        updateAvailable: false,
        canAutoUpdate: true,
        error: '',
        notice: '',
      })

      const checkUpdate = React.useCallback(async () => {
        setUpdateState((s) => ({ ...s, checking: true, error: '' }))
        try {
          const res = await fetch(UPDATE_PATH)
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const data = await res.json().catch(() => ({}))
          setUpdateState((s) => ({
            ...s,
            checking: false,
            currentVersion: data.currentVersion || s.currentVersion,
            latestVersion: data.latestVersion || '',
            updateAvailable: Boolean(data.updateAvailable),
            canAutoUpdate: data.canAutoUpdate !== false,
          }))
        } catch (e) {
          setUpdateState((s) => ({ ...s, checking: false }))
        }
      }, [])

      React.useEffect(() => {
        if (open) checkUpdate()
      }, [open, checkUpdate])

      async function handleTriggerUpdate() {
        if (updateState.updating) return
        setUpdateState((s) => ({ ...s, updating: true, error: '', notice: '' }))
        try {
          const res = await fetch(UPDATE_PATH, {
            method: 'POST',
            headers: { 'x-dsh-plugin-update': '1' },
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok || data.ok === false || data.error) {
            throw new Error(data.error || ('HTTP ' + res.status))
          }
          const newVer = data.updatedVersion || updateState.latestVersion || updateState.currentVersion
          setUpdateState((s) => ({
            ...s,
            updating: false,
            updateAvailable: false,
            currentVersion: newVer,
            notice: t('update.done', { version: newVer }),
          }))
          setTimeout(() => checkUpdate(), 2000)
        } catch (err) {
          setUpdateState((s) => ({
            ...s,
            updating: false,
            error: t('update.failed', { error: String(err.message || err) }),
          }))
        }
      }

      const settingsScope = getSettingsScope(ctx)
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

      const fetchDiag = React.useCallback(() => {
        fetch(STATE_PATH, { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setDiagState(data) })
          .catch(() => {})
      }, [])

      React.useEffect(() => {
        if (!open) return
        fetchDiag()
      }, [open, fetchDiag])

      const status = (snapshot && snapshot.status) || 'loading'
      const stored = (snapshot && snapshot.value) || {}

      React.useEffect(() => {
        if (status === 'ready' && draft === null) {
          setDraft({
            currency: stored.currency !== undefined ? String(stored.currency) : '$',
            usdRate: stored.usdRate !== undefined ? String(stored.usdRate) : '1',
            budgetThreshold: stored.budgetThreshold !== undefined ? String(stored.budgetThreshold) : '0',
            displayTimeZone: stored.displayTimeZone !== undefined ? String(stored.displayTimeZone) : 'Europe/Moscow',
            useOpenRouter: stored.useOpenRouter !== undefined ? Boolean(stored.useOpenRouter) : true,
            refreshHours: stored.refreshHours !== undefined ? String(stored.refreshHours) : '24',
          })
        }
      }, [status, stored, draft])

      const tzValid = draft ? isValidTimeZone(draft.displayTimeZone) : true
      const rateValid = draft ? (!isNaN(Number(draft.usdRate)) && Number(draft.usdRate) > 0) : true
      const budgetValid = draft ? (!isNaN(Number(draft.budgetThreshold)) && Number(draft.budgetThreshold) >= 0) : true
      const hoursValid = draft ? (!isNaN(Number(draft.refreshHours)) && Number(draft.refreshHours) >= 1 && Number(draft.refreshHours) <= 168) : true

      const handleManualSync = async () => {
        if (syncing) return
        setSyncing(true)
        setSyncMsg('')
        try {
          const res = await fetch(REFRESH_PATH, { method: 'POST', headers: { accept: 'application/json' } })
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}))
            const retryAfter = data.retryAfter || 30
            setSyncMsg(t('action.sync_rate_limited', { seconds: retryAfter }))
          } else if (res.ok) {
            setSyncMsg(t('action.sync_ok'))
            fetchDiag()
          } else {
            setSyncMsg(t('action.sync_err'))
          }
        } catch (_) {
          setSyncMsg(t('action.sync_err'))
        } finally {
          setSyncing(false)
          setTimeout(() => setSyncMsg(''), 4000)
        }
      }

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

        const budgetNum = Number(String(draft.budgetThreshold).trim())
        if (!Number.isFinite(budgetNum) || budgetNum < 0) {
          broken.push('budgetThreshold: must be non-negative')
        } else {
          try {
            await scope.set('budgetThreshold', budgetNum)
          } catch (e) { broken.push('budgetThreshold: ' + (e && e.message || String(e))) }
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

      // Row seat (plugins.row.config): the host page draws title/icon/crumb and the
      // padding, so the summary is a one-liner and the page drops our card chrome.
      if (props && props.view === 'summary') {
        return React.createElement('span', { className: 'dcm-sub' }, t('header.sub'))
      }

      return React.createElement(page ? 'div' : 'li', { className: page ? 'dcm-page' : 'dcm-card' },
        React.createElement('button', {
          type: 'button', className: 'dcm-head', style: page ? { display: 'none' } : undefined, 'aria-expanded': page ? true : open,
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
              catalogHasErr && modelsCount ? React.createElement('span', { className: 'dcm-badge dcm-badge-warn' }, t('badge.catalog_stale')) : null,
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
                  // In-app Update Bar
                  React.createElement('div', {
                    className: 'dcm-section-card',
                    style: { padding: '10px 14px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                  },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } },
                      React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontWeight: 500 } },
                        'v' + updateState.currentVersion
                      ),
                      updateState.checking
                        ? React.createElement('span', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12 } }, t('update.checking'))
                        : updateState.updateAvailable
                          ? React.createElement('span', { className: 'dcm-badge dcm-badge-warn' },
                              t('update.available', { latestVersion: updateState.latestVersion, currentVersion: updateState.currentVersion })
                            )
                          : React.createElement('span', { className: 'dcm-badge dcm-badge-ok' },
                              '✓ ' + t('update.up_to_date')
                            )
                    ),
                    updateState.updateAvailable
                      ? React.createElement('button', {
                          type: 'button',
                          className: 'dcm-btn dcm-btn-primary',
                          disabled: updateState.updating,
                          onClick: handleTriggerUpdate,
                          style: { padding: '4px 10px', fontSize: 12 },
                        }, updateState.updating ? t('update.updating') : t('update.btn'))
                      : null
                  ),
                  updateState.notice ? React.createElement('div', { className: 'dcm-alert dcm-alert-ok' }, '✓ ' + updateState.notice) : null,
                  updateState.error ? React.createElement('div', { className: 'dcm-alert dcm-alert-err' }, updateState.error) : null,

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
                    React.createElement('div', { className: 'dcm-grid-2' },
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.budgetThreshold')),
                        React.createElement('input', {
                          className: 'dcm-input' + (budgetValid ? '' : ' dcm-input-err'),
                          type: 'number',
                          step: 'any',
                          min: 0,
                          value: (draft && draft.budgetThreshold) !== undefined ? draft.budgetThreshold : '',
                          onChange: (e) => setDraft({ ...draft, budgetThreshold: e.target.value }),
                        }),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.budgetThreshold')),
                      ),
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.displayTimeZone')),
                        React.createElement('input', {
                          className: 'dcm-input' + (tzValid ? '' : ' dcm-input-err'),
                          value: (draft && draft.displayTimeZone) !== undefined ? draft.displayTimeZone : '',
                          onChange: (e) => setDraft({ ...draft, displayTimeZone: e.target.value }),
                        }),
                        React.createElement('span', { className: 'dcm-hint' },
                          tzValid ? t('hint.displayTimeZone') : t('tz.invalid')
                        ),
                      ),
                    ),
                  ),

                  // Section 2: OpenRouter Pricing Catalog
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' },
                      React.createElement('span', null, t('section.openrouter')),
                      openRouterEnabled
                        ? React.createElement('button', {
                            type: 'button',
                            className: 'dcm-btn dcm-btn-sm',
                            disabled: syncing,
                            onClick: handleManualSync,
                          }, syncing ? t('action.syncing') : t('action.sync_now'))
                        : null
                    ),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.openrouter_desc')),
                    syncMsg ? React.createElement('div', { className: 'dcm-alert dcm-alert-ok', style: { padding: '6px 10px', fontSize: 12 } }, syncMsg) : null,
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
                          diagState ? ago(diagState.fetchedAt, locale) : '—'
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
                      disabled: saving || !tzValid || !rateValid || !budgetValid || !hoursValid,
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
      const windows = (schedule && schedule.windows) || []
      if (!windows.length) return null
      const now = ratesAt(schedule, minute)
      const transitions = new Set()
      for (const w of windows) {
        transitions.add(w.start % DAY)
        transitions.add(w.end % DAY)
      }
      let minDiff = null
      for (const t of transitions) {
        let diff = (t - minute + DAY) % DAY
        if (diff === 0) diff = DAY
        const probe = ratesAt(schedule, (minute + diff) % DAY)
        if (probe.output !== now.output || probe.input !== now.input) {
          if (minDiff === null || diff < minDiff) minDiff = diff
        }
      }
      return minDiff
    }

    const extremesMemo = new WeakMap()
    function extremes(schedule) {
      if (!schedule) return { low: {}, high: {}, flat: true }
      if (extremesMemo.has(schedule)) return extremesMemo.get(schedule)

      const base = schedule.base || { cacheHit: 0, input: 0, cacheWrite: 0, output: 0 }
      const candidates = [base]
      for (const w of (schedule.windows || [])) {
        if (w.rates) candidates.push(w.rates)
      }

      let low = candidates[0]
      let high = candidates[0]
      for (const r of candidates) {
        if (r.output < low.output) low = r
        if (r.output > high.output) high = r
      }

      const res = { low, high, flat: low.output === high.output }
      extremesMemo.set(schedule, res)
      return res
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
        return new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone,
        }).format(d)
      } catch {
        return hhmm(minute)
      }
    }

    function zoneLabel(zone) {
      if (!zone) return 'UTC'
      const city = zone.includes('/') ? zone.slice(zone.lastIndexOf('/') + 1) : zone
      return city.replace(/_/g, ' ')
    }

    // ------------------------------------------------------------ CostMeter

    function CostMeter(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'zh' ? zh : en, en)
      const useProjection = props.useProjection
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const byModel = useProjection ? useProjection('costByModel') : undefined
      const [state, setState] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => new Date())
      const [copied, setCopied] = React.useState(false)
      const [showAllModels, setShowAllModels] = React.useState(false)
      const box = React.useRef(null)

      React.useEffect(() => { ensureStyles() }, [])

      const settingsScope = getSettingsScope(ctx)
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
      const budgetThreshold = stored.budgetThreshold !== undefined ? Number(stored.budgetThreshold) : (Number(state.budgetThreshold) || 0)
      const schedule = state.schedule
      const hasUsage = usage !== undefined && usage !== null
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()

      if (!schedule) {
        return h('div', { ref: box, style: { position: 'relative' } }, [
          h('button', {
            key: 'chip', type: 'button',
            className: 'dcm-chip',
            onClick: () => setOpen((v) => !v), title: t('chipUnknown'),
          }, [
            h('span', { key: 'dot', className: 'dcm-dot dcm-dot-idle' }),
            h('span', { key: 'txt' }, t('chipUnknown')),
          ]),
          open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
            h('div', { key: 't', className: 'dcm-panel-title' },
              state.route ? state.route.provider + ' / ' + state.route.model : t('routeUnknown')),
            h('div', { key: 'n', className: 'dcm-panel-note' },
              state.catalogError
                ? t('catalogUnavailable') + state.catalogError
                : t('tokens.not_priced')),
          ]) : null,
        ])
      }

      const active = ratesAt(schedule, minute)
      const { low, high, flat } = extremes(schedule)
      const cheapNow = !flat && active.output === low.output
      const leftMinutes = minutesUntilChange(schedule, minute)
      const left = clock(leftMinutes)

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

      // Check budget threshold in USD
      const totalUsd = fx > 0 ? total / fx : total
      const budgetExceeded = budgetThreshold > 0 && totalUsd >= budgetThreshold

      // Dot indicator status class
      const dotClass = budgetExceeded
        ? 'dcm-dot dcm-dot-err'
        : (flat ? 'dcm-dot dcm-dot-idle' : (cheapNow ? 'dcm-dot dcm-dot-ok' : 'dcm-dot dcm-dot-warn'))

      const activeCell = { textAlign: 'right', padding: '3px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--dsw-alias-state-brand-primary) 12%, transparent)', color: 'var(--dsw-alias-state-brand-primary)', fontWeight: 600 }

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

      // Calculate cache savings amount
      let cacheSavedAmount = 0
      let cacheSavedPercent = 0
      if (hasUsage && usage && Number(usage.cacheReadTokens) > 0 && active.input > active.cacheHit) {
        const tokensRead = Number(usage.cacheReadTokens)
        const missedCost = (tokensRead / 1e6) * active.input
        const hitCost = (tokensRead / 1e6) * active.cacheHit
        cacheSavedAmount = Math.max(0, (missedCost - hitCost) * fx)
        cacheSavedPercent = missedCost > 0 ? Math.round(((missedCost - hitCost) / missedCost) * 100) : 0
      }

      // Copy summary report to clipboard
      const copyReport = () => {
        const lines = [
          '=== ' + (state.route ? state.route.model : 'Cost Meter Report') + ' ===',
          t('tokens.session_total') + ' ' + (hasUsage ? money(total, currency) : '—') + (budgetThreshold > 0 ? ' (limit: ' + money(budgetThreshold * fx, currency) + ')' : ''),
          'Tier: ' + (flat ? 'Flat' : (cheapNow ? t('offpeak') : t('peak'))),
          'Rates (1M): input ' + rate(active.input) + ', output ' + rate(active.output) + ', cache ' + rate(active.cacheHit),
        ]
        if (cacheSavedAmount > 0) {
          lines.push('Cache saved: ≈ ' + money(cacheSavedAmount, currency) + ' (' + cacheSavedPercent + '%)')
        }
        if (hasUsage && usage) {
          lines.push('Tokens: in ' + tokens(usage.inputTokens) + ', out ' + tokens(usage.outputTokens) + ', cache hit ' + tokens(usage.cacheReadTokens))
        }
        const text = lines.join('\n')
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }).catch(() => {})
        } else {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }

      // Calculate upcoming discount hint
      let discountHint = null
      if (!flat && !cheapNow && leftMinutes) {
        const nextTimeMinutes = (minute + leftMinutes) % DAY
        const clockTime = hhmmInZone(nextTimeMinutes, zone, now)
        discountHint = t('savings.hint', {
          time: left,
          clock: clockTime,
          zone: zl,
        })
      }

      // Display models with collapse support if > 3 models
      const visibleModels = (perModel.length
        ? perModel
        : (state.route ? [{ key: state.route.provider + '/' + state.route.model, model: state.route.model, known: Boolean(schedule), cost: 0 }] : [])
      )
      const shouldCollapse = visibleModels.length > 3 && !showAllModels
      const renderedModels = shouldCollapse ? visibleModels.slice(0, 3) : visibleModels

      return h('div', { ref: box, style: { position: 'relative' } }, [
        h('button', {
          key: 'chip', type: 'button',
          className: 'dcm-chip',
          onClick: () => setOpen((v) => !v),
          title: budgetExceeded
            ? t('budget.exceeded', { limit: money(budgetThreshold * fx, currency) })
            : (flat ? 'Flat tariff' : cheapNow ? t('offpeak') : t('peak')),
        }, [
          h('span', { key: 'dot', className: dotClass }),
          h('span', { key: 'sum' }, hasUsage ? '≈ ' + money(total, currency) : '—'),
          left ? h('span', { key: 'left', className: 'dcm-chip-timer' }, left) : null,
        ]),

        open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
          h('div', { key: 'title', className: 'dcm-panel-title' }, [
            h('span', { key: 'model-name' }, state.route ? state.route.model : 'model'),
            flat ? null : h('span', { key: 'tier', style: { fontSize: 11.5, opacity: 0.85 } }, cheapNow ? t('offpeak') : t('peak')),
          ]),

          h('div', { key: 'note', className: 'dcm-panel-note' },
            flat
              ? 'Flat rate schedule'
              : (cheapNow ? 'Discounted rate active' : 'Full rate active') +
                (left ? ' · change in ' + left : '')),

          flat
            ? null
            : h('div', { key: 'clock', className: 'dcm-panel-note' },
                t('peak') + ': ' + windowText + ' ' + zl + ' · now ' + nowLocal + ' ' + zl),

          discountHint ? h('div', { key: 'savings-box', className: 'dcm-tip-box', style: { marginTop: 6 } }, discountHint) : null,

          cacheSavedAmount > 0
            ? h('div', { key: 'cache-saved-box', className: 'dcm-cache-box', style: { marginTop: 6 } },
                t('savings.cache_saved', { amount: money(cacheSavedAmount, currency), percent: cacheSavedPercent }))
            : null,

          budgetExceeded ? h('div', { key: 'budget-warn', className: 'dcm-alert dcm-alert-err', style: { marginTop: 6, padding: '6px 10px', fontSize: 11 } },
            t('budget.exceeded', { limit: money(budgetThreshold * fx, currency) })) : null,

          h('hr', { key: 'hr1', className: 'dcm-hr' }),

          h('div', { key: 'rates', className: flat ? 'dcm-panel-grid-flat' : 'dcm-panel-grid' }, [
            h('div', { key: 'h0', className: 'dcm-th' }, t('rate.per_1m')),
            flat ? null : h('div', { key: 'h1', className: 'dcm-th-num' }, t('offpeak')),
            h('div', { key: 'h2', className: 'dcm-th-num' }, flat ? 'rate' : t('peak')),
            rateRow(t('rate.cache_hit'), 'cacheHit'),
            rateRow(t('rate.input'), 'input'),
            showCacheWrite ? rateRow(t('rate.cache_write'), 'cacheWrite') : null,
            rateRow(t('rate.output'), 'output'),
          ]),

          h('hr', { key: 'hr2', className: 'dcm-hr' }),

          multiModel
            ? null
            : [
                h('div', { key: 'btitle', className: 'dcm-section-lbl' }, t('tokens.session')),
                h('div', { key: 'breakdown', className: 'dcm-panel-grid-3' }, [
                  h('div', { key: 'b0', className: 'dcm-th' }, t('tokens.tokens_col')),
                  h('div', { key: 'b1', className: 'dcm-th-num' }, ''),
                  h('div', { key: 'b2', className: 'dcm-th-num' }, currency),
                  spentRow(t('rate.cache_hit'), 'cacheReadTokens', 'cacheHit'),
                  spentRow(t('rate.input'), 'uncachedInputTokens', 'input'),
                  showCacheWrite ? spentRow(t('rate.cache_write'), 'cacheWriteTokens', 'cacheWrite') : null,
                  spentRow(t('rate.output'), 'outputTokens', 'output'),
                ]),
                h('hr', { key: 'hr-models', className: 'dcm-hr' }),
              ],

          h('div', { key: 'mtitle', className: 'dcm-section-lbl' }, t('tokens.models_spent')),
          h(
            'div',
            { key: 'models-list', style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            renderedModels.map((m) =>
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
                    m.known ? (hasUsage ? money(m.cost, currency) : '—') : t('tokens.not_priced'),
                  ),
                ],
              ),
            ),
          ),

          visibleModels.length > 3
            ? h('button', {
                key: 'toggle-models',
                type: 'button',
                className: 'dcm-accordion-btn',
                onClick: () => setShowAllModels((v) => !v),
              }, shouldCollapse ? t('models.show_more', { count: visibleModels.length }) : t('models.show_less'))
            : null,

          h('hr', { key: 'hr3', className: 'dcm-hr' }),

          h('div', { key: 'total', className: 'dcm-total' }, [
            h('span', { key: 'l' }, t('tokens.session_total')),
            h('span', { key: 'v' }, hasUsage ? '≈ ' + money(total, currency) : '—'),
          ]),

          hasUsage ? null : h('div', { key: 'nodata', className: 'dcm-panel-note', style: { paddingTop: 6 } },
            t('tokens.no_usage_yet')),

          h('div', { key: 'footer-actions', style: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 } },
            h('button', {
              type: 'button',
              className: 'dcm-btn dcm-btn-sm',
              onClick: copyReport,
            }, copied ? t('action.copied') : t('action.copy_report'))
          ),
        ]) : null,
      ])
    }

    function apply(ctx) {
      const registerDictionaries = () => {
        try {
          // ctx.locale.register(NS, { en, zh }) is canonical form in DSH
          return ctx.locale.register(NS, { en, zh })
        } catch (err) {
          if (ctx?.logger?.warn) {
            ctx.logger.warn(`[dsh-cost-meter] locale register failed: ${err?.message || err}`)
          }
          return () => {}
        }
      }

      if (ctx.locale && typeof ctx.locale.register === 'function') {
        if (typeof ctx.effect === 'function') {
          ctx.effect(() => {
            const undo = registerDictionaries()
            return () => {
              try {
                if (typeof undo === 'function') undo()
              } catch (e) {
                if (ctx?.logger?.debug) ctx.logger.debug('[dsh-cost-meter] locale undo error: ' + (e?.message || e))
              }
            }
          }, 'dsh-cost-meter: locale dictionaries')
        } else {
          registerDictionaries()
        }
      }

      if (typeof ctx.effect === 'function') {
        ctx.effect(
          () => refreshMirrorUntilVisible(ctx),
          'dsh-cost-meter: refresh settings mirror',
        )
      } else {
        refreshMirrorUntilVisible(ctx)
      }

      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        ctx.slots.inject('conversation.session.header.utilities', () =>
          ctx.slots.register(
            { name: 'conversation.session.header.utilities', id: 'dsh-cost-meter', order: 10, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(CostMeter, { ...p, ctx: (p && p.ctx) || ctx })),
          ),
        )

        // Row seat first (the seat the current core renders), legacy seat kept below.
        ctx.slots.inject('plugins.row.config', () =>
          ctx.slots.register(
            { name: 'plugins.row.config', key: ROW_CONFIG_KEY, locale: NS, order: 20, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(CostMeterCard, { ...p, ctx: (p && p.ctx) || ctx })),
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

    module.exports = {
      apply,
      inject: ['slots', 'locale', 'settingsScope'],
      CostMeterCard,
      CostMeter,
      ErrorBoundary,
      ensureStyles,
      minutesUntilChange,
      extremes,
      ratesAt,
    }
    return module.exports
  },
})
