# Progress: Issue #25 (v0.8.1)

- **2026-09-12 19:10**:
  - Создана Gitea Issue #25.
  - Создан worktree `.worktrees/issue-25` от `origin/main` (ветка `feat/issue-25-perf-and-smart-features`).
  - Инициализированы планы в `docs/plans/`.

- **2026-09-12 19:16**:
  - Реализованы оптимизации в `lib/index.js` (resolveTariffCache, ETag / 304, POST /refresh, budgetThreshold, VENDOR_ALIASES).
  - Реализованы улучшения в `lib/client.js` (O(K) minutesUntilChange, memoized extremes, кнопка синхронизации с cooldown, порог бюджета, плашка экономии, копирование сводки).
  - Добавлены тесты в `test/v081-perf-smart.test.mjs` (все 20 тестов успешно пройдены).
  - Версия поднята до `0.8.1`.
