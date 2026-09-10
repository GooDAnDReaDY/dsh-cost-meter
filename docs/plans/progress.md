# Progress Log (Issue #21 / v0.7.9)

- [x] Analyze Issue #21
- [x] Create worktree `.worktrees/issue-21`
- [x] Initialize plans (`task_plan.md`, `findings.md`, `progress.md`)
- [x] Bump version to 0.7.9 in `package.json`
- [x] Implement settings card additions (`useOpenRouter`, `refreshHours`) in `lib/client.js`
- [x] Safe service resolution with `ctx.get('...')` in `lib/client.js`
- [x] Update documentation with full 10-field matrix (`README.md`, `docs/README.ru.md`, `docs/design/DESIGN.md`)
- [x] Add regression test `test/settings-card-fields.test.mjs` (12/12 passing)
- [ ] Commit changes with conventional commits (`git-antigravity`)
- [ ] Create Pull Request and merge into `main`
- [ ] Test package on MiniPC isolated test server (`192.168.1.123:3082`)
- [ ] Smoke-test package on production candidate (`192.168.1.111:3080`)
- [ ] Publish v0.7.9 to npm and GitHub Release
- [ ] Install v0.7.9 from npm on MiniAI and verify live health
- [ ] Close Gitea Issue #21 and clean up worktree
