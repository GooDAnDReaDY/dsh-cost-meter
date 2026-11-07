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
      'section.visibility': 'Widget Visibility & Privacy',
      'section.visibility_desc': 'Configure widget visibility in the conversation header and messages, or enable privacy mode',
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
            'action.export_csv': 'Export CSV',
      'action.export_json': 'Export JSON',
      'action.export_png': 'PNG Card',
      'action.exporting_png': 'Generating…',
      'action.exported': 'Downloaded!',
      'curr.select': 'Currency',
      'action.copy_report': 'Copy Summary',
      'action.copied': 'Copied!',
            'alert.pre_switch_peak': '⚠️ Peak tariff starts in {time} (higher rates)',
      'alert.pre_switch_offpeak': '🎉 Off-peak discount starts in {time} (-50% savings)',
      'section.alerts': 'Tariff Transition Alerts',
      'section.alerts_desc': 'Visual pulse and pre-switch alerts before peak and off-peak rate changes',
      'field.alertBeforeSwitch': 'Pre-Switch Tariff Alerts',
      'hint.alertBeforeSwitch': 'Show visual pulse on chip and alert banner before rate transitions.',
      'field.alertLeadMinutes': 'Alert Lead Time (minutes)',
      'hint.alertLeadMinutes': 'Minutes before tariff switch to activate pre-switch alert (1 to 30).',
      'field.browserNotifications': 'Desktop Notifications',
      'hint.browserNotifications': 'Send HTML5 browser notification on tariff transitions when tab is in background.',
      'action.test_notification': 'Test Notification',
      'action.tested_notification': 'Notification Sent!',
      'turn.action_btn': 'Turn tokens',
      'turn.modal_title': 'Message Token & Cost Inspector',
      'turn.tokens_total': 'Turn Tokens',
      'turn.cost_title': 'Turn Cost',
      'turn.reasoning': 'Thinking / Reasoning',
      'context.title': 'Context Window',
      'context.saturation': 'Context Saturation',
      'context.risk_low': 'Healthy',
      'context.risk_moderate': 'Moderate',
      'context.risk_high': 'Compaction Risk',
      'context.next_turn': 'Next turn base: ≈ {cost}',
      'context.compaction_warning': 'Context saturation over 80%. High compaction and prompt fee risk.',
      'velocity.alert_title': 'Cost Velocity Alert: Rapid Spending',
      'velocity.alert_desc': 'High spending rate ({velocity}/min, ~{stepCost}/step). Check for autonomous loops or massive prompts.',
      'velocity.alert_tooltip': 'Alert: High spending velocity ({rate}/min)!',
      'velocity.speed_label': 'Velocity:',
      'velocity.per_minute': '/min',
      'ring.progress_title': 'Session Budget / Context Usage',
      'anatomy.title': 'Prompt Anatomy',
      'anatomy.system': 'System',
      'anatomy.tools': 'Tools',
      'anatomy.history': 'History',
      'anatomy.attachments': 'Attachments',
      'simulator.title': 'Model Cost Simulator',
      'simulator.desc': 'Cost for same tokens across models:',
      'simulator.savings_vs_sonnet': 'Saved {savings} ({pct}%) vs Claude 3.5 Sonnet',
      'chart.burn_rate_title': 'Token Burn Trajectory',
      'chart.turn': 'Turn',
      'chart.tokens': 'tokens',
      'chart.spike': 'Spike',
      'waste.alert_title': 'Redundant Token Waste Detected',
      'waste.alert_desc': 'Found ≈{tokens} duplicate/unaltered tokens across steps (~{cost} wasted). Consider pruning output or compacting context.',
      'waste.recommendation_compact': 'Recommendation: Use /compact or clear conversation to stop budget leakage.',
      'waste.recommendation_prune': 'Recommendation: Prune large repeated command outputs from chat history.',

      'privacy.toggle': 'Streamer / Privacy Mode',
      'privacy.enabled': 'Privacy mode active (amounts masked)',
      'field.privacyMode': 'Privacy / Streamer Mode',
      'hint.privacyMode': 'Mask currency amounts with asterisks to safely share screens or recordings.',
      'field.showHeaderChip': 'Show Cost Chip in Header',
      'hint.showHeaderChip': 'Display the live cost meter chip in the chat conversation header.',
      'field.showMessageAction': 'Show Token Inspector on Messages',
      'hint.showMessageAction': 'Display the lightning token inspector button on assistant messages.',
      'notice.hidden_access': 'Cost metering is active in background. Full statistics and session data remain available in this settings panel and via the /cost command.',

      'turn.cache_hit_rate': 'Cache Hit',
      'turn.duration': 'Duration',
      'turn.uncached_in': 'Uncached Input',
      'turn.cache_read': 'Cache Read',
      'turn.output': 'Output',
      'turn.history_title': 'Turn History & Inspector',
      'turn.show_history': 'Show turn history',
      'turn.hide_history': 'Hide turn history',
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
      'sparkline.title': 'Turn dynamics',
      'sparkline.steps': 'steps',
      'projection.burn_rate': 'Burn rate:',
      'projection.projected': 'Projected:',
      'projection.per_hour': '/hr',
      'field.displayMode': 'Display mode',
      'hint.displayMode': 'Widget display mode: auto (collapses on mobile <= 768px), full, or always compact.',
      'mode.auto': 'Auto (responsive)',
      'mode.full': 'Full',
      'mode.compact': 'Compact pill',
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
      'section.visibility': '组件显示与隐私设置',
      'section.visibility_desc': '配置对话顶部与消息栏组件的显示状态，或开启隐私保护模式',
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
            'action.export_csv': '导出 CSV',
      'action.export_json': '导出 JSON',
      'action.export_png': '生成图片卡片',
      'action.exporting_png': '生成中…',
      'action.exported': '已下载！',
      'curr.select': '货币',
      'action.copy_report': '复制消费报告',
      'action.copied': '已复制！',
            'alert.pre_switch_peak': '⚠️ 高峰期计费将在 {time} 后开始（标准费率）',
      'alert.pre_switch_offpeak': '🎉 特惠期将在 {time} 后开始（5折优惠）',
      'section.alerts': '费率切换预警',
      'section.alerts_desc': '在高峰期与特惠期费率切换前显示脉冲提醒与横幅',
      'field.alertBeforeSwitch': '费率切换预警',
      'hint.alertBeforeSwitch': '在费率切换前在状态芯片上显示脉冲光晕与提示横幅。',
      'field.alertLeadMinutes': '预警提前时间（分钟）',
      'hint.alertLeadMinutes': '在费率切换前提前多少分钟发出预警（1 至 30 分钟）。',
      'field.browserNotifications': '桌面系统通知',
      'hint.browserNotifications': '在费率切换时发送 HTML5 桌面通知（后台标签页亦有效）。',
      'action.test_notification': '测试通知',
      'action.tested_notification': '通知已发送！',
      'turn.action_btn': 'Token 详情',
      'turn.modal_title': '单次回复 Token 与成本详情',
      'turn.tokens_total': '本轮 Token 总量',
      'turn.cost_title': '单次成本',
      'turn.reasoning': '思考推理 Token',
      'context.title': '上下文窗口',
      'context.saturation': '上下文饱和度',
      'context.risk_low': '充足',
      'context.risk_moderate': '适中',
      'context.risk_high': '压缩风险',
      'context.next_turn': '下轮基础成本：≈ {cost}',
      'context.compaction_warning': '上下文占用超过 80%，存在压缩丢忆与费用激增风险。',
      'velocity.alert_title': '费用增速告警：消耗速度过快',
      'velocity.alert_desc': '费用增速过高（{velocity}/分钟，约 {stepCost}/步）。请检查智能体是否陷入死循环或发送超长上下文。',
      'velocity.alert_tooltip': '告警：费用增长过快（{rate}/分钟）！',
      'velocity.speed_label': '消耗速率:',
      'velocity.per_minute': '/分钟',
      'ring.progress_title': '会话预算 / 上下文占用进度',
      'anatomy.title': '提示词结构分析 (Prompt Anatomy)',
      'anatomy.system': '系统提示 (System)',
      'anatomy.tools': '工具声明 (Tools)',
      'anatomy.history': '历史消息 (History)',
      'anatomy.attachments': '上下文/当前 (Attachments)',
      'simulator.title': '模型成本模拟器',
      'simulator.desc': '相同 Token 在各主流模型上的费用预估：',
      'simulator.savings_vs_sonnet': '相比 Claude 3.5 Sonnet 节省 {savings} ({pct}%)',
      'chart.burn_rate_title': 'Token 消耗轨迹',
      'chart.turn': '轮次',
      'chart.tokens': '个 Token',
      'chart.spike': '突增',
      'waste.alert_title': '检测到重复上下文浪费',
      'waste.alert_desc': '在连续轮次中发现约 {tokens} 重复未变动 Token（浪费约 {cost}）。建议裁剪输出或压缩上下文。',
      'waste.recommendation_compact': '优化建议：使用 /compact 或清理上下文以防止持续扣费。',
      'waste.recommendation_prune': '优化建议：清理历史中重复的大段命令输出或文件转储。',

      'privacy.toggle': '主播/隐私模式',
      'privacy.enabled': '隐私模式已开启（金额已隐藏）',
      'field.privacyMode': '隐私/主播模式',
      'hint.privacyMode': '隐藏所有金额显示（替换为星号），便于录屏、直播或截图分享。',
      'field.showHeaderChip': '在顶部显示消费小组件',
      'hint.showHeaderChip': '在对话顶部标题栏显示实时费用与费率倒计时小组件。',
      'field.showMessageAction': '在单条消息旁显示 Token 详情按钮',
      'hint.showMessageAction': '在助手回复的消息操作栏中显示闪电 Token 详情按钮。',
      'notice.hidden_access': '后台费用计量与记录正常运行。即使隐藏顶部组件，仍可在此设置面板或通过 /cost 命令随时查看完整统计。',

      'turn.cache_hit_rate': '缓存命中率',
      'turn.duration': '耗时',
      'turn.uncached_in': '未命中输入',
      'turn.cache_read': '命中缓存读取',
      'turn.output': '模型输出',
      'turn.history_title': '轮次明细与检查器',
      'turn.show_history': '展开轮次明细',
      'turn.hide_history': '收起轮次明细',
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
      'sparkline.title': '步骤动态',
      'sparkline.steps': '步',
      'projection.burn_rate': '消耗速率：',
      'projection.projected': '预估总计：',
      'projection.per_hour': '/小时',
      'field.displayMode': '显示模式',
      'hint.displayMode': '计量器外观模式：自动（<=768px 移动端自适应折叠）、完整或始终紧凑。',
      'mode.auto': '自动自适应',
      'mode.full': '完整显示',
      'mode.compact': '紧凑药丸',
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
@media (max-width: 768px) {
  .dcm-chip-timer { display: none; }
  .dcm-panel { width: min(320px, calc(100vw - 32px)); right: 0; }
}
.dcm-chip-compact .dcm-chip-timer { display: none !important; }

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
.dcm-sparkline-box { margin: 6px 0; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 60%, transparent); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-sparkline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.dcm-sparkline-count { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dcm-sparkline-svg { width: 100%; height: 36px; display: block; overflow: visible; }
.dcm-spark-bar { fill: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 45%, transparent); transition: fill .15s ease; cursor: pointer; }
.dcm-spark-bar:hover { fill: var(--dsw-alias-state-brand-primary); }
.dcm-spark-peak { fill: var(--dsw-alias-state-brand-primary); }
.dcm-proj-box { margin: 6px 0; padding: 6px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 6%, transparent); display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
.dcm-proj-item { display: inline-flex; align-items: center; gap: 4px; }
.dcm-proj-val { font-weight: 600; color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }

.dcm-odometer { display: inline-block; font-variant-numeric: tabular-nums; transition: transform 0.15s ease-out; }
@media (prefers-reduced-motion: reduce) { .dcm-odometer { transition: none !important; } }
.dcm-context-gauge { margin: 8px 0; padding: 8px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 60%, transparent); border: 1px solid var(--dsw-alias-border-l2); display: flex; flex-direction: column; gap: 5px; }
.dcm-context-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
.dcm-context-bar-bg { width: 100%; height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 90%, transparent); overflow: hidden; }
.dcm-context-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease-out; }
.dcm-context-footer { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.dcm-risk-badge { padding: 1px 5px; border-radius: 8px; font-size: 10px; font-weight: 500; }
.dcm-risk-low { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 15%, transparent); color: var(--dsw-alias-state-success-primary); }
.dcm-risk-moderate { background: color-mix(in srgb, var(--dsw-alias-state-warning-primary) 15%, transparent); color: var(--dsw-alias-state-warning-primary); }
.dcm-risk-high { background: color-mix(in srgb, var(--dsw-alias-state-danger-primary) 15%, transparent); color: var(--dsw-alias-state-danger-primary); }


.dcm-chip-alert-peak { box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-warning-primary) 50%, transparent); animation: dcm-pulse-peak 2s infinite ease-in-out; }
.dcm-chip-alert-offpeak { box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent); animation: dcm-pulse-offpeak 2s infinite ease-in-out; }
@keyframes dcm-pulse-peak { 0%, 100% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-warning-primary) 30%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-warning-primary) 70%, transparent); } }
@keyframes dcm-pulse-offpeak { 0%, 100% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, transparent); } }
.dcm-alert-banner { display: flex; align-items: center; gap: 6px; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; line-height: 1.35; margin-top: 6px; }
.dcm-alert-banner-peak { background: color-mix(in srgb, var(--dsw-alias-state-warning-primary) 12%, transparent); color: var(--dsw-alias-state-warning-primary); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary) 28%, transparent); }
.dcm-alert-banner-offpeak { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); color: var(--dsw-alias-state-success-primary); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent); }
.dcm-msg-action-btn { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: 1px solid var(--dsw-alias-border-l2); padding: 2px 7px; border-radius: 5px; font-size: 11px; cursor: pointer; color: var(--dsw-alias-label-secondary); transition: all .15s ease; user-select: none; }
.dcm-msg-action-btn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-state-brand-primary); background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 8%, transparent); }
.dcm-inspector-modal { position: fixed; inset: 0; z-index: 99999; background: color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
.dcm-inspector-card { background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base)); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; max-width: 420px; width: 100%; box-shadow: var(--dsw-alias-shadow-layer-3, 0 16px 36px var(--dsw-alias-bg-base)); padding: 16px; font-size: 12px; }
.dcm-inspector-title { font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.dcm-inspector-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.dcm-inspector-stat { padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-inspector-stat-lbl { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-bottom: 2px; }
.dcm-inspector-stat-val { font-size: 13.5px; font-weight: 600; color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.dcm-turn-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; max-height: 180px; overflow-y: auto; }
.dcm-turn-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent); font-size: 11px; }
.dcm-curr-switcher { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 80%, transparent); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-curr-btn { appearance: none; background: transparent; border: 0; padding: 2px 7px; border-radius: 4px; font-size: 11.5px; font-weight: 500; color: var(--dsw-alias-label-secondary); cursor: pointer; transition: all .15s ease; user-select: none; }
.dcm-curr-btn:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.dcm-curr-btn-active { background: var(--dsw-alias-label-primary) !important; color: var(--dsw-alias-bg-layer-3) !important; font-weight: 600; }
.dcm-export-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; justify-content: flex-end; }
.dcm-ring-svg { display: inline-block; vertical-align: middle; flex-shrink: 0; }
.dcm-ring-track { fill: none; stroke: color-mix(in srgb, currentColor 18%, transparent); stroke-width: 1.5; }
.dcm-ring-progress { fill: none; stroke-width: 1.8; stroke-linecap: round; transform-origin: 50% 50%; transform: rotate(-90deg); transition: stroke-dashoffset 0.4s ease-out; }
.dcm-ring-center { transition: fill 0.2s ease; }
.dcm-dot-pulse-danger { animation: dcmPulse 1.2s infinite ease-in-out; }
.dcm-ring-pulse-danger { filter: drop-shadow(0 0 3px color-mix(in srgb, var(--dsw-alias-state-danger-primary) 60%, transparent)); }
.dcm-chip-runaway { box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-danger-primary) 50%, transparent); animation: dcm-pulse-runaway 1.5s infinite ease-in-out; }
@keyframes dcm-pulse-runaway { 0%, 100% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-danger-primary) 30%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-danger-primary) 70%, transparent); } }
.dcm-velocity-banner { margin: 8px 0; border-left: 3px solid var(--dsw-alias-state-danger-primary); }
.dcm-val-danger { color: var(--dsw-alias-state-danger-primary) !important; font-weight: 600; }
.dcm-anatomy-box { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-anatomy-bar { display: flex; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 90%, transparent); margin: 6px 0; }
.dcm-anatomy-seg { height: 100%; transition: width 0.3s ease; }
.dcm-seg-system { background: var(--dsw-alias-state-brand-primary); }
.dcm-seg-tools { background: var(--dsw-alias-state-warning-primary); }
.dcm-seg-history { background: var(--dsw-alias-state-success-primary); }
.dcm-seg-attachments { background: color-mix(in srgb, var(--dsw-alias-label-secondary) 80%, transparent); }
.dcm-anatomy-legend { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.dcm-legend-item { display: inline-flex; align-items: center; gap: 4px; }
.dcm-legend-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dcm-waste-banner { margin: 8px 0; border-left: 3px solid var(--dsw-alias-state-warning-primary); background: color-mix(in srgb, var(--dsw-alias-state-warning-primary) 10%, transparent); }
.dcm-chart-box { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-sparkline-svg { width: 100%; height: 36px; overflow: visible; display: block; }
.dcm-sparkline-bar { fill: var(--dsw-alias-state-brand-primary); opacity: 0.75; transition: opacity 0.2s, fill 0.2s; cursor: pointer; }
.dcm-sparkline-bar:hover { opacity: 1; fill: var(--dsw-alias-state-brand-primary); }
.dcm-sparkline-spike { fill: var(--dsw-alias-state-warning-primary) !important; opacity: 0.9; }
.dcm-simulator-box { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent); border: 1px solid var(--dsw-alias-border-l2); }
.dcm-sim-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 11px; }
.dcm-sim-badge { font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: 500; }
.dcm-sim-badge-curr { background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 15%, transparent); color: var(--dsw-alias-state-brand-primary); }
.dcm-sim-badge-diff { color: var(--dsw-alias-label-secondary); }
.dcm-sim-savings { margin-top: 6px; padding: 5px 8px; border-radius: 6px; font-size: 10.5px; background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); color: var(--dsw-alias-state-success-primary); font-weight: 500; display: flex; align-items: center; gap: 4px; }
@keyframes dcmPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

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
      return (ctx && typeof ctx.get === 'function' ? ctx.get('configForms') : null) || (ctx && ctx.configForms) || (ctx && ctx.services && ctx.services.configForms) || null
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
      return hours < 48 ? hours + (isZh ? ' 小时前' : ' hrs ago') : Math.round(hours / 24) + (isZh ? ' 天前' : ' days ago')
    }

    function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
      const { signal, ...rest } = options
      const timer = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : null
      let combined = signal
      if (timer) {
        if (signal && typeof AbortSignal.any === 'function') {
          combined = AbortSignal.any([signal, timer])
        } else if (!signal) {
          combined = timer
        }
      }
      return fetch(url, { ...rest, ...(combined ? { signal: combined } : {}) })
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
        currentVersion: '',
        latestVersion: '',
        updateAvailable: false,
        canAutoUpdate: true,
        error: '',
        notice: '',
      })

      const checkUpdate = React.useCallback(async (signal) => {
        setUpdateState((s) => ({ ...s, checking: true, error: '' }))
        try {
          const res = await fetchWithTimeout(UPDATE_PATH, { signal })
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
          if (e?.name !== 'AbortError') {
            setUpdateState((s) => ({ ...s, checking: false }))
          }
        }
      }, [])

      React.useEffect(() => {
        if (!open) return
        const controller = new AbortController()
        checkUpdate(controller.signal)
        return () => controller.abort()
      }, [open, checkUpdate])

      async function handleTriggerUpdate() {
        if (updateState.updating) return
        setUpdateState((s) => ({ ...s, updating: true, error: '', notice: '' }))
        try {
          const res = await fetchWithTimeout(UPDATE_PATH, {
            method: 'POST',
            headers: { 'x-dsh-plugin-update': '1' },
          }, 30000)
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

      const configForms = getSettingsScope(ctx)
      const scope = React.useMemo(
        () => (configForms ? configForms.get(NS) : undefined),
        [configForms],
      )

      const snapshot = React.useSyncExternalStore(
        React.useMemo(() => (cb) => (scope ? scope.subscribe(cb) : () => {}), [scope]),
        React.useCallback(() => (scope ? scope.getSnapshot() : { status: 'loading' }), [scope]),
        React.useCallback(() => ({ status: 'loading' }), []),
      )

      React.useEffect(() => { ensureStyles() }, [])

      const fetchDiag = React.useCallback((signal) => {
        fetchWithTimeout(STATE_PATH, { signal, headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setDiagState(data) })
          .catch(() => {})
      }, [])

      React.useEffect(() => {
        if (!open) return
        const controller = new AbortController()
        fetchDiag(controller.signal)
        return () => controller.abort()
      }, [open, fetchDiag])

      const status = (snapshot && snapshot.status) || 'loading'
      const stored = (snapshot && snapshot.value) || {}

      const initDraft = React.useCallback((s) => {
        const val = s || {}
        return {
          currency: val.currency !== undefined ? String(val.currency) : '$',
          usdRate: val.usdRate !== undefined ? String(val.usdRate) : '1',
          budgetThreshold: val.budgetThreshold !== undefined ? String(val.budgetThreshold) : '0',
          displayTimeZone: val.displayTimeZone !== undefined ? String(val.displayTimeZone) : 'Europe/Moscow',
          displayMode: val.displayMode !== undefined ? String(val.displayMode) : 'auto',
          alertBeforeSwitch: val.alertBeforeSwitch !== undefined ? Boolean(val.alertBeforeSwitch) : true,
          alertLeadMinutes: val.alertLeadMinutes !== undefined ? String(val.alertLeadMinutes) : '5',
          browserNotifications: val.browserNotifications !== undefined ? Boolean(val.browserNotifications) : false,
          privacyMode: val.privacyMode !== undefined ? Boolean(val.privacyMode) : false,
          showHeaderChip: val.showHeaderChip !== undefined ? Boolean(val.showHeaderChip) : true,
          showMessageAction: val.showMessageAction !== undefined ? Boolean(val.showMessageAction) : true,
          useOpenRouter: val.useOpenRouter !== undefined ? Boolean(val.useOpenRouter) : true,
          refreshHours: val.refreshHours !== undefined ? String(val.refreshHours) : '24',
        }
      }, [])

      React.useEffect(() => {
        if (status === 'ready' && draft === null) {
          setDraft(initDraft(stored))
        }
      }, [status, stored, draft, initDraft])

      const tzValid = draft ? isValidTimeZone(draft.displayTimeZone) : true
      const rateValid = draft ? (!isNaN(Number(draft.usdRate)) && Number(draft.usdRate) > 0) : true
      const budgetValid = draft ? (!isNaN(Number(draft.budgetThreshold)) && Number(draft.budgetThreshold) >= 0) : true
      const hoursValid = draft ? (!isNaN(Number(draft.refreshHours)) && Number(draft.refreshHours) >= 1 && Number(draft.refreshHours) <= 168) : true

      const handleManualSync = async () => {
        if (syncing) return
        setSyncing(true)
        setSyncMsg('')
        try {
          const res = await fetchWithTimeout(REFRESH_PATH, { method: 'POST', headers: { accept: 'application/json' } })
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
          await scope.set('displayMode', (draft.displayMode === 'compact' || draft.displayMode === 'full') ? draft.displayMode : 'auto')
        } catch (e) { broken.push('displayMode: ' + (e && e.message || String(e))) }

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
          await scope.set('alertBeforeSwitch', Boolean(draft.alertBeforeSwitch))
        } catch (e) { broken.push('alertBeforeSwitch: ' + (e && e.message || String(e))) }

        try {
          await scope.set('alertLeadMinutes', String(draft.alertLeadMinutes || '5'))
        } catch (e) { broken.push('alertLeadMinutes: ' + (e && e.message || String(e))) }

        try {
          await scope.set('browserNotifications', Boolean(draft.browserNotifications))
        } catch (e) { broken.push('browserNotifications: ' + (e && e.message || String(e))) }

        try {
          await scope.set('privacyMode', Boolean(draft.privacyMode))
        } catch (e) { broken.push('privacyMode: ' + (e && e.message || String(e))) }

        try {
          await scope.set('showHeaderChip', Boolean(draft.showHeaderChip))
        } catch (e) { broken.push('showHeaderChip: ' + (e && e.message || String(e))) }

        try {
          await scope.set('showMessageAction', Boolean(draft.showMessageAction))
        } catch (e) { broken.push('showMessageAction: ' + (e && e.message || String(e))) }

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
        (page || open) ? React.createElement('div', { className: 'dcm-body' },
          (status === 'loading' || !draft)
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
                          value: draft?.currency ?? '',
                          onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), currency: v })) },
                        }),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.currency')),
                      ),
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.usdRate')),
                        React.createElement('input', {
                          className: 'dcm-input' + (rateValid ? '' : ' dcm-input-err'),
                          type: 'number',
                          step: 'any',
                          value: draft?.usdRate ?? '',
                          onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), usdRate: v })) },
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
                          value: draft?.budgetThreshold ?? '',
                          onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), budgetThreshold: v })) },
                        }),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.budgetThreshold')),
                      ),
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.displayTimeZone')),
                        React.createElement('input', {
                          className: 'dcm-input' + (tzValid ? '' : ' dcm-input-err'),
                          value: draft?.displayTimeZone ?? '',
                          onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), displayTimeZone: v })) },
                        }),
                        React.createElement('span', { className: 'dcm-hint' },
                          tzValid ? t('hint.displayTimeZone') : t('tz.invalid')
                        ),
                      ),
                    ),
                    React.createElement('div', { className: 'dcm-field', style: { marginTop: 6 } },
                      React.createElement('label', { className: 'dcm-label' }, t('field.displayMode')),
                      React.createElement('select', {
                        className: 'dcm-input',
                        value: draft?.displayMode || 'auto',
                        onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), displayMode: v })) },
                      }, [
                        React.createElement('option', { key: 'auto', value: 'auto' }, t('mode.auto')),
                        React.createElement('option', { key: 'full', value: 'full' }, t('mode.full')),
                        React.createElement('option', { key: 'compact', value: 'compact' }, t('mode.compact')),
                      ]),
                      React.createElement('span', { className: 'dcm-hint' }, t('hint.displayMode')),
                    ),
                  ),

                  // Section: Tariff Transition Alerts (Issue #117)
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' }, t('section.alerts')),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.alerts_desc')),
                    React.createElement('div', { className: 'dcm-row-check' },
                      React.createElement('input', {
                        id: 'dcm-alert-switch',
                        type: 'checkbox',
                        className: 'dcm-check',
                        checked: Boolean(draft?.alertBeforeSwitch ?? true),
                        onChange: (e) => { const c = e.target.checked; setDraft((d) => ({ ...(d || {}), alertBeforeSwitch: c })) },
                      }),
                      React.createElement('label', { htmlFor: 'dcm-alert-switch', className: 'dcm-label', style: { cursor: 'pointer' } }, t('field.alertBeforeSwitch')),
                    ),
                    React.createElement('span', { className: 'dcm-hint', style: { marginTop: -6 } }, t('hint.alertBeforeSwitch')),
                    React.createElement('div', { className: 'dcm-grid-2', style: { marginTop: 6 } },
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.alertLeadMinutes')),
                        React.createElement('select', {
                          className: 'dcm-input',
                          value: draft?.alertLeadMinutes || '5',
                          onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), alertLeadMinutes: v })) },
                        }, [
                          React.createElement('option', { key: '1', value: '1' }, '1 min'),
                          React.createElement('option', { key: '2', value: '2' }, '2 min'),
                          React.createElement('option', { key: '5', value: '5' }, '5 min'),
                          React.createElement('option', { key: '10', value: '10' }, '10 min'),
                        ]),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.alertLeadMinutes')),
                      ),
                      React.createElement('div', { className: 'dcm-field' },
                        React.createElement('label', { className: 'dcm-label' }, t('field.browserNotifications')),
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, height: 34 } },
                          React.createElement('input', {
                            id: 'dcm-browser-notif',
                            type: 'checkbox',
                            className: 'dcm-check',
                            checked: Boolean(draft?.browserNotifications ?? false),
                            onChange: (e) => {
                              const checked = e.target.checked
                              setDraft((d) => ({ ...(d || {}), browserNotifications: checked }))
                              if (checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                                Notification.requestPermission()
                              }
                            },
                          }),
                          React.createElement('button', {
                            type: 'button',
                            className: 'dcm-btn dcm-btn-sm',
                            onClick: () => {
                              if (typeof Notification === 'undefined') return
                              Notification.requestPermission().then((p) => {
                                if (p === 'granted') {
                                  new Notification('DeepSeek Tariff Alert (Test)', {
                                    body: t('alert.pre_switch_offpeak', { time: '5m' }),
                                  })
                                }
                              })
                            },
                          }, t('action.test_notification')),
                        ),
                        React.createElement('span', { className: 'dcm-hint' }, t('hint.browserNotifications')),
                      ),
                    ),
                  ),

                  // Section: Widget Visibility & Privacy Mode (Issues #121, #165, #168)
                  React.createElement('div', { className: 'dcm-section-card' },
                    React.createElement('div', { className: 'dcm-section-title' }, t('section.visibility')),
                    React.createElement('div', { className: 'dcm-section-desc' }, t('section.visibility_desc')),
                    React.createElement('div', { className: 'dcm-row-check' },
                      React.createElement('input', {
                        id: 'dcm-show-header-chip',
                        type: 'checkbox',
                        className: 'dcm-check',
                        checked: Boolean(draft?.showHeaderChip ?? true),
                        onChange: (e) => { const c = e.target.checked; setDraft((d) => ({ ...(d || {}), showHeaderChip: c })) },
                      }),
                      React.createElement('label', { htmlFor: 'dcm-show-header-chip', className: 'dcm-label', style: { cursor: 'pointer' } }, t('field.showHeaderChip')),
                    ),
                    React.createElement('span', { className: 'dcm-hint', style: { marginTop: -6 } }, t('hint.showHeaderChip')),

                    React.createElement('div', { className: 'dcm-row-check', style: { marginTop: 10 } },
                      React.createElement('input', {
                        id: 'dcm-show-msg-action',
                        type: 'checkbox',
                        className: 'dcm-check',
                        checked: Boolean(draft?.showMessageAction ?? true),
                        onChange: (e) => { const c = e.target.checked; setDraft((d) => ({ ...(d || {}), showMessageAction: c })) },
                      }),
                      React.createElement('label', { htmlFor: 'dcm-show-msg-action', className: 'dcm-label', style: { cursor: 'pointer' } }, t('field.showMessageAction')),
                    ),
                    React.createElement('span', { className: 'dcm-hint', style: { marginTop: -6 } }, t('hint.showMessageAction')),

                    React.createElement('div', { className: 'dcm-row-check', style: { marginTop: 10 } },
                      React.createElement('input', {
                        id: 'dcm-privacy-mode',
                        type: 'checkbox',
                        className: 'dcm-check',
                        checked: Boolean(draft?.privacyMode ?? false),
                        onChange: (e) => { const c = e.target.checked; setDraft((d) => ({ ...(d || {}), privacyMode: c })) },
                      }),
                      React.createElement('label', { htmlFor: 'dcm-privacy-mode', className: 'dcm-label', style: { cursor: 'pointer' } }, t('field.privacyMode')),
                    ),
                    React.createElement('span', { className: 'dcm-hint', style: { marginTop: -6 } }, t('hint.privacyMode')),

                    (!draft?.showHeaderChip || !draft?.showMessageAction)
                      ? React.createElement('div', { className: 'dcm-alert dcm-alert-warn', style: { marginTop: 10, fontSize: 12 } }, t('notice.hidden_access'))
                      : null,
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
                        checked: Boolean(draft?.useOpenRouter ?? true),
                        onChange: (e) => { const c = e.target.checked; setDraft((d) => ({ ...(d || {}), useOpenRouter: c })) },
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
                        value: draft?.refreshHours ?? '',
                        onChange: (e) => { const v = e.target.value; setDraft((d) => ({ ...(d || {}), refreshHours: v })) },
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
                          diagState && diagState.route ? (diagState.route.model || diagState.route.provider) : 'default'
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

    function cacheSavingsBySlots(slots, schedule) {
      let savedUsd = 0
      let missedUsd = 0
      let readTokens = 0
      for (const key of Object.keys(slots || {})) {
        const minute = (Number(key) * 30 + 15) % 1440
        const rates = ratesAt(schedule, minute)
        const u = slots[key] || {}
        const cRead = Number(u.cacheReadTokens) || 0
        if (cRead > 0 && rates && rates.input > rates.cacheHit) {
          readTokens += cRead
          const missed = (cRead / 1e6) * (rates.input || 0)
          const hit = (cRead / 1e6) * (rates.cacheHit || 0)
          savedUsd += Math.max(0, missed - hit)
          missedUsd += missed
        }
      }
      const percent = missedUsd > 0 ? Math.round((savedUsd / missedUsd) * 100) : 0
      return { savedUsd, missedUsd, readTokens, percent }
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

    function normalizeCurrencyCode(symbolOrCode) {
      const str = String(symbolOrCode || '').trim().toUpperCase()
      if (str === '₽' || str === 'RUB' || str === 'РУБ') return 'RUB'
      if (str === '€' || str === 'EUR') return 'EUR'
      if (str === '¥' || str === 'CNY' || str === 'RMB') return 'CNY'
      if (str === '$' || str === 'USD') return 'USD'
      return str
    }

    function useAnimatedNumber(target, enabled = true) {
      const [display, setDisplay] = React.useState(target)
      const animRef = React.useRef(null)
      const currentRef = React.useRef(target)

      React.useEffect(() => {
        const prefersReduced = typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReduced || !enabled || typeof target !== 'number' || isNaN(target)) {
          currentRef.current = target
          setDisplay(target)
          return
        }

        const start = currentRef.current
        const diff = target - start
        if (Math.abs(diff) < 0.00001) return

        const duration = Math.min(800, Math.max(300, Math.abs(diff) * 1000))
        const startTime = performance.now()

        const step = (now) => {
          const elapsed = now - startTime
          const progress = Math.min(1, elapsed / duration)
          const ease = 1 - Math.pow(1 - progress, 3)
          const current = start + diff * ease
          currentRef.current = current
          setDisplay(current)

          if (progress < 1) {
            animRef.current = requestAnimationFrame(step)
          } else {
            currentRef.current = target
            setDisplay(target)
          }
        }

        if (animRef.current) cancelAnimationFrame(animRef.current)
        animRef.current = requestAnimationFrame(step)

        return () => {
          if (animRef.current) cancelAnimationFrame(animRef.current)
        }
      }, [target, enabled])

      return display
    }

    function rate(value) {
      if (!value) return '—'
      const text = value < 0.1 ? value.toFixed(3) : value.toFixed(2)
      return '$' + text.replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '')
    }

    function money(value, currency, privacy = false) {
      if (privacy) return currency + '••••'
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


    
    function calculateBurnRateAndProjection(turns, totalCostUsd, options = {}) {
      const currentTotal = Number(totalCostUsd) > 0 ? Number(totalCostUsd) : 0
      if (!Array.isArray(turns) || turns.length < 2) {
        return { burnRatePerHourUsd: 0, projectedCostUsd: currentTotal, confidence: 'low' }
      }
      const now = typeof options.now === 'number' ? options.now : Date.now()
      const windowMs = 10 * 60 * 1000
      const sorted = turns.filter((t) => t && typeof t.timestamp === 'number').sort((a, b) => a.timestamp - b.timestamp)
      if (sorted.length < 2) return { burnRatePerHourUsd: 0, projectedCostUsd: currentTotal, confidence: 'low' }
      let sample = sorted.filter((t) => t.timestamp >= now - windowMs)
      if (sample.length < 2) sample = sorted.slice(-Math.min(sorted.length, 10))
      const durationMs = sample[sample.length - 1].timestamp - sample[0].timestamp
      if (durationMs < 5000) return { burnRatePerHourUsd: 0, projectedCostUsd: currentTotal, confidence: 'low' }
      let costInSample = sample.reduce((acc, t) => acc + (Number(t.costDeltaUsd) || 0), 0)
      if (costInSample <= 0 && currentTotal > 0) {
        const totalTokens = sorted.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
        const sampleTokens = sample.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
        costInSample = totalTokens > 0 ? (sampleTokens / totalTokens) * currentTotal : currentTotal
      }
      const hours = durationMs / (1000 * 60 * 60)
      const rawBurnRate = hours > 0 ? (costInSample / hours) : 0
      const burnRatePerHourUsd = (Number.isFinite(rawBurnRate) && rawBurnRate >= 0) ? Math.round(rawBurnRate * 10000) / 10000 : 0
      const stepCount = sorted.length
      const avgCostPerStep = currentTotal / stepCount
      const projectedExtra = Math.min(currentTotal * 2, Math.max(avgCostPerStep * 3, burnRatePerHourUsd * 0.25))
      const projectedCostUsd = Math.round((currentTotal + (projectedExtra > 0 ? projectedExtra : 0)) * 10000) / 10000
      return { burnRatePerHourUsd, projectedCostUsd }
    }

    function renderSparkline(turns, options) {
      if (!Array.isArray(turns) || turns.length === 0) return null
      const { h, currency, fx, activeRate, t } = options

      const maxTokens = Math.max(1, ...turns.map((item) => Number(item.tokens) || 0))
      const height = 36
      const width = 240
      const count = turns.length
      const gap = count > 15 ? 2 : 4
      const barWidth = Math.max(3, Math.min(16, Math.floor((width - (count - 1) * gap) / count)))
      const totalBarSpace = count * barWidth + (count - 1) * gap
      const startX = Math.max(0, Math.floor((width - totalBarSpace) / 2))

      const bars = turns.map((item, idx) => {
        const tok = Number(item.tokens) || 0
        const barHeight = Math.max(3, Math.round((tok / maxTokens) * (height - 6)))
        const x = startX + idx * (barWidth + gap)
        const y = height - barHeight
        const isPeak = tok === maxTokens && tok > 0
        const stepCost = (item.costDeltaUsd && item.costDeltaUsd > 0)
          ? item.costDeltaUsd * fx
          : (activeRate ? (tok / 1e6) * ((activeRate.input + activeRate.output) / 2) * fx : 0)

        const tip = (t ? t('sparkline.steps') : 'step') + ' ' + (item.turn || idx + 1) +
          (item.step ? '.' + item.step : '') + ': ' + tokens(tok) +
          (stepCost > 0 ? ' (≈ ' + money(stepCost, currency, isPrivacy) + ')' : '')

        return h('rect', {
          key: 'bar-' + idx,
          x,
          y,
          width: barWidth,
          height: barHeight,
          rx: 2,
          ry: 2,
          className: isPeak ? 'dcm-spark-bar dcm-spark-peak' : 'dcm-spark-bar',
        }, h('title', null, tip))
      })

      return h('div', { key: 'sparkline', className: 'dcm-sparkline-box' }, [
        h('div', { key: 'spark-hdr', className: 'dcm-sparkline-header' }, [
          h('span', { key: 'lbl', className: 'dcm-section-lbl' }, t ? t('sparkline.title') : 'Turn dynamics'),
          h('span', { key: 'cnt', className: 'dcm-sparkline-count' }, count + ' ' + (t ? t('sparkline.steps') : 'steps')),
        ]),
        h('svg', {
          key: 'spark-svg',
          viewBox: '0 0 ' + width + ' ' + height,
          className: 'dcm-sparkline-svg',
          preserveAspectRatio: 'xMidYMid meet',
        }, bars),
      ])
    }



    // --------------------------------------------------- Export helpers (Issue #118)

    function sanitizeCsvCell(value) {
      if (value === null || value === undefined) return ''
      let str = String(value)
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str
      if (/[",\n\r]/.test(str)) str = '"' + str.replace(/"/g, '""') + '"'
      return str
    }

    function generateSessionCsv(data) {
      const { model = 'unknown', provider = '', currency = '$', fx = 1, turns = [], totalCostUsd = 0 } = data || {}
      const headers = ['Timestamp', 'ISO_Time', 'Turn', 'Step', 'Model', 'Uncached_Input', 'Cache_Read', 'Cache_Hit_%', 'Output', 'Total_Tokens', 'Cost_USD', 'Cost_Local', 'Currency']
      const rows = [headers.map(sanitizeCsvCell).join(',')]
      let sumIn = 0, sumHit = 0, sumOut = 0, sumTot = 0, sumCost = 0
      for (const t of turns) {
        const ts = t.timestamp ? Number(t.timestamp) : Date.now()
        const iso = new Date(ts).toISOString()
        const uncached = Number(t.uncachedInputTokens) || 0
        const hit = Number(t.cacheReadTokens) || 0
        const out = Number(t.outputTokens) || 0
        const tot = uncached + hit + out
        const hitRate = t.cacheHitRate !== undefined ? t.cacheHitRate : (uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0)
        const costUsd = Number(t.costDeltaUsd) || 0
        sumIn += uncached; sumHit += hit; sumOut += out; sumTot += tot; sumCost += costUsd
        rows.push([ts, iso, t.turn ?? '', t.step ?? 0, provider ? (provider + '/' + model) : model, uncached, hit, hitRate, out, tot, costUsd.toFixed(6), (costUsd * fx).toFixed(4), currency].map(sanitizeCsvCell).join(','))
      }
      const overallHit = sumIn + sumHit > 0 ? Math.round((sumHit / (sumIn + sumHit)) * 100) : 0
      rows.push(['TOTAL', new Date().toISOString(), turns.length, '', provider ? (provider + '/' + model) : model, sumIn, sumHit, overallHit, sumOut, sumTot, (totalCostUsd || sumCost).toFixed(6), ((totalCostUsd || sumCost) * fx).toFixed(4), currency].map(sanitizeCsvCell).join(','))
      return '\uFEFF' + rows.join('\r\n')
    }

    function generateSessionJson(data) {
      const { model = 'unknown', provider = '', currency = '$', fx = 1, turns = [], totalCostUsd = 0, cacheSavingsUsd = 0, cacheSavingsPercent = 0, tier = 'Standard' } = data || {}
      return {
        version: 1,
        generator: '@goodandready/dsh-cost-meter',
        exportedAt: new Date().toISOString(),
        session: {
          model, provider, currency, fxRate: fx, totalCostUsd, totalCostLocal: totalCostUsd * fx,
          cacheSavings: { savedUsd: cacheSavingsUsd, savedLocal: cacheSavingsUsd * fx, percent: cacheSavingsPercent },
          tier, turnsCount: turns.length,
        },
        turns: turns.map((t) => ({
          turn: t.turn, step: t.step ?? 0, timestamp: t.timestamp,
          tokens: { uncachedInput: Number(t.uncachedInputTokens) || 0, cacheRead: Number(t.cacheReadTokens) || 0, output: Number(t.outputTokens) || 0, total: Number(t.tokens) || 0, cacheHitRate: t.cacheHitRate || 0 },
          costDeltaUsd: Number(t.costDeltaUsd) || 0, costDeltaLocal: (Number(t.costDeltaUsd) || 0) * fx,
        })),
      }
    }

    function renderSummaryCardToCanvas(canvas, data) {
      if (!canvas || typeof canvas.getContext !== 'function') return null
      const width = 1200, height = 680
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      const { model = 'model', provider = '', currency = '$', fx = 1, costUsd = 0, tokens = {}, cacheSavingsUsd = 0, cacheSavingsPercent = 0, tier = 'Standard', turns = [] } = data || {}
      const totalCost = costUsd * fx
      const costFmt = totalCost >= 1 ? (currency + totalCost.toFixed(2)) : (totalCost > 0 ? (currency + totalCost.toFixed(4)) : (currency + '0.00'))
      const uncached = Number(tokens.uncachedInputTokens || tokens.inputTokens) || 0
      const hit = Number(tokens.cacheReadTokens) || 0
      const out = Number(tokens.outputTokens) || 0
      const totTok = uncached + hit + out
      const hitRate = uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0
      const savedAmt = cacheSavingsUsd * fx
      const savedFmt = savedAmt >= 1 ? (currency + savedAmt.toFixed(2)) : (currency + savedAmt.toFixed(4))

      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, width - 40, height - 40)

      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(50, 45, 220, 44, 22); ctx.fill()
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText('⚡ Cost Meter', 75, 74)

      ctx.fillStyle = '#94a3b8'; ctx.font = '18px system-ui, sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), width - 60, 74)
      ctx.textAlign = 'left'

      ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 36px system-ui, sans-serif'
      ctx.fillText(provider ? (provider + '/' + model) : model, 50, 145)

      ctx.fillStyle = tier.includes('Off-Peak') || tier.includes('低谷') ? '#10b981' : '#f59e0b'
      ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText(tier, 50, 180)

      const tiles = [
        { label: 'SESSION SPEND', val: costFmt, color: '#38bdf8' },
        { label: 'TOTAL TOKENS', val: totTok.toLocaleString(), color: '#f8fafc' },
        { label: 'CACHE HIT RATE', val: hitRate + '%', color: '#34d399' },
        { label: 'CACHE SAVED', val: '≈ ' + savedFmt + ' (' + cacheSavingsPercent + '%)', color: '#a78bfa' },
      ]
      tiles.forEach((t, i) => {
        const x = 50 + i * 270, y = 215
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)'; ctx.beginPath(); ctx.roundRect(x, y, 250, 110, 12); ctx.fill()
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillText(t.label, x + 16, y + 36)
        ctx.fillStyle = t.color; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillText(t.val, x + 16, y + 80)
      })

      const chartY = 360, chartH = 190, chartW = width - 100
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; ctx.beginPath(); ctx.roundRect(50, chartY, chartW, chartH, 12); ctx.fill()
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = '#64748b'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('TURN HISTORY & STEP DYNAMICS', 70, chartY + 35)

      const activeTurns = turns.slice(-25)
      if (activeTurns.length > 0) {
        const maxTok = Math.max(...activeTurns.map((t) => Number(t.tokens) || 1), 100)
        const barW = Math.min(32, Math.floor((chartW - 60) / activeTurns.length) - 6)
        const baseY = chartY + chartH - 30
        activeTurns.forEach((t, i) => {
          const x = 70 + i * (barW + 8)
          const tok = Number(t.tokens) || 0
          const h = Math.max(6, Math.round((tok / maxTok) * 100))
          ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.roundRect(x, baseY - h, barW, h, 4); ctx.fill()
          const hitTokens = Number(t.cacheReadTokens) || 0
          if (hitTokens > 0) {
            const hitH = Math.round((hitTokens / tok) * h)
            ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.roundRect(x, baseY - hitH, barW, hitH, 4); ctx.fill()
          }
        })
      }

      ctx.fillStyle = '#64748b'; ctx.font = '16px system-ui, sans-serif'; ctx.fillText('Generated by @goodandready/dsh-cost-meter', 50, height - 35)
      return canvas
    }

    // --------------------------------------------------- MessageTokenAction (Issue #120)

    function MessageTokenAction(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'zh' ? zh : en, en)
      const [open, setOpen] = React.useState(false)
      const configForms = getSettingsScope(ctx)
      const scope = React.useMemo(() => (configForms ? configForms.get(NS) : undefined), [configForms])
      const snapshot = React.useSyncExternalStore(
        React.useMemo(() => (cb) => (scope ? scope.subscribe(cb) : () => {}), [scope]),
        React.useCallback(() => (scope ? scope.getSnapshot() : { status: 'loading' }), [scope]),
        React.useCallback(() => ({ status: 'loading' }), []),
      )
      const stored = (snapshot && snapshot.value) || {}
      if (stored.showMessageAction === false) return null

      const useProjection = props.useProjection || (ctx && ctx.useProjection)
      const byModel = useProjection ? useProjection('costByModel') : undefined

      const turns = (byModel && Array.isArray(byModel.turns) && byModel.turns.length > 0)
        ? byModel.turns
        : []

      // Match turn number if passed by slot or use latest turn
      const msgTurn = typeof props.turn === 'number'
        ? props.turn
        : (props.message && typeof props.message.turn === 'number' ? props.message.turn : null)

      const tr = msgTurn !== null
        ? (turns.find((x) => x.turn === msgTurn) || turns[turns.length - 1])
        : (turns.length > 0 ? turns[turns.length - 1] : null)

      if (!tr) return null

      const tok = Number(tr.tokens) || 0
      const uncached = Number(tr.uncachedInputTokens) || 0
      const hit = Number(tr.cacheReadTokens) || 0
      const out = Number(tr.outputTokens) || 0
      const hitRate = tr.cacheHitRate !== undefined
        ? tr.cacheHitRate
        : (uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0)
      const durMs = Number(tr.durationMs) || 0
      const cost = Number(tr.costDeltaUsd) || 0
      const reasoning = Number(tr.reasoningTokens) || 0
      const isPrivacy = Boolean(stored.privacyMode)

      const fmtDur = (ms) => {
        if (!ms || ms <= 0) return '0s'
        const s = Math.round(ms / 1000)
        const m = Math.floor(s / 60)
        const r = s % 60
        return m > 0 ? (m + 'm ' + r + 's') : (r + 's')
      }

      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          key: 'btn',
          type: 'button',
          className: 'dcm-msg-action-btn',
          title: t('turn.modal_title') + (reasoning > 0 ? (' (🧠 ' + tokens(reasoning) + ')') : ''),
          onClick: () => setOpen(true),
        }, [
          React.createElement('span', { key: 'icon' }, '⚡'),
          React.createElement('span', { key: 't' }, tokens(tok)),
        ]),
        open ? React.createElement('div', {
          key: 'modal',
          className: 'dcm-inspector-modal',
          onClick: (e) => { if (e.target === e.currentTarget) setOpen(false) },
        },
          React.createElement('div', { className: 'dcm-inspector-card' }, [
            React.createElement('div', { key: 'head', className: 'dcm-inspector-title' }, [
              React.createElement('span', { key: 't' }, t('turn.modal_title')),
              React.createElement('button', {
                key: 'close',
                type: 'button',
                className: 'dcm-btn dcm-btn-sm',
                onClick: () => setOpen(false),
              }, '✕'),
            ]),
            React.createElement('div', { key: 'sub', style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 11, marginBottom: 10 } },
              t('turn.turn_step', { turn: tr.turn, step: tr.step || 0 })
            ),
            React.createElement('div', { key: 'grid', className: 'dcm-inspector-grid' }, [
              React.createElement('div', { key: 's1', className: 'dcm-inspector-stat' }, [
                React.createElement('div', { className: 'dcm-inspector-stat-lbl' }, t('turn.tokens_total')),
                React.createElement('div', { className: 'dcm-inspector-stat-val' }, tokens(tok)),
              ]),
              React.createElement('div', { key: 's2', className: 'dcm-inspector-stat' }, [
                React.createElement('div', { className: 'dcm-inspector-stat-lbl' }, t('turn.cache_hit_rate')),
                React.createElement('div', { className: 'dcm-inspector-stat-val' }, hitRate + '%'),
              ]),
              React.createElement('div', { key: 's3', className: 'dcm-inspector-stat' }, [
                React.createElement('div', { className: 'dcm-inspector-stat-lbl' }, t('turn.duration')),
                React.createElement('div', { className: 'dcm-inspector-stat-val' }, fmtDur(durMs)),
              ]),
              React.createElement('div', { key: 's4', className: 'dcm-inspector-stat' }, [
                React.createElement('div', { className: 'dcm-inspector-stat-lbl' }, t('turn.cost_title')),
                React.createElement('div', { className: 'dcm-inspector-stat-val' }, isPrivacy ? '$••••' : (cost > 0 ? ('$' + cost.toFixed(4)) : '—')),
              ]),
            ]),
            React.createElement('div', { key: 'breakdown', style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, marginTop: 8 } }, [
              React.createElement('div', { key: 'b1', style: { display: 'flex', justifyContent: 'space-between' } }, [
                React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('turn.uncached_in')),
                React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums' } }, tokens(uncached)),
              ]),
              React.createElement('div', { key: 'b2', style: { display: 'flex', justifyContent: 'space-between' } }, [
                React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('turn.cache_read')),
                React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums' } }, tokens(hit)),
              ]),
              React.createElement('div', { key: 'b3', style: { display: 'flex', justifyContent: 'space-between' } }, [
                React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('turn.output')),
                React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums' } }, tokens(out)),
              ]),
              reasoning > 0 ? React.createElement('div', { key: 'b-reasoning', style: { display: 'flex', justifyContent: 'space-between', color: 'var(--dsw-alias-brand-primary)' } }, [
                React.createElement('span', null, '🧠 ' + t('turn.reasoning')),
                React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums' } }, tokens(reasoning)),
              ]) : null,
            ]),
          ])
        ) : null
      )
    }


    // ------------------------------------------------------------ CostMeter


    function AnimatedCost(props) {
      const { value = 0, currency = '$', isPrivacy = false, className = '' } = props || {}
      const animated = useAnimatedNumber(Number(value) || 0, !isPrivacy)
      if (isPrivacy) return React.createElement('span', { className }, currency + '••••')
      return React.createElement('span', { className }, money(animated, currency))
    }


    function StatusRing(props) {
      const { progress = 0, severity = 'normal', isAnomaly = false, isOffpeak = false } = props || {}
      const r = 6
      const circ = 2 * Math.PI * r // ~37.6991
      const offset = circ * (1 - Math.min(1, Math.max(0, progress)))

      let ringColorVar = 'var(--dsw-alias-state-success-primary)'
      if (isAnomaly || severity === 'critical' || progress >= 0.9) {
        ringColorVar = 'var(--dsw-alias-state-danger-primary)'
      } else if (severity === 'warning' || progress >= 0.7) {
        ringColorVar = 'var(--dsw-alias-state-warn-primary)'
      }

      const dotColorVar = isAnomaly
        ? 'var(--dsw-alias-state-danger-primary)'
        : (isOffpeak ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)')

      return React.createElement('svg', {
        className: 'dcm-ring-svg' + (isAnomaly ? ' dcm-ring-pulse-danger' : ''),
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        'aria-hidden': true,
      }, [
        React.createElement('circle', {
          key: 'track',
          cx: 8,
          cy: 8,
          r: r,
          className: 'dcm-ring-track',
        }),
        progress > 0 ? React.createElement('circle', {
          key: 'prog',
          cx: 8,
          cy: 8,
          r: r,
          className: 'dcm-ring-progress',
          style: {
            stroke: ringColorVar,
            strokeDasharray: circ,
            strokeDashoffset: offset,
          },
        }) : null,
        React.createElement('circle', {
          key: 'center',
          cx: 8,
          cy: 8,
          r: 3,
          className: 'dcm-ring-center' + (isAnomaly ? ' dcm-dot-pulse-danger' : ''),
          style: { fill: dotColorVar },
        }),
      ])
    }

    const REFERENCE_MODELS = [
      { id: 'deepseek-chat', name: 'DeepSeek V3', inputUncached: 0.14, inputCached: 0.014, output: 0.28 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', inputUncached: 0.55, inputCached: 0.14, output: 2.19 },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', inputUncached: 3.00, inputCached: 0.30, output: 15.00 },
      { id: 'gpt-4o', name: 'GPT-4o', inputUncached: 2.50, inputCached: 1.25, output: 10.00 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputUncached: 0.15, inputCached: 0.075, output: 0.60 },
    ]

    function getBurnRateSeries(turns) {
      if (!Array.isArray(turns) || turns.length === 0) return []
      let cumCost = 0
      const series = []
      let sumTokens = 0
      for (let i = 0; i < turns.length; i++) {
        const t = turns[i]
        if (!t) continue
        const uncached = Number(t.uncachedInputTokens) || 0
        const cached = Number(t.cacheReadTokens) || 0
        const out = Number(t.outputTokens) || 0
        const tok = uncached + cached + out || Number(t.tokens) || 0
        const cost = Number(t.costDeltaUsd) || 0
        cumCost += cost
        sumTokens += tok
        series.push({
          turn: t.turn || i + 1,
          step: t.step || i + 1,
          tokens: tok,
          uncached,
          cached,
          output: out,
          costDeltaUsd: Number(cost.toFixed(4)),
          cumulativeCostUsd: Number(cumCost.toFixed(4)),
          isSpike: false,
        })
      }
      const avg = sumTokens / series.length
      for (let i = 0; i < series.length; i++) {
        if (series[i].tokens >= Math.max(12000, avg * 2.2)) {
          series[i].isSpike = true
        }
      }
      return series
    }

    function simulateModelCosts(turns, actualCostUsd = 0, currentModel = '') {
      const actual = Number(actualCostUsd) > 0 ? Number(actualCostUsd) : 0
      if (!Array.isArray(turns) || turns.length === 0) {
        return { comparisons: [], totalUncached: 0, totalCached: 0, totalOutput: 0, totalTokens: 0, actualCostUsd: actual, bestSavingsVsSonnet: null }
      }
      let totalUncached = 0, totalCached = 0, totalOutput = 0
      for (const t of turns) {
        if (!t) continue
        totalUncached += Number(t.uncachedInputTokens) || 0
        totalCached += Number(t.cacheReadTokens) || 0
        totalOutput += Number(t.outputTokens) || 0
      }
      if (totalUncached === 0 && totalCached === 0 && totalOutput === 0) {
        const rawTokens = turns.reduce((acc, t) => acc + (Number(t.tokens) || 0), 0)
        totalCached = Math.round(rawTokens * 0.70)
        totalUncached = Math.round(rawTokens * 0.20)
        totalOutput = Math.max(0, rawTokens - totalCached - totalUncached)
      }
      const totalTokens = totalUncached + totalCached + totalOutput
      const normCurrent = String(currentModel || '').toLowerCase()
      const comparisons = REFERENCE_MODELS.map((ref) => {
        const simCost = (
          (totalUncached * ref.inputUncached) / 1e6 +
          (totalCached * ref.inputCached) / 1e6 +
          (totalOutput * ref.output) / 1e6
        )
        const simulatedCostUsd = Number(simCost.toFixed(4))
        const diffUsd = Number((simulatedCostUsd - actual).toFixed(4))
        const diffPercent = actual > 0 ? Math.round(((simulatedCostUsd - actual) / actual) * 100) : 0
        const savingsUsd = Number(Math.max(0, simulatedCostUsd - actual).toFixed(4))
        const isCheaper = simulatedCostUsd < actual
        const isCurrent = normCurrent.includes(ref.id) || (ref.id === 'deepseek-chat' && (normCurrent.includes('v3') || normCurrent.includes('chat') || !normCurrent))
        return { id: ref.id, name: ref.name, simulatedCostUsd, diffUsd, diffPercent, savingsUsd, isCheaper, isCurrent }
      })
      const sonnetComp = comparisons.find((c) => c.id === 'claude-3-5-sonnet')
      let bestSavingsVsSonnet = null
      if (sonnetComp && sonnetComp.simulatedCostUsd > actual && actual > 0) {
        const savingsUsd = Number((sonnetComp.simulatedCostUsd - actual).toFixed(4))
        const savingsPercent = Math.round((savingsUsd / sonnetComp.simulatedCostUsd) * 100)
        bestSavingsVsSonnet = { savingsUsd, savingsPercent }
      }
      return { comparisons, totalUncached, totalCached, totalOutput, totalTokens, actualCostUsd: actual, bestSavingsVsSonnet }
    }

    function CostMeter(props) {
      const ctx = props.ctx
      const locale = useActiveLocale(ctx)
      const t = props.t || makeT(locale === 'zh' ? zh : en, en)
      const useProjection = props.useProjection
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const byModel = useProjection ? useProjection('costByModel') : undefined
      const modelSelection = useProjection ? useProjection('modelSelection') : undefined
      const [state, setState] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => new Date())
      const [copied, setCopied] = React.useState(false)
      const [showAllModels, setShowAllModels] = React.useState(false)
      const [showTurnInspector, setShowTurnInspector] = React.useState(false)
      const [selectedCurrency, setSelectedCurrency] = React.useState(null)
      const [selectedPrivacy, setSelectedPrivacy] = React.useState(null)
      const [exportingPng, setExportingPng] = React.useState(false)
      const lastAlertRef = React.useRef(null)
      const box = React.useRef(null)

      React.useEffect(() => { ensureStyles() }, [])

      const configForms = getSettingsScope(ctx)
      const scope = React.useMemo(
        () => (configForms && typeof configForms.get === 'function' ? configForms.get(NS) : undefined),
        [configForms],
      )
      const settingsSnap = React.useSyncExternalStore
        ? React.useSyncExternalStore(
            React.useMemo(() => (cb) => (scope && typeof scope.subscribe === 'function' ? scope.subscribe(cb) : () => {}), [scope]),
            React.useCallback(() => (scope && typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : (configForms && typeof configForms.get === 'function' ? configForms.get(NS) : null)), [scope, configForms]),
            React.useCallback(() => null, []),
          )
        : null

      const used = (byModel && Array.isArray(byModel.models) ? byModel.models : [])
        .map((m) => ({ ...m, usage: sumSlots(m && m.slots) }))
        .filter((m) => m.usage.uncachedInputTokens || m.usage.outputTokens ||
          m.usage.cacheReadTokens || m.usage.cacheWriteTokens)
      const usedKeys = used.map((m) => m.provider + '/' + m.model).sort().join(',')

      // Determine active model from session modelSelection, committed route, or used models
      const activeSelection = modelSelection?.next || modelSelection?.lastUsed
      const activeModelName = activeSelection?.model
        || byModel?.route?.model
        || (used.length > 0 ? used[used.length - 1].model : undefined)
        || (state?.route?.model)
        || ''

      const activeProvider = activeSelection?.provider
        || byModel?.route?.provider
        || (used.length > 0 ? used[used.length - 1].provider : undefined)
        || (state?.route?.provider)
        || ''

      const activeRouteKey = activeModelName
        ? (activeProvider ? activeProvider + '/' + activeModelName : activeModelName)
        : ''

      const reqSeq = React.useRef(0)

      const load = React.useCallback((keys, currentRoute, signal) => {
        const seq = ++reqSeq.current
        const params = new URLSearchParams()
        if (currentRoute) {
          params.set('currentRoute', currentRoute)
          params.append('route', currentRoute)
        }
        if (keys) {
          params.set('models', keys)
          keys.split(',').forEach((k) => { if (k) params.append('route', k) })
        }
        const qs = params.toString()
        const query = qs ? '?' + qs : ''
        fetchWithTimeout(STATE_PATH + query, { signal, headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && seq === reqSeq.current) setState(data)
          })
          .catch(() => {})
      }, [])

      React.useEffect(() => {
        const controller = new AbortController()
        load(usedKeys, activeRouteKey, controller.signal)
        return () => controller.abort()
      }, [load, usedKeys, activeRouteKey])
      React.useEffect(() => {
        if (!open) return
        const controller = new AbortController()
        load(usedKeys, activeRouteKey, controller.signal)
        return () => controller.abort()
      }, [open, load, usedKeys, activeRouteKey])
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
      const showHeaderChip = stored.showHeaderChip !== undefined ? Boolean(stored.showHeaderChip) : (state.showHeaderChip !== false)
      if (!showHeaderChip) return null

      const turns = (byModel?.turns && byModel.turns.length > 0) ? byModel.turns : (state.turns || [])
      const CURRENCY_LIST = [{ symbol: '$', code: 'USD' }, { symbol: '¥', code: 'CNY' }, { symbol: '₽', code: 'RUB' }, { symbol: '€', code: 'EUR' }]
      const activeCurrency = selectedCurrency || (stored.currency !== undefined ? String(stored.currency) : (state.currency || '$'))
      const fxRates = state.fxRates || { USD: 1, RUB: 80, CNY: 7.15, EUR: 0.92 }
      const normCode = normalizeCurrencyCode(activeCurrency)
      const fx = (selectedCurrency && fxRates[normCode] !== undefined)
        ? Number(fxRates[normCode])
        : (stored.usdRate !== undefined && !isNaN(Number(stored.usdRate)) ? Number(stored.usdRate) : (Number(state.usdRate) || 1))
      const currency = activeCurrency
      const isPrivacy = selectedPrivacy !== null ? selectedPrivacy : (stored.privacyMode !== undefined ? Boolean(stored.privacyMode) : Boolean(state.privacyMode))
      const formatMoney = (val) => money(val, currency, isPrivacy)


      const handleCurrencySelect = (sym) => {
        setSelectedCurrency(sym)
        const code = normalizeCurrencyCode(sym)
        const newFx = fxRates[code] || 1
        if (scope && typeof scope.set === 'function') {
          try {
            scope.set('currency', sym)
            scope.set('usdRate', newFx)
          } catch (_) {}
        }
      }
      const budgetThreshold = stored.budgetThreshold !== undefined ? Number(stored.budgetThreshold) : (Number(state.budgetThreshold) || 0)
      const displayMode = stored.displayMode !== undefined ? stored.displayMode : (state.displayMode || 'auto')
      const schedules = state.schedules || {}
      const schedule = (activeRouteKey && schedules[activeRouteKey])
        || (activeModelName && schedules[activeModelName])
        || state.schedule
      const hasUsage = usage !== undefined && usage !== null
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()

      if (!schedule) {
        return h('div', { ref: box, style: { position: 'relative' } }, [
          h('button', {
            key: 'chip', type: 'button',
            className: 'dcm-chip' + (displayMode === 'compact' ? ' dcm-chip-compact' : ''),
            onClick: () => setOpen((v) => !v), title: t('chipUnknown'),
          }, [
            h('span', { key: 'dot', className: 'dcm-dot dcm-dot-idle' }),
            h('span', { key: 'txt' }, t('chipUnknown')),
          ]),
          open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
            h('div', { key: 't', className: 'dcm-panel-title' },
              activeModelName || (state.route ? state.route.model : t('routeUnknown'))),
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

      const alertBeforeSwitch = stored.alertBeforeSwitch !== undefined ? Boolean(stored.alertBeforeSwitch) : (state.alertBeforeSwitch !== false)
      const alertLeadMinutes = Number(stored.alertLeadMinutes || state.alertLeadMinutes || 5)
      const browserNotifications = Boolean(stored.browserNotifications || state.browserNotifications || false)

      let alertActive = false
      let alertDirection = null
      let alertBanner = null

      if (!flat && alertBeforeSwitch && leftMinutes > 0 && leftMinutes <= alertLeadMinutes) {
        alertActive = true
        alertDirection = cheapNow ? 'peak' : 'offpeak'
        const timeStr = left || (leftMinutes + 'm')
        alertBanner = alertDirection === 'peak'
          ? t('alert.pre_switch_peak', { time: timeStr })
          : t('alert.pre_switch_offpeak', { time: timeStr })
      }

      // Desktop HTML5 notification trigger (Issue #117)
      React.useEffect(() => {
        if (!alertActive || !browserNotifications || !alertBanner) return
        const transKey = Math.floor(minute / 30) + ':' + alertDirection
        if (lastAlertRef.current === transKey) return
        lastAlertRef.current = transKey
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted') {
            try { new Notification('DeepSeek Tariff Alert', { body: alertBanner }) } catch (_) {}
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((p) => {
              if (p === 'granted') {
                try { new Notification('DeepSeek Tariff Alert', { body: alertBanner }) } catch (_) {}
              }
            })
          }
        }
      }, [alertActive, browserNotifications, alertBanner, minute, alertDirection])

      const perModel = used.map((m) => {
        const key = m.provider + '/' + m.model
        const own = schedules[key] || schedules[m.model]
        const ownSchedule = own && (own.schedule || own)
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

      // Velocity and progress ring metrics
      const velocity = state.velocity || { velocityPerMin: 0, recentAvgCostPerStep: 0, isAnomaly: false, severity: 'normal' }
      const isRunaway = Boolean(velocity.isAnomaly)
      const budgetProgress = (budgetThreshold > 0) ? Math.min(1, totalUsd / budgetThreshold) : 0
      const contextProgress = (state.contextMetrics && state.contextMetrics.saturationPercent > 0) ? Math.min(1, state.contextMetrics.saturationPercent / 100) : 0
      const ringProgress = budgetThreshold > 0 ? budgetProgress : contextProgress

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
          h('div', { key: label + '-v', className: 'dcm-cost' }, formatMoney(usd * fx)),
        ]
      }

      const showCacheWrite = Number(usage && usage.cacheWriteTokens) > 0
      const zone = state.displayTimeZone || 'Europe/Moscow'
      const zl = zoneLabel(zone)
      const windowText = (schedule.windows || [])
        .map((w) => hhmmInZone(w.start, zone, now) + '–' + hhmmInZone(w.end, zone, now))
        .join(', ')
      const nowLocal = hhmmInZone(minute, zone, now)

      // Calculate cache savings amount across all used models (#92)
      let cacheSavedAmount = 0
      let cacheSavedPercent = 0
      if (hasUsage) {
        if (perModel.length > 0) {
          let totalSavedUsd = 0
          let totalMissedUsd = 0
          for (const m of perModel) {
            const own = schedules[m.key] || schedules[m.model]
            const sched = own && (own.schedule || own) ? (own.schedule || own) : schedule
            if (sched) {
              const res = cacheSavingsBySlots(m.slots || (m.usage ? { 0: m.usage } : {}), sched)
              totalSavedUsd += res.savedUsd
              totalMissedUsd += res.missedUsd
            }
          }
          if (totalSavedUsd > 0) {
            cacheSavedAmount = totalSavedUsd * fx
            cacheSavedPercent = totalMissedUsd > 0 ? Math.round((totalSavedUsd / totalMissedUsd) * 100) : 0
          }
        } else if (usage && Number(usage.cacheReadTokens) > 0 && active.input > active.cacheHit) {
          const tokensRead = Number(usage.cacheReadTokens)
          const missedCost = (tokensRead / 1e6) * active.input
          const hitCost = (tokensRead / 1e6) * active.cacheHit
          cacheSavedAmount = Math.max(0, (missedCost - hitCost) * fx)
          cacheSavedPercent = missedCost > 0 ? Math.round(((missedCost - hitCost) / missedCost) * 100) : 0
        }
      }


      // Copy summary report to clipboard
      const copyReport = () => {
        const lines = [
          '=== ' + (activeModelName || (state.route ? state.route.model : 'Cost Meter Report')) + ' ===',
          t('tokens.session_total') + ' ' + (hasUsage ? formatMoney(total) : '—') + (budgetThreshold > 0 ? ' (limit: ' + money(budgetThreshold * fx, currency) + ')' : ''),
          'Tier: ' + (flat ? 'Flat' : (cheapNow ? t('offpeak') : t('peak'))),
          'Rates (1M): input ' + rate(active.input) + ', output ' + rate(active.output) + ', cache ' + rate(active.cacheHit),
        ]
        if (cacheSavedAmount > 0) {
          lines.push('Cache saved: ≈ ' + formatMoney(cacheSavedAmount) + ' (' + cacheSavedPercent + '%)')
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
        : (activeModelName ? [{ key: activeRouteKey || activeModelName, model: activeModelName, known: Boolean(schedule), cost: 0 }] : [])
      )
      const shouldCollapse = visibleModels.length > 3 && !showAllModels
      const renderedModels = shouldCollapse ? visibleModels.slice(0, 3) : visibleModels

      return h('div', { ref: box, style: { position: 'relative' } }, [
        h('button', {
          key: 'chip', type: 'button',
          className: 'dcm-chip' + (displayMode === 'compact' ? ' dcm-chip-compact' : '') + (alertActive ? (alertDirection === 'peak' ? ' dcm-chip-alert-peak' : ' dcm-chip-alert-offpeak') : '') + (isRunaway ? ' dcm-chip-runaway' : ''),
          onClick: () => setOpen((v) => !v),
          title: (isRunaway ? ('⚠️ ' + t('velocity.alert_tooltip', { rate: money(velocity.velocityPerMin * fx, currency) }) + ' · ') : '') +
            (budgetExceeded
            ? t('budget.exceeded', { limit: formatMoney(budgetThreshold * fx) })
            : (flat ? 'Flat tariff' : cheapNow ? t('offpeak') : t('peak'))) +
            (cacheSavedAmount > 0 ? ' · ' + t('savings.cache_saved', { amount: formatMoney(cacheSavedAmount), percent: cacheSavedPercent }) : ''),

        }, [
          h(StatusRing, { key: 'ring', progress: ringProgress, severity: velocity.severity, isAnomaly: isRunaway, isOffpeak: cheapNow }),
          hasUsage ? h(AnimatedCost, { key: 'sum', value: total, currency, isPrivacy, className: 'dcm-odometer' }) : h('span', { key: 'sum' }, '—'),
          left ? h('span', { key: 'left', className: 'dcm-chip-timer' }, left) : null,
        ]),

        open ? h('div', { key: 'panel', className: 'dcm-panel' }, [
          isRunaway ? h('div', { key: 'velocity-alert', className: 'dcm-alert dcm-alert-err dcm-velocity-banner' }, [
            h('div', { key: 'v-title', style: { fontWeight: 600, marginBottom: 2 } }, '⚠️ ' + t('velocity.alert_title')),
            h('div', { key: 'v-desc', style: { fontSize: 12 } }, t('velocity.alert_desc', {
              velocity: money(velocity.velocityPerMin * fx, currency),
              stepCost: money(velocity.recentAvgCostPerStep * fx, currency)
            }))
          ]) : null,
          h('div', { key: 'title', className: 'dcm-panel-title' }, [
            h('span', { key: 'model-name' }, activeModelName || (state.route ? state.route.model : 'model')),
            h('div', { key: 'curr-switcher', className: 'dcm-curr-switcher' },
              CURRENCY_LIST.map((c) =>
                h('button', {
                  key: c.code,
                  type: 'button',
                  className: 'dcm-curr-btn' + (currency === c.symbol || currency === c.code ? ' dcm-curr-btn-active' : ''),
                  onClick: () => handleCurrencySelect(c.symbol),
                  title: c.code,
                }, c.symbol)
              )
            ),
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

          alertBanner ? h('div', {
            key: 'preswitch-banner',
            className: 'dcm-alert-banner ' + (alertDirection === 'peak' ? 'dcm-alert-banner-peak' : 'dcm-alert-banner-offpeak'),
          }, alertBanner) : null,

          discountHint ? h('div', { key: 'savings-box', className: 'dcm-tip-box', style: { marginTop: 6 } }, discountHint) : null,

          cacheSavedAmount > 0
            ? h('div', { key: 'cache-saved-box', className: 'dcm-cache-box', style: { marginTop: 6 } },
                t('savings.cache_saved', { amount: formatMoney(cacheSavedAmount), percent: cacheSavedPercent }))
            : null,

          budgetExceeded ? h('div', { key: 'budget-warn', className: 'dcm-alert dcm-alert-err', style: { marginTop: 6, padding: '6px 10px', fontSize: 11 } },
            t('budget.exceeded', { limit: formatMoney(budgetThreshold * fx) })) : null,

          renderSparkline(turns, {
            h,
            currency,
            fx,
            activeRate: active,
            t,
          }),

          turns.length > 0 ? [
            h('div', {
              key: 'turns-header',
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
            }, [
              h('span', { key: 'th-lbl', className: 'dcm-section-lbl' }, t('turn.history_title')),
              h('button', {
                key: 'th-btn',
                type: 'button',
                className: 'dcm-accordion-btn',
                onClick: () => setShowTurnInspector((v) => !v),
              }, showTurnInspector ? t('turn.hide_history') : t('turn.show_history')),
            ]),
            showTurnInspector ? h('div', { key: 'turn-list', className: 'dcm-turn-list' },
              turns.slice(-10).reverse().map((tr, idx) => {
                const tok = Number(tr.tokens) || 0
                const hit = Number(tr.cacheReadTokens) || 0
                const uncached = Number(tr.uncachedInputTokens) || 0
                const hitRate = tr.cacheHitRate !== undefined
                  ? tr.cacheHitRate
                  : (uncached + hit > 0 ? Math.round((hit / (uncached + hit)) * 100) : 0)
                const cost = Number(tr.costDeltaUsd) || 0
      const reasoning = Number(tr.reasoningTokens) || 0
      const isPrivacy = Boolean(stored.privacyMode)
                return h('div', { key: 'tr-' + idx, className: 'dcm-turn-row' }, [
                  h('span', { key: 'tn', style: { fontWeight: 500 } }, 'T#' + tr.turn + (tr.step ? '.' + tr.step : '')),
                  h('span', { key: 'tok', style: { color: 'var(--dsw-alias-label-secondary)' } }, tokens(tok) + ' tok (' + hitRate + '% hit)'),
                  h('span', { key: 'c', style: { fontWeight: 600 } }, cost > 0 ? formatMoney(cost * fx) : '—'),
                ])
              })
            ) : null,
          ] : null,

          (() => {
            const proj = calculateBurnRateAndProjection(turns, total / fx)
            const burnRate = proj.burnRatePerHourUsd * fx
            const projectedTotal = proj.projectedCostUsd * fx
            if (burnRate <= 0) return null
            return h('div', { key: 'proj-box', className: 'dcm-proj-box' }, [
              h('span', { key: 'burn', className: 'dcm-proj-item' }, [
                h('span', null, t('projection.burn_rate') + ' '),
                h('span', { className: 'dcm-proj-val' }, formatMoney(burnRate) + t('projection.per_hour')),
              ]),
              h('span', { key: 'proj', className: 'dcm-proj-item' }, [
                h('span', null, t('projection.projected') + ' '),
                h('span', { className: 'dcm-proj-val' }, '≈ ' + formatMoney(projectedTotal)),
              ]),
              velocity.velocityPerMin > 0 ? h('span', { key: 'vel', className: 'dcm-proj-item' }, [
                h('span', null, t('velocity.speed_label') + ' '),
                h('span', { className: 'dcm-proj-val' + (isRunaway ? ' dcm-val-danger' : '') }, formatMoney(velocity.velocityPerMin * fx) + t('velocity.per_minute')),
              ]) : null,
            ])
          })(),
          // Sparkline Burn Rate Chart (#151)
          (() => {
            const burnSeries = (state.burnRateSeries && state.burnRateSeries.length >= 2)
              ? state.burnRateSeries
              : (turns && turns.length >= 2 ? getBurnRateSeries(turns) : [])
            if (burnSeries.length < 2) return null
            const maxTok = Math.max(1, ...burnSeries.map((p) => p.tokens))
            const svgW = 280
            const svgH = 34
            const barSpacing = 2
            const nBars = burnSeries.length
            const totalGap = (nBars - 1) * barSpacing
            const barW = Math.max(2, Math.min(16, (svgW - totalGap) / nBars))

            return h('div', { key: 'burn-chart', className: 'dcm-chart-box' }, [
              h('div', { key: 'c-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 } }, [
                h('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('chart.burn_rate_title')),
                h('span', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 10 } }, burnSeries.length + ' ' + t('sparkline.steps')),
              ]),
              h('svg', {
                key: 'c-svg',
                className: 'dcm-sparkline-svg',
                viewBox: '0 0 ' + svgW + ' ' + svgH,
                preserveAspectRatio: 'none',
              }, burnSeries.map((pt, idx) => {
                const hRatio = Math.max(0.08, pt.tokens / maxTok)
                const barH = Math.max(3, Math.round(hRatio * svgH))
                const x = Math.round(idx * (barW + barSpacing))
                const y = svgH - barH
                return h('rect', {
                  key: 'b-' + idx,
                  x,
                  y,
                  width: Math.max(1, barW),
                  height: barH,
                  rx: 1,
                  className: 'dcm-sparkline-bar' + (pt.isSpike ? ' dcm-sparkline-spike' : ''),
                }, [
                  h('title', null, t('chart.turn') + ' ' + pt.turn + ': ' + tokens(pt.tokens) + ' ' + t('chart.tokens') + (pt.costDeltaUsd > 0 ? (' (≈ ' + formatMoney(pt.costDeltaUsd * fx) + ')') : '') + (pt.isSpike ? (' · ' + t('chart.spike')) : ''))
                ])
              })),
            ])
          })(),


          // Redundant Token Waste Alert (Issue #145)
          state.tokenWaste && state.tokenWaste.hasWaste ? h('div', { key: 'waste-alert', className: 'dcm-alert dcm-waste-banner' }, [
            h('div', { key: 'w-title', style: { fontWeight: 600, marginBottom: 2 } }, '💡 ' + t('waste.alert_title')),
            h('div', { key: 'w-desc', style: { fontSize: 11.5 } }, t('waste.alert_desc', {
              tokens: tokens(state.tokenWaste.wasteTokens),
              cost: formatMoney(state.tokenWaste.wasteCostUsd * fx)
            })),
            h('div', { key: 'w-rec', style: { fontSize: 10.5, marginTop: 4, color: 'var(--dsw-alias-label-tertiary)' } },
              state.tokenWaste.recommendation === 'compact' ? t('waste.recommendation_compact') : t('waste.recommendation_prune')
            ),
          ]) : null,

          // Context Saturation Gauge (Issue #137)
          state.contextMetrics && state.contextMetrics.contextLength > 0 ? h('div', { key: 'context-box', style: { marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-3) 60%, transparent)', border: '1px solid var(--dsw-alias-border-l2)' } }, [
            h('div', { key: 'ctx-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 } }, [
              h('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('context.title')),
              h('span', { className: 'dcm-risk-badge dcm-risk-' + state.contextMetrics.riskLevel },
                state.contextMetrics.riskLevel === 'high' ? t('context.risk_high') : (state.contextMetrics.riskLevel === 'moderate' ? t('context.risk_moderate') : t('context.risk_low'))
              ),
            ]),
            h('div', { key: 'ctx-bar', className: 'dcm-context-bar-bg', style: { margin: '6px 0' } }, [
              h('div', {
                className: 'dcm-context-bar-fill dcm-risk-' + state.contextMetrics.riskLevel,
                style: { width: state.contextMetrics.saturationPercent + '%' },
              }),
            ]),
            h('div', { key: 'ctx-footer', className: 'dcm-context-footer' }, [
              h('span', null, tokens(state.contextMetrics.currentTokens) + ' / ' + tokens(state.contextMetrics.contextLength) + ' (' + state.contextMetrics.saturationPercent + '%)'),
              state.contextMetrics.nextTurnEstUsd > 0
                ? h('span', null, t('context.next_turn', { cost: formatMoney(state.contextMetrics.nextTurnEstUsd * fx) }))
                : null,
            ]),
            state.contextMetrics.riskLevel === 'high'
              ? h('div', { key: 'ctx-warn', className: 'dcm-alert dcm-alert-warn', style: { marginTop: 6, fontSize: 10.5 } }, t('context.compaction_warning'))
              : null,
          ]) : null,

          // Prompt Anatomy Bar (Issue #138)
          state.promptAnatomy && state.promptAnatomy.totalTokens > 0 ? h('div', { key: 'prompt-anatomy', className: 'dcm-anatomy-box' }, [
            h('div', { key: 'a-header', style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, [
              h('span', null, t('anatomy.title')),
              h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' } }, tokens(state.promptAnatomy.totalTokens) + ' tok'),
            ]),
            h('div', { key: 'a-bar', className: 'dcm-anatomy-bar' }, [
              state.promptAnatomy.percentages.system > 0 ? h('div', { key: 'seg-sys', className: 'dcm-anatomy-seg dcm-seg-system', style: { width: state.promptAnatomy.percentages.system + '%' }, title: t('anatomy.system') + ': ' + tokens(state.promptAnatomy.systemTokens) }) : null,
              state.promptAnatomy.percentages.tools > 0 ? h('div', { key: 'seg-tools', className: 'dcm-anatomy-seg dcm-seg-tools', style: { width: state.promptAnatomy.percentages.tools + '%' }, title: t('anatomy.tools') + ': ' + tokens(state.promptAnatomy.toolsTokens) }) : null,
              state.promptAnatomy.percentages.history > 0 ? h('div', { key: 'seg-hist', className: 'dcm-anatomy-seg dcm-seg-history', style: { width: state.promptAnatomy.percentages.history + '%' }, title: t('anatomy.history') + ': ' + tokens(state.promptAnatomy.historyTokens) }) : null,
              state.promptAnatomy.percentages.attachments > 0 ? h('div', { key: 'seg-att', className: 'dcm-anatomy-seg dcm-seg-attachments', style: { width: state.promptAnatomy.percentages.attachments + '%' }, title: t('anatomy.attachments') + ': ' + tokens(state.promptAnatomy.attachmentsTokens) }) : null,
            ]),
            h('div', { key: 'a-legend', className: 'dcm-anatomy-legend' }, [
              h('span', { key: 'l-sys', className: 'dcm-legend-item' }, [
                h('span', { className: 'dcm-legend-dot dcm-seg-system' }),
                t('anatomy.system') + ' ' + state.promptAnatomy.percentages.system + '%',
              ]),
              h('span', { key: 'l-tools', className: 'dcm-legend-item' }, [
                h('span', { className: 'dcm-legend-dot dcm-seg-tools' }),
                t('anatomy.tools') + ' ' + state.promptAnatomy.percentages.tools + '%',
              ]),
              h('span', { key: 'l-hist', className: 'dcm-legend-item' }, [
                h('span', { className: 'dcm-legend-dot dcm-seg-history' }),
                t('anatomy.history') + ' ' + state.promptAnatomy.percentages.history + '%',
              ]),
              h('span', { key: 'l-att', className: 'dcm-legend-item' }, [
                h('span', { className: 'dcm-legend-dot dcm-seg-attachments' }),
                t('anatomy.attachments') + ' ' + state.promptAnatomy.percentages.attachments + '%',
              ]),
            ]),
          ]) : null,

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
                    m.known ? (hasUsage ? formatMoney(m.cost) : '—') : t('tokens.not_priced'),
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

          
          // What-If Multi-Model Simulator (#135)
          (() => {
            const simData = (state.modelSimulator && state.modelSimulator.comparisons && state.modelSimulator.comparisons.length > 0)
              ? state.modelSimulator
              : (hasUsage ? simulateModelCosts(turns, total / fx, activeModelName) : null)
            if (!simData || !simData.comparisons || simData.comparisons.length === 0 || !hasUsage) return null

            return h('div', { key: 'simulator-box', className: 'dcm-simulator-box' }, [
              h('div', { key: 's-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 2 } }, [
                h('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '💡 ' + t('simulator.title')),
                h('span', { style: { fontSize: 10, color: 'var(--dsw-alias-label-tertiary)' } }, tokens(simData.totalTokens) + ' tok'),
              ]),
              h('div', { key: 's-desc', style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', marginBottom: 6 } }, t('simulator.desc')),
              h('div', { key: 's-list', style: { display: 'flex', flexDirection: 'column', gap: 3 } },
                simData.comparisons.map((c) => {
                  const localCost = c.simulatedCostUsd * fx
                  return h('div', { key: c.id, className: 'dcm-sim-row' }, [
                    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, [
                      h('span', { style: { color: c.isCurrent ? 'var(--dsw-alias-state-brand-primary)' : 'var(--dsw-alias-label-primary)' } }, c.name),
                      c.isCurrent ? h('span', { className: 'dcm-sim-badge dcm-sim-badge-curr' }, 'current') : null,
                    ]),
                    h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' } }, [
                      h('span', { style: { fontWeight: 500 } }, formatMoney(localCost)),
                      (!c.isCurrent && c.diffPercent !== 0) ? h('span', { className: 'dcm-sim-badge dcm-sim-badge-diff' },
                        (c.diffPercent > 0 ? '+' : '') + c.diffPercent + '%'
                      ) : null,
                    ]),
                  ])
                })
              ),
              simData.bestSavingsVsSonnet ? h('div', { key: 's-savings', className: 'dcm-sim-savings' }, [
                h('span', null, '🎉 ' + t('simulator.savings_vs_sonnet', {
                  savings: formatMoney(simData.bestSavingsVsSonnet.savingsUsd * fx),
                  pct: simData.bestSavingsVsSonnet.savingsPercent,
                })),
              ]) : null,
            ])
          })(),

          h('hr', { key: 'hr3', className: 'dcm-hr' }),

          h('div', { key: 'total', className: 'dcm-total' }, [
            h('span', { key: 'l' }, t('tokens.session_total')),
            h('span', { key: 'v' }, hasUsage ? '≈ ' + formatMoney(total) : '—'),
          ]),

          hasUsage ? null : h('div', { key: 'nodata', className: 'dcm-panel-note', style: { paddingTop: 6 } },
            t('tokens.no_usage_yet')),

          h('div', { key: 'footer-actions', className: 'dcm-export-group' }, [
            h('button', {
              key: 'btn-csv',
              type: 'button',
              className: 'dcm-btn dcm-btn-sm',
              title: t('action.export_csv'),
              onClick: () => {
                const csvData = generateSessionCsv({
                  model: activeModelName || (state.route ? state.route.model : 'model'),
                  provider: activeProvider || '',
                  currency,
                  fx,
                  turns,
                  totalCostUsd: totalUsd,
                })
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = (activeModelName || 'cost-meter') + '-session.csv'
                link.click()
              },
            }, '📥 CSV'),

            h('button', {
              key: 'btn-json',
              type: 'button',
              className: 'dcm-btn dcm-btn-sm',
              title: t('action.export_json'),
              onClick: () => {
                const jsonData = generateSessionJson({
                  model: activeModelName || (state.route ? state.route.model : 'model'),
                  provider: activeProvider || '',
                  currency,
                  fx,
                  turns,
                  totalCostUsd: totalUsd,
                  cacheSavingsUsd: cacheSavedAmount / fx,
                  cacheSavingsPercent: cacheSavedPercent,
                  tier: flat ? 'Flat' : (cheapNow ? t('offpeak') : t('peak')),
                })
                const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = (activeModelName || 'cost-meter') + '-session.json'
                link.click()
              },
            }, '📋 JSON'),

            h('button', {
              key: 'btn-png',
              type: 'button',
              className: 'dcm-btn dcm-btn-sm',
              title: t('action.export_png'),
              disabled: exportingPng,
              onClick: () => {
                setExportingPng(true)
                try {
                  const canvas = document.createElement('canvas')
                  renderSummaryCardToCanvas(canvas, {
                    model: activeModelName || (state.route ? state.route.model : 'model'),
                    provider: activeProvider || '',
                    currency,
                    fx,
                    costUsd: totalUsd,
                    tokens: usage || {},
                    cacheSavingsUsd: cacheSavedAmount / fx,
                    cacheSavingsPercent: cacheSavedPercent,
                    tier: flat ? 'Flat Tariff' : (cheapNow ? ('Off-Peak (' + t('offpeak') + ')') : ('Peak Tariff (' + t('peak') + ')')),
                    turns,
                  })
                  canvas.toBlob((blob) => {
                    setExportingPng(false)
                    if (blob) {
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      link.download = (activeModelName || 'cost-meter') + '-summary.png'
                      link.click()
                    }
                  }, 'image/png')
                } catch (_) {
                  setExportingPng(false)
                }
              },
            }, exportingPng ? t('action.exporting_png') : '🖼️ PNG'),

            h('button', {
              key: 'btn-copy',
              type: 'button',
              className: 'dcm-btn dcm-btn-sm',
              onClick: copyReport,
            }, copied ? t('action.copied') : t('action.copy_report')),
          ]),
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

        // Message action bar token & cost inspector (Issue #120)
        ctx.slots.inject('conversation.chat.assistant-actions', () =>
          ctx.slots.register(
            { name: 'conversation.chat.assistant-actions', id: 'dsh-cost-meter-token-inspector', order: 40, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(MessageTokenAction, { ...p, ctx: (p && p.ctx) || ctx })),
          ),
        )

        // List seat (plugins.item): the seat the Plugins page renders as the plugin's
        // own page with its configuration. The label is a static string on purpose —
        // it is resolved while the page renders, and a locale lookup there would take
        // the whole client batch down with it.
        ctx.slots.inject('plugins.item', () =>
          ctx.slots.register(
            { name: 'plugins.item', id: ROW_ID, order: 20, label: () => 'Cost Meter', locale: NS, inject: () => ({ ctx }) },
            (p) => React.createElement(ErrorBoundary, null, React.createElement(CostMeterCard, { ...p, ctx: (p && p.ctx) || ctx })),
          ),
        )

        // Row seat and the legacy seat kept as fallbacks.
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
      inject: ['slots', 'locale', 'configForms'],
      CostMeterCard,
      CostMeter,
      MessageTokenAction,
      ErrorBoundary,
      ensureStyles,
      minutesUntilChange,
      extremes,
      ratesAt,
      spendBySlots,
      cacheSavingsBySlots,
      fetchWithTimeout,
      getBurnRateSeries,
      simulateModelCosts,
    }

    return module.exports
  },
})

