# Technical Findings (Issue #21)

## 1. Config Fields Breakdown
The plugin `Config` defines 10 fields:
1. `currency` (string, default '$') -> Present in UI
2. `usdRate` (number, default 1) -> Present in UI
3. `displayTimeZone` (string, default 'Europe/Moscow') -> Present in UI
4. `useOpenRouter` (boolean, default true) -> Missing in UI -> To be added as a checkbox in `CostMeterCard`
5. `refreshHours` (number, default 24) -> Missing in UI -> To be added as a numeric input in `CostMeterCard`
6. `modelMap` (dict of string -> string) -> Advanced JSON/YAML route mapping
7. `prices` (dict of PriceRow) -> Advanced manual pricing rules
8. `deepseekPeakPrices` (dict of PriceRow) -> Advanced DeepSeek peak overrides
9. `manualPeakWindowsUtc` (array of string) -> Advanced manual time windows
10. `manualOffPeakMultiplier` (number) -> Advanced discount multiplier for manual rates

By adding `useOpenRouter` and `refreshHours` to `CostMeterCard`, all 5 primary scalar/control settings are directly configurable in the DSH Settings GUI. The 5 advanced structured override rules (`prices`, `modelMap`, `deepseekPeakPrices`, `manualPeakWindowsUtc`, `manualOffPeakMultiplier`) are explicitly documented in README.md and DESIGN.md as YAML configuration rows.

## 2. Service Access Pattern
In `lib/index.js`, we have:
`const settings = ctx.get('settings')` (canonical).
In `lib/client.js`, `ctx.settingsScope` is accessed directly. We should safely check `(ctx.get && ctx.get('settingsScope')) || ctx.settingsScope || (ctx.services && ctx.services.settingsScope)`.
Same for `ctx.locale` and `ctx.slots`.
