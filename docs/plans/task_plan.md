# Task Plan: Refactor dsh-cost-meter for stability, simplification & performance

- **Issue**: Gitea #17
- **Worktree**: `.worktrees/refactor-stability`
- **Branch**: `refactor/stability-and-quality`

## Phases

- [ ] **Phase 1: Architecture & Overengineering Cleanup**
  - Remove `zod` dependency from `lib/index.js`, standardize on `@deepseek-ai/schemastery`.
  - Remove dynamic fragile `require('@deepseek-ai/dsh-client-ui-primitives')` from `lib/client.js`, standardize on clean native inline SVG chevron.
  - Remove race-prone `setTimeout(..., 500)` fallback slot registration in `lib/client.js`.
- [ ] **Phase 2: Fault Tolerance & Safe Caching**
  - Wrap catalog filesystem operations (`mkdirSync`, `writeFileSync`, `readFileSync`) in safe `try/catch`.
  - Add safe error catching in `lib/client.js` for `/dsh-cost-meter/state` fetch to prevent console error spam on DSH reload.
- [ ] **Phase 3: Performance & Settings Reactivity**
  - Implement in-memory catalog index Map in `lib/index.js` for O(1) model rate lookups.
  - Subscribe to `settingsScope` updates in `lib/client.js` to dynamically refresh currency and USD rate without reload.
- [ ] **Phase 4: Verification, Tests & Documentation**
  - Run regression test suite `npm test` and add tests for schema validation and safe catalog failure.
  - Update `docs/design/DESIGN.md` and release notes for v0.7.7.
- [ ] **Phase 5: Release Gate & Production Rollout**
  - Test on MiniPC test server (`192.168.1.123:3082`).
  - Merge PR, tag v0.7.7, publish to npm & GitHub release.
  - Deploy to production web profile on MiniAI (`192.168.1.111:3080`).
