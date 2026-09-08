# Technical Findings & Architecture Decisions (v0.7.7)

## 1. Zod Usage Rationale
- `zod` is used in `lib/index.js` for `usageByModelProjection`:
  DeepSeek Harness core projection machinery requires `.parse(view)` method on projection schemas for runtime boundary contract validation. Schemastery does not provide `.parse()`, so `zod` is strictly required here and is not overengineering.

## 2. Browser Reactivity & Settings
- Reactivity in browser UI (`lib/client.js`):
  Using `React.useSyncExternalStore` connected to `ctx.settingsScope` allows instant updates of `currency` and `usdRate` in the header chip and popover without needing a page refresh or roundtrip state reload.

## 3. Slot Hygiene
- Cleaned up slot injection in `lib/client.js`:
  Removed `setTimeout(..., 500)` fallback registering `settings.section`. The standard `settings.plugin.item` slot cleanly renders the settings card inside the Harness Settings view.

## 4. Style Isolation & Deduplication
- Added `data-dsh-plugin="dsh-cost-meter"` attribute to injected `<style>` tags to adhere to DSH UI design guidelines and prevent duplicate stylesheets.
