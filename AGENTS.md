# dsh-cost-meter

## Проверки

- `npm test` — regression suite.
- `npm pack --dry-run` — проверить состав публикуемого tarball.
- Перед релизом проверить совпадение публичного package name, patch name и
  browser loader id (`@goodandready/dsh-cost-meter`).

## Поставка

Плагин поставляется как публичный пакет
`@goodandready/dsh-cost-meter` через npmjs. Production
переключается только после чистого изолированного тестового цикла на MiniPC
и проверки HTTP route.
