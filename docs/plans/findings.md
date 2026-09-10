# Findings: Issue #23

## Архитектурные паттерны dsh-clinebot
- Изолированный тег `<style id="dsh-cost-meter-unified-css" data-dsh-plugin="dsh-cost-meter">` с переменными `--dsw-alias-...`.
- `createErrorBoundary()` защищает слоты от падений при сбоях рендеринга.
- `refreshMirrorUntilVisible(ctx)` обеспечивает доступность зеркала настроек в `settingsScope`.
- Бейджи статуса (`cb-badge-ok`, `cb-badge-warn`, `cb-badge-bad`) позволяют пользователю моментально оценить состояние плагина.

## Найденные баги в dsh-cost-meter
1. Строка 427 `lib/index.js`: `catalog = { index: { byId: {}, bySuffix: {} }, fetchedAt: 0, error: null }` не содержала `byLowerId`. При обращении к `matchModel` до первой загрузки каталога вызывался `index.byLowerId[lower]`, что приводило к `TypeError`.
2. `slotOf(event.time)`: при `undefined` возвращал `NaN`, повреждая ключи слотов в проекции.
3. `fetch(CATALOG_URL)`: без таймаута мог блокировать цикл обновлений при сетевых лагах.
4. `splitRoute`: отбрасывал модели без слэша.
