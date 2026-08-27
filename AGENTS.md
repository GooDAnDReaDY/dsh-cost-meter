# dsh-cost-meter

## Проверки

- `npm test` — regression suite.
- `npm pack --dry-run` — проверить состав публикуемого tarball.
- Перед релизом проверить совпадение приватного package name, patch name и
  browser loader id.

## Поставка

Плагин поставляется как приватный пакет
`@goodandready-private/dsh-cost-meter` через GitHub Packages. Production
переключается только после чистого изолированного тестового цикла и проверки
HTTP route.
