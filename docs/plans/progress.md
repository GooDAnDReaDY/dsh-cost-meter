<!-- id: issue-23-progress -->
# Progress: Issue #23 — Стабилизация кода и редизайн UI по стандарту dsh-clinebot

- [x] Создана Issue #23 в Gitea
- [x] Создан worktree `.worktrees/issue-23` на ветке `feat/stability-and-ui-clinebot`
- [x] Инициализированы файлы планирования (`task_plan.md`, `findings.md`, `progress.md`)
- [x] Применены серверные исправления (`lib/index.js`):
  - [x] Инициализация `byLowerId` в начальном состоянии `catalog.index` (устранён крах холодного старта)
  - [x] Защита `slotOf(timeMs)` от `NaN` при невалидных временных метках
  - [x] Добавлен таймаут (15с) для внешних запросов к OpenRouter
  - [x] Расширен `splitRoute` для поддержки моделей без слэша (`deepseek-chat`)
  - [x] Экспорт `catalogModelsCount` в ответе `/dsh-cost-meter/state`
- [x] Применён визуальный редизайн по стандарту `dsh-clinebot` (`lib/client.js`):
  - [x] Внедрён `createErrorBoundary()` для защиты слотов от падений
  - [x] Внедрён `refreshMirrorUntilVisible(ctx)` для синхронизации настроек
  - [x] Внедрена нативная CSS-система дизайн-токенов (`--dsw-alias-*`)
  - [x] Шапка карточки снабжена бейджами статуса каталога, тарифа и таймзоны
  - [x] Настройки структурированы по 3 секциям (`Основные параметры`, `Каталог OpenRouter`, `Диагностика`)
  - [x] Модернизирован поповер шапки сессии
- [x] Обновлена документация (`DESIGN.md`, `README.md`, `docs/README.ru.md`)
- [x] Поднята версия до `0.7.10` в `package.json`
- [x] Написаны и успешно пройдены 16 тестов в `test/stability-and-visual.test.mjs` (`npm test` 16/16 pass)
- [ ] Оформление коммита, push ветки и создание PR #24
- [ ] Merge PR в `main` и сборка тарбола
- [ ] Тестирование на проде, публикация релиза v0.7.10 и закрытие Issue #23
