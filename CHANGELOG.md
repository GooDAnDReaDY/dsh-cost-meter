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
