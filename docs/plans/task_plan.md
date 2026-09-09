# Task Plan: Stability, Race Condition Prevention & TimeZone Validation (v0.7.8)

## 1. Goal
Strengthen `@goodandready/dsh-cost-meter` runtime resilience:
- Prevent race condition response overwrites in browser `CostMeter` component.
- Validate IANA TimeZone inputs in `CostMeterCard` settings before saving.
- Sanitize `models` query parameter keys in `lib/index.js` route handler.
- Maintain strict backward compatibility, zero regression in automated tests.

## 2. Checklist
- [ ] Bump version to `0.7.8` in `package.json`
- [ ] Implement cancellation flag / abort protection in `lib/client.js` `CostMeter`
- [ ] Implement `isValidTimeZone` helper and validation check in `CostMeterCard`
- [ ] Implement key sanitization (length <= 128 chars, alphanumeric/dash/slash) in `lib/index.js`
- [ ] Add unit tests for timezone check and query sanitization
- [ ] Run test suite (`npm test`)
- [ ] Update `docs/design/DESIGN.md`
- [ ] Conventional Commit & Push
- [ ] Gitea PR & Merge to `main`
- [ ] Test on MiniPC test server (`192.168.1.123`)
- [ ] Production Smoke Verification on MiniAI (`192.168.1.111`)
- [ ] Publish Tag `v0.7.8`, GitHub Release & npm
- [ ] Update production profile from npm
- [ ] Close Gitea Issue #19 and clean up worktree
