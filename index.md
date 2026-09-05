# dsh-cost-meter

Плагин показывает стоимость текущей сессии по моделям, токенам и тарифным
окнам. Host half регистрирует projection и route состояния; browser half
рисует chip и детализацию в conversation header, а также предоставляет карточку настроек.

Каноническая поставка: `@goodandready/dsh-cost-meter` (публичный npm).
- [README](README.md)
- [Дизайн-контракт](docs/design/DESIGN.md)
- [Проверка публичного маршрута](docs/testing/public-route.md)
- [Регрессионные тесты тарификации](docs/testing/projection-lifecycle.md)
- [Публичный релиз](docs/deployment/public-release.md)
