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
