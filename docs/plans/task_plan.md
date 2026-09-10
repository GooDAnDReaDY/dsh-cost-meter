# Task Plan: Address Issue #21 (Settings Card Schema Fields & Service Access)

## 1. Goal
Fulfill Gitea Issue #21 requirements:
1. **Schema Fields Availability in Settings Card**:
   - Audit all 10 fields of `Config`:
     - UI fields: `currency`, `usdRate`, `displayTimeZone`.
     - Boolean toggle: `useOpenRouter` (checkbox / toggle in settings card).
     - Numeric: `refreshHours` (catalog refresh frequency, e.g. 24 hours).
     - Complex structured overrides: `prices` (dict), `modelMap` (dict), `deepseekPeakPrices` (dict), `manualPeakWindowsUtc` (array), `manualOffPeakMultiplier` (number).
     - Add `useOpenRouter` and `refreshHours` directly to the `CostMeterCard` form so all scalar/toggle configuration is editable in GUI.
     - Document structured dict/array fields (`prices`, `modelMap`, `deepseekPeakPrices`, `manualPeakWindowsUtc`, `manualOffPeakMultiplier`) in documentation, READMEs and DESIGN.md as YAML-only/advanced configuration rows.
2. **Context Service Access Hygiene**:
   - Inspect all `ctx.settings` / `ctx.settingsScope` / `ctx.locale` / `ctx.webServer` calls.
   - Use `ctx.get('...')` or inject where appropriate, or guard against undefined proxiable properties.
3. **Locale & Translations**:
   - Provide clean English locale strings as canonical with ru dictionaries, and hint descriptions for all new fields.

## 2. Checklist
- [ ] Bump version to 0.7.9 in `package.json`
- [ ] Add `useOpenRouter` and `refreshHours` fields to `CostMeterCard` in `lib/client.js`
- [ ] Update `en` and `ru` dictionaries for new fields
- [ ] Audit and refine service accesses in `lib/index.js` and `lib/client.js`
- [ ] Update `README.md`, `docs/README.ru.md`, `docs/README.zh.md`, and `docs/design/DESIGN.md`
- [ ] Add unit test verifying settings card field contract
- [ ] Run `npm test` (all tests passing)
- [ ] Conventional commit & push
- [ ] Gitea PR & merge
- [ ] Test on MiniPC test server (`192.168.1.123`)
- [ ] Install on production MiniAI (`192.168.1.111`) & verify
- [ ] Release v0.7.9 on GitHub & npm
- [ ] Close Issue #21 & cleanup worktree
