## [0.8.42] - 2026-11-09

### Fixed
- **Core Cost Attribution**: Calculated actual turn cost (`costDeltaUsd`) and aggregated `sessionTotalUsd` in `lib/projection.js` and `lib/routes.js`, eliminating zero-cost propagation to agent attribution, velocity, and burn-rate projections (Issue #181).
- **Persistent Storage Wiring**: Fully wired `recordSpend`, `recordTagSpend`, and `recordCacheActivity` on token usage events, keeping budget records, client billing tags, and cache keep-alive TTL countdowns synchronized with actual turns (Issue #181).
- **Code Quality & Error Resilience**: Replaced 9 empty `catch {}` blocks across host and client modules with resilient error handling avoiding silenced runtime failures (Issue #181).
- **Test Coverage**: Added `test/issue-181-audit-fixes.test.mjs` verifying accurate cost estimation, storage recording, and zero empty catches across `lib/` (175 tests passing total).

## 0.8.41

### Fixed
- **React Error #310 Hooks Order Invariant (#179)**:
  - Eliminated Minified React Error #310 ("Rendered more hooks than during the previous render") by moving desktop tariff notification hook unconditionally to the top of `CostMeter` before any component early returns (`if (!state) return null`, `if (!showHeaderChip) return null`, and fallback chip return).
  - Added regression test `test/issue-179-react-310.test.mjs` verifying that all hooks in `CostMeter` appear strictly before any return statements.

## 0.8.40

### Added
- **Subagent & Multi-Agent Hierarchical Cost Attribution (#127)**:
  - Added `lib/agents.js` with `extractAgentMeta` and `getAgentsSpendReport` to track `agentId`, `role`, and `subagentName` from DSH session event metadata.
  - Enriched `turnRecordSchema` and projection turns to attribute input, cache, and output tokens per individual agent (e.g. Root coordinator, Researcher, Coder, Reviewer).
  - Added hierarchical agent spend table in the Cost Meter popover displaying token counts, localized cost, percentage of session spend, and top-spender highlights.
  - Guaranteed total session cost integrity by normalizing and prorating agent costs against the session total.
- **Prompt Cache Optimization Advisor (#130)**:
  - Added `lib/advisor.js` with `analyzeCacheEfficiency` implementing proactive heuristics for conversational sessions with 5+ turns.
  - Detects suboptimal cache hit rates (< 40%) and provides actionable advice ("Tip: Pin static system prompts and tool schemas at the head of your context to increase cache hit ratio to 80%+ and cut costs by up to 50%").
  - Added compact, non-intrusive notification badge and advice card in the Cost Meter popover.

## 0.8.39

### Added
- **Prompt Cache Keep-Alive Pre-Warming Scheduler (#158)**:
  - Added `lib/warmup.js` with `getCacheTtlStatus` and `performCacheWarmup` to prevent prompt cache expiration (5–10 min provider TTL) during conversational pauses, preserving up to 90% prompt discounts.
  - Added configurable `cacheKeepAliveEnabled`, `cacheTtlMinutes` (1–60 min), and `cacheMaxInactivityMinutes` (safety idle cut-off at 30 min).
  - Added dedicated endpoint `POST /dsh-cost-meter/warmup` and live cache TTL countdown with manual "Pre-warm" button in the Cost Meter popover.
- **Client Billing Codes and Multi-Tenant Project Tagging (#157)**:
  - Added `lib/tags.js` for assigning session costs to project/client cost centers with persistent storage at `~/.dsh/storages/dsh-cost-meter-tags.json`.
  - Added endpoints `POST /dsh-cost-meter/session-tag` and `GET /dsh-cost-meter/tags` for dynamic tagging and spend attribution reports.
  - Added `defaultSessionTag` configuration and active billing tag pill in the conversation popover.

## 0.8.38

### Added
- **Prometheus & OpenTelemetry Metrics Exporter Endpoint (`/dsh-cost-meter/metrics`)**: Added exporter endpoint outputting Prometheus standard exposition format (v0.0.4) for integration with Prometheus, Datadog, Grafana Agent, and OpenTelemetry collector. Exports metrics including `dsh_cost_total_usd`, `dsh_tokens_total` (by bucket), `dsh_session_burn_rate_usd_hour`, `dsh_cache_hit_ratio`, `dsh_budget_daily_limit_usd`, `dsh_budget_daily_spent_usd`, `dsh_budget_monthly_limit_usd`, `dsh_budget_monthly_spent_usd`, `dsh_budget_auto_paused`, and catalog metadata (#153).
- **Daily and Monthly Hard Spending Caps with Auto-Pause**: Added persistent spend tracking across daily and monthly rolling windows stored safely in `~/.dsh/storages/dsh-cost-meter-budget.json`. Supported configurable `dailySpendLimitUsd`, `monthlySpendLimitUsd`, and `budgetHardBlock` with automatic day/month rollover handling and visual progress indicators in the UI popover and settings card (#134).

## 0.8.25

### Changed
- **Model Name Display Only**: Stripped provider prefixes (e.g. `ollama-cloud / `) across all UI surfaces (chip tooltip, popovers, diagnostics, session report), displaying solely the clean model name (#113).
- **Dynamic Active Session Model Binding**: Subscribed CostMeter to DSH's `modelSelection` projection (`next` / `lastUsed`) and passed `currentRoute` query parameter to `/dsh-cost-meter/state`, ensuring the header chip immediately tracks the model selected in the chat rather than remaining frozen on the server default route (#113).
- **Tariff Fallback & Suffix Prefix Matching**: Relaxed `matchModel` catalog lookup to fall back to the first available catalog candidate when custom providers are used, and added prefix matching for short model names like `beam` to match OpenRouter entries (#113).

## 0.8.22

### Added
- **Minimalist Pill Mode**: Added configurable `displayMode: z.union(['auto', 'full', 'compact'])` in `Config` and UI settings card, allowing users to collapse the header chip into a minimalist compact pill (`● ₽42.50`) (#96).
- **Responsive Mobile Styling**: Added `@media (max-width: 768px)` stylesheet rules hiding the timer and constraining popover panel width (`width: min(320px, calc(100vw - 32px))`) to eliminate horizontal scrolling on mobile viewports (#96).

## 0.8.21

### Added
- **Burn Rate & Cost Projection**: Added dedicated `lib/analytics.js` calculating `burnRatePerHourUsd` and session `projectedCostUsd` with zero-division protection and initial-turn stability safeguards (#95).
- **Session Telemetry State**: Extended `GET /dsh-cost-meter/state` with `burnRatePerHourUsd` and `projectedCostUsd` fields (#95).
- **UI Projection Box**: Rendered live burn rate and projected final cost directly in the popover panel in user-selected currency (#95).

## 0.8.20

### Added
- **Mini Sparkline**: Added native SVG step dynamics chart in the popover panel (`lib/client.js`), rendering token and cost distribution across session steps with interactive tooltips and peak step highlighting without external chart dependencies (#94).
- **Session Turns History**: Added turn and step tracking in `usageByModelProjection` (`lib/projection.js`) with deduplication across streaming chunks and a bounded memory history capped to the last 30 turns (`MAX_TURNS_HISTORY = 30`), exposed via `GET /dsh-cost-meter/state` (#94).

## 0.8.19

### Added
- **Live Foreign Exchange (FX) Rates**: Added dedicated `lib/fx.js` module automatically fetching live currency exchange rates from the Bank of Russia (CBR daily API) with fail-safe fallback to open.er-api.com and persistent offline disk caching in `~/.dsh/storages/dsh-cost-meter-fx.json`.
- **Configurable Auto-FX**: Introduced `autoFxRate: z.boolean().default(true).volatile()` in `Config` schema, ensuring non-USD currency spends (RUB, EUR, CNY) reflect real-world exchange rates without requiring manual rate updates (#93).

## 0.8.18

### Added
- **Prompt Cache Savings Meter**: Added `calculateCacheSavings(usage, rates)` in `lib/tariff.js` and `cacheSavingsBySlots(slots, schedule)` in `lib/client.js`. Accurately calculates dollar and percentage savings gained from prompt cache hits across single and multi-model sessions with peak/off-peak windows, surfacing savings directly in the header chip tooltip and copyable session report (#92).

## 0.8.17

### Security
- **Strict Connection Authentication Boundary**: Integrated canonical DSH `connection.requestRejection(request)` verification inside `isTrustedCaller`, enforcing fail-closed rejection against unauthorized LAN callers and external clients attempting to read telemetry state or trigger catalog refetches without valid DSH session credentials (#89).

### Fixed
- **Startup Volatile Box Unwrapping & Config Normalization**: Added `normalizeConfig()` wrapping `unwrapVolatile()` on plugin boot, in settings hydration, and in route handlers. Guarantees scalar primitives for `currency`, `usdRate`, `displayTimeZone`, and `budgetThreshold`, preventing raw `Volatile` reference boxes from leaking into routes and serializing as `{}` or `NaN` (#89).

## 0.8.16

### Fixed
- **Client Fetch Timeouts & Component Unmount Cancellation**: Wrapped all 5 client fetch requests (`/update` GET/POST, `/state` polling/diagnostics, `/refresh` POST) in `fetchWithTimeout` using `AbortSignal.timeout` and component unmount abort signals, eliminating hung requests and persistent loading indicators on network latency (#73).
- **Facade Decomposition & Modularity**: Decomposed `lib/index.js` into modular `lib/projection.js` (per-model token bucket projections) and `lib/routes.js` (HTTP route handlers), reducing `lib/index.js` to 288 LOC (< 320 LOC requirement) while preserving all public exports and complete backward compatibility (#74).

## 0.8.15

### Fixed
- **Session Projection Effect Disposer**: Wrapped `sessionProjections.register` into an `effect` registration with safe fallback, ensuring proper cleanup upon plugin reload without state leaks (#71).
- **Service Injection & Peer Dependencies Declaration**: Added `settings` and `sessionProjections` to `export const inject` and declared `@deepseek-ai/dsh-host-webserver`, `@deepseek-ai/dsh-session-projection`, `@deepseek-ai/dsh-settings` in `peerDependencies` (#72).

## 0.8.14

### Fixed
- **Settings Surface Publication on DSH 0.2**: Marked all configurable `Config` fields with `.volatile()` and ensured `.volatile()` helper prototype exists, enabling DSH 0.2 settings service to publish the `dsh-cost-meter` card and accept UI edits (#62).
- **SettingsForms Migration & Live Document Updates**: Migrated settings descriptor resolution to `describe({ redactSecrets: true })` array pattern and replaced dead `settings/updated` event listener with `settings/document-updated` to hydrate live config without restarting the plugin (#63, #64, #65, #69).

## 0.8.13

### Fixed
- **Volatile Reference Unwrapping in Tariff Engine**: Recursively unwrap cosmokit / Schemastery `Volatile<T>` reference boxes in tariff rate calculations (`perMillion`, `overrideBucket`, `resolveTariff`), preventing `NaN` and silent zero-pricing (#67).
- **Peak Windows Iterable Guard**: Safely validate that `manualPeakWindowsUtc` is an array before iteration, avoiding runtime `TypeError` when wrapped in volatile boxes (#67).

## 0.8.12

### Security
- **Strict Host Header Origin Validation**: Removed unverified `x-forwarded-host` parsing in `isTrustedCaller` to prevent Host/Origin header spoofing from untrusted remote callers (#70).
- **Protected State Route**: Applied `isTrustedCaller` guard to `GET /dsh-cost-meter/state` to prevent cross-origin extraction of configured tariffs, model mappings, and spend budget limits (#66).
- **Body-less HEAD Responses**: Corrected `registerPluginUpdater` handler to emit headers only without JSON payload on HTTP `HEAD` requests (#68).

## 0.8.11

### Security
- **DSH Desktop Support in Write Route Guard**: Allowed non-http/https Referer and Origin schemes (e.g. `dsh-app://app/`) in `isTrustedCaller` when requests originate from a loopback socket (`127.0.0.1`, `::1`), restoring full functionality of the cost widget and catalog refresh in DSH Desktop while continuing to reject non-loopback external callers with custom schemes (#75).

## 0.8.10

### Security
- **Strict Write Route Trust Check**: Hardened `isTrustedCaller` to validate `sec-fetch-site` before loopback socket shortcut, preventing cross-site state mutations on `POST /dsh-cost-meter/refresh` routed via loopback reverse proxies and bridges (#35).

### Fixed
- **Session Projection Contract Alignment**: Updated projection service injection to `sessionProjections` and aligned `usageByModelProjection` with the modern DSH contract (`stateVersion: 2`, `stateSchema`, `wire: { viewSchema, view }`), ensuring `costByModel` projection data is delivered to the Web UI (#58).
- **SettingsForms Lifecycle Migration**: Removed legacy `settings.register()` call that broke child fibers in modern DSH core. Migrated to `settings/updated` and `settings/document-updated` lifecycle events with safe `describe()` fallback for tariff cache invalidation (#59).

## 0.8.9

### Fixed
- **Tariff Window Zero Overrides**: Fixed schedule calculation where explicit zero rates in discount windows (e.g. free night tiers) were erroneously overridden by non-zero base rates (#52).
- **Catalog Suffix Matching Disambiguation**: Enhanced model suffix matching in the catalog to disambiguate by provider prefix when multiple catalog entries share the same model name, avoiding arbitrary selection (#53).

### Refactored
- **Modular Tariff Engine**: Extracted catalog pricing, rate normalization, window parsing, and model matching into an independent `lib/tariff.js` module (236 LOC), bringing `lib/index.js` down to 440 LOC and fully satisfying the 600 LOC modularity standard (#48).

## 0.8.8

### Fixed
- Settings no longer wait on the removed settingsScope service. The client uses configForms (#54).

# Changelog

## 0.8.37

### Security & Quality Fixes
- **CLI Input Validation**: Validated `--port` parameter (strictly integer 1-65535) and restricted `--url` parameter strictly to `http:` and `https:` protocols.
- **DoS Protection in State Route**: Bounded `extraRoutes` query parameters to a maximum of 50 routes per request to prevent compute starvation.
- **Robust Trailer Parsing**: Constrained git trailer regex parsing to the trailing message paragraph in accordance with RFC 2822 conventions to eliminate false positives in message bodies.
- **Bounds Sanitization in Middle-Truncation**: Enforced positive integer bounds on `headLines`, `tailLines`, and `maxTokens` to eliminate backwards array slice edge cases.

## 0.8.36

### Added
- **Git Commit Trailer Cost Attribution (#143)**:
  - Added `lib/git-trailer.js` generating standard RFC-compliant Git trailers (`Token-Cost`, `Tokens-Input`, `Tokens-Output`, `Tokens-Cache-Hit`, `Model`) for commits created during agent sessions.
  - Implemented `appendCostTrailers` and `parseGitCommitTrailers` for appending and extracting financial metadata from commit logs.
  - Added configurable toggle `gitCommitTrailers` in `Config` schema and `CostMeterCard` settings.
- **Smart Middle-Truncation Context Protection (#154)**:
  - Added `lib/truncation.js` implementing `smartMiddleTruncate` to auto-compact oversized tool outputs (e.g. huge git diffs or test logs) while preserving critical head and tail diagnostics.
  - Added configurable threshold (`truncationMaxTokens`) and enable/disable toggle (`smartTruncation`) in plugin settings card.
  - Added dollar savings estimation (`calculateTruncationSavings`).

## 0.8.35

### Added
- **Command-Line Interface (CLI) Utility (#140)**:
  - Added standalone executable `bin/dsh-cost-meter.js` (invokable via `dsh-cost-meter` or `npx @goodandready/dsh-cost-meter`).
  - Formatted terminal table output displaying live session spend, active model/provider, context saturation, active tariffs, velocity, and trajectory forecast.
  - Supports `--json` for CI/CD and automation scripts, `--port <port>`, and `--url <url>`.
- **Automated Context Diagnostic Snapshot on Cost Spikes (#159)**:
  - Added `captureDiagnosticSnapshot` in `lib/analytics.js` capturing turn index, token delta, velocity, highest-cost turn, and reason when velocity spikes are triggered.
  - Exposes `latestSnapshot` in server state and displays a diagnostic snapshot inspection card (`dcm-snapshot-box`) in the popover telemetry.

## 0.8.34

### Added
- **Predictive Final Cost Forecasting Based on Moving Trajectory (#148)**:
  - Added `calculateAdvancedTrajectoryForecast` in `lib/analytics.js` predicting final session cost using moving average step cost and acceleration trend detection.
  - Computes predictive cost bounds (`minCostUsd` – `maxCostUsd`), confidence rating (`high` / `medium` / `low`), and trend direction (`Accelerating`, `Stable`, `Decelerating`).
  - Rendered dedicated Trajectory Forecast card (`dcm-forecast-box`) in the session popover telemetry.
- **Cost-Driven Dynamic Context Pruning Advisor (#147)**:
  - Added `evaluatePruningTriggers` scanning conversation history for bloated past turns (>4,500 tokens of file dumps or tool responses).
  - Identifies prune candidate step indices and computes estimated dollar savings per subsequent step.
  - Interactive advisory banner (`dcm-pruning-box`) alerting the user when context overhead exceeds threshold with actionable step guidance.

## 0.8.33

### Added
- **What-If Multi-Model Cost Comparator Simulator (#135)**:
  - Added `simulateModelCosts` computing session cost if identical tokens were processed by industry reference models (DeepSeek V3, DeepSeek R1, Claude 3.5 Sonnet, GPT-4o, GPT-4o Mini).
  - Compact simulator card in the session popover displaying model-by-model cost in local currency, percentage diffs, and active model marker.
  - Highlights real-world financial savings vs Claude 3.5 Sonnet (e.g. *"Saved $2.14 (78%) vs Claude 3.5 Sonnet"*).
- **Token Burn Rate Velocity Chart (#151)**:
  - Added `getBurnRateSeries` generating per-turn token and cost metrics with automatic spike detection (>2.2x baseline or >12,000 tokens).
  - Responsive inline SVG sparkline chart in session popover visualizing context accumulation and turn-by-turn velocity with interactive tooltips.
  - Zero-hex styling strictly leveraging theme variables (`var(--dsw-alias-...)`) and `color-mix(...)`.

## 0.8.32

### Added
- **Prompt Token Anatomy Inspector (#138)**:
  - Added `analyzePromptAnatomy` decomposing session context into four categories: System prompt, Tools schema, Chat history, and Attachments/Current prompt.
  - Rendered a multi-segment visual progress bar (`dcm-anatomy-bar`) in the popover panel with token counts and proportional percentages.
  - Interactive legend identifying the biggest context contributors (e.g. oversized MCP tool declarations vs conversation history).
- **Redundant Token & Loop Waste Detector (#145)**:
  - Added `detectTokenWaste` analyzing consecutive conversation turns for unchanged large file dumps (>4000 tokens) and cyclical command repetitions.
  - Quantifies wasted token count and computes dollar cost leakage based on active model tariffs.
  - Contextual banner in popover panel with proactive remediation recommendations (`/compact` or pruning history).

## 0.8.31

### Added
- **Cost Velocity Anomaly Detection & Runaway Loop Alert (#129)**:
  - Added `calculateCostVelocity` in `lib/analytics.js` computing dynamic burn velocity ($/min) and average recent step cost across turns.
  - Automatic runaway loop detector flagging abnormal spending spikes (e.g. > $0.50/min, 3x session baseline, or > $0.40/step).
  - Emergency alert badge on header chip with pulsating danger border (`dcm-chip-runaway`), warning tooltip, and prominent alert banner in popover panel.
  - Live velocity telemetry indicator (`Velocity: $X.XX/min`) in popover telemetry projection box.
- **Radial SVG Donut Progress Ring (#161)**:
  - Added zero-overhead SVG radial donut ring (`StatusRing`) wrapping the chip status dot with smooth 0.4s `stroke-dashoffset` CSS transitions.
  - Real-time visual progress showing session budget consumption (when `budgetThreshold` is set) or context window saturation.
  - Three-tier adaptive color shifts: Green/neutral (<70%), Warning yellow (70–90%), Danger red (≥90% or velocity anomaly).
  - Full accessibility compliance respecting `prefers-reduced-motion` and strict theme variable styling.

## 0.8.30

### Fixed
- **Settings Card Initial Render Crash (#168)**:
  - Eliminated `TypeError: Cannot read properties of null (reading 'currency')` when opening the plugin settings panel (`plugins.item`) before `draft` state is populated.
  - Replaced fragile ternary patterns with safe optional chaining (`draft?.currency ?? ''`) across all form inputs and select elements.
  - Added loading placeholder (`settings.loading`) while `status === 'loading' || !draft`.
  - Added dedicated UI section for Widget Visibility & Privacy Settings, persisting `showHeaderChip`, `showMessageAction`, `privacyMode`, and alert parameters in `save()`.

## 0.8.29

### Added
- **Context Window Saturation Gauge & Compaction Risk Indicator (#137)**:
  - Added `calculateContextMetrics` and model context limits database `getFallbackContextLength` supporting DeepSeek (64k-128k), Claude (200k), GPT-4o (128k), Gemini (1M-2M), Qwen (32k-1M), Mistral, and Llama series.
  - Visual saturation progress bar (`dcm-ctx-gauge`) in popover telemetry with risk thresholds: Low (<70%, green/neutral), Moderate (70-90%, warning yellow), and High (≥90%, danger red).
  - Turn base-cost estimate: dynamically computes the token baseline cost for the subsequent prompt turn based on accumulated context history.
  - Compaction risk warning banner alerting users before conversation truncation or auto-compaction occurs.
- **Smooth Odometer Cost Counter Animation During Streaming (#141)**:
  - Added 60fps requestAnimationFrame cubic-eased ticker (`AnimatedCost` / `useAnimatedNumber`) for fluid price transitions during token streaming.
  - Full accessibility compliance respecting `prefers-reduced-motion: reduce` with instant number updates.
  - Isolated render lifecycle preventing Rules of Hooks violations and preserving lightweight CPU footprint.

## 0.8.28

### Added
- **Reasoning & Thinking Tokens Metering (#144)**:
  - Separate detection and extraction of reasoning/thinking tokens across provider schemas (`completion_tokens_details.reasoning_tokens`, `reasoningTokens`, `details.reasoning_tokens`).
  - Added `reasoningTokens` in turn records and `usageByModelProjection`.
  - Added `Reasoning_Tokens` column in CSV export with UTF-8 BOM, structured JSON output, and Canvas PNG summary card.
  - Interactive `🧠 Thinking: {tokens}` chip in the per-turn inspector (`MessageTokenAction`) and turn history breakdown.
  - Added thinking tokens metric in `/cost receipt` markdown table.
- **Streamer / Privacy Mode (#121)**:
  - Added volatile `privacyMode` toggle (`👁️` / `🕶️`) in the header popover toolbar and settings card.
  - Masks financial spends with asterisks (`$••••`) across all visible UI surfaces while keeping token metrics and sparkline dynamics visible.
  - Live zero-reload reactivity and persistent setting storage.
- **Independent UI Element Visibility Settings (#165)**:
  - Independent volatile settings `showHeaderChip` (default `true`) and `showMessageAction` (default `true`) in `Config` and UI settings card.
  - Allows hiding the header chip or message action button while background token & cost tracking continues uninterrupted.
  - Guaranteed alternative access to session stats and diagnostics via the plugin settings card (`plugins.item`) and `/cost` slash command.

## 0.8.27

### Added
- **Multi-format session cost export (#118)**:
  - Export session and turn-by-turn cost history to CSV (`generateSessionCsv`) with UTF-8 BOM (`﻿`) and CSV formula injection protection (`sanitizeCsvCell` for `=`, `+`, `-`, `@`, `	`, `
` mitigating CWE-1236).
  - Export structured session report to JSON (`generateSessionJson`) with schema versioning, model usage breakdown, and cache savings metrics.
  - High-resolution HTML5 Canvas PNG summary card generator (`renderSummaryCardToCanvas`) with modern gradient background, key KPIs, and token distribution.
  - Export toolbar buttons (`📥 CSV`, `📋 JSON`, `🖼️ PNG`) added to the popover session analytics view.
- **In-popover instant currency switcher (#131)**:
  - Instant currency selection chips in popover header (`$`, `¥`, `₽`, `€`) with zero-reload dynamic spend recalculation.
  - Automatic exchange rates synchronization using Bank of Russia (CBR daily API) cached data via `/dsh-cost-meter/state`.
  - Persists selected currency preference into plugin settings scope.
  - Full EN and ZH localized strings for export formats and currency actions.

## 0.8.26

### Added
- **Pre-switch tariff alerts & desktop notifications (#117)**:
  - Visual pulse animation on chip (`dcm-chip-alert-peak` / `dcm-chip-alert-offpeak`) and popover alert banner before peak and off-peak tariff switch.
  - Configurable alert lead time (1, 2, 5, 10 minutes, default 5 min).
  - Optional desktop browser notifications via HTML5 Web Notifications API (`Notification.requestPermission`) with 'Test Notification' button in settings.
- **Per-turn token & cost inspector (#120)**:
  - Integrated into assistant message action bar slot (`conversation.chat.assistant-actions`) with one-click token badge.
  - Detailed modal inspector displaying exact turn metrics: uncached input, cache read (hit %), output, generation duration, and cost delta.
  - Interactive turn history breakdown list inside the main header popover under sparkline.
- **Slash command `/cost` and `/cost-summary` (#125)**:
  - Built-in slash commands `/cost` (alias `/cost-summary`), with subcommands `receipt`, `summary`, `reset`, `help`.
  - Structured Markdown receipt table detailing session spend, token breakdown, cache savings %, active tariff tier, and burn rate.

## [0.8.24] - 2026-10-21

### Security
- **LAN Authentication Guard**: Blocked unauthenticated LAN access to `GET /dsh-cost-meter/state` and `POST /dsh-cost-meter/refresh`. Disallowed trusting `Sec-Fetch-Site: same-origin` without matching `Origin`/`Host` or loopback; enforced fail-closed behavior when connection service is unavailable for remote callers (#107).

## [0.8.23] - 2026-10-20

### Fixed
- **UI TDZ ReferenceError**: Resolved runtime `ReferenceError: Cannot access 'state' before initialization` in `CostMeter` component on DSH Desktop and WebUI (#108).
- **Popover Sparkline & Projection Placement**: Correctly integrated `renderSparkline` and hourly burn rate / cost projection within the popover panel.

Notable changes to `@goodandready/dsh-cost-meter`.

## 0.8.6

### Fixed
- **Settings Reactivity & Scope Binding**: Unified `CostMeter` chip settings reading with the canonical DSH pattern (`scope = settingsScope.bind({ namespace: NS })` + `useSyncExternalStore`), preventing reactivity desync between the header chip and settings card when changing currency or budget thresholds (#47).
- **Settings Card Hardcoded Version Reset**: Removed hardcoded `currentVersion: '0.8.3'` initial state in `CostMeterCard`, ensuring the updater status displays a clean placeholder until dynamically refreshed from `/dsh-cost-meter/update` (#46).

## 0.8.5

### Fixed
- **Settings reachable again on the plugin's own page**: the current DSH core
  (0.1.6-alpha.2) renders a plugin's configuration page only for entries registered
  in the plugin-list seat `plugins.item`. `CostMeterCard` is now registered there
  (`id: 'dsh-cost-meter'`, order 20, static label) alongside the row seat and the
  legacy card, and its page view renders the form open (`page || open`) instead of
  collapsed.

## 0.8.4

### Fixed
- **Settings reachable again**: the card registered into `settings.plugin.item`, a
  slot the current DSH core (0.1.6-alpha.2) no longer renders, so the plugin's
  settings were unreachable. The surface now registers into the Plugins page row
  seat `plugins.row.config`, keyed `@goodandready/dsh-cost-meter#dsh-cost-meter`
  (`rowConfigKey(package, rowId)`): the plugin's row gains a configure control whose
  page is the settings form (`view: 'page'`, open and without our card chrome — the
  host page draws the title, icon, crumb and padding) plus a one-line state for
  `view: 'summary'`. The legacy seat stays registered as a fallback for older cores.

### Added
- This changelog.
