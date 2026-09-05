# Проверка публичного маршрута

1. Выполнить `npm test`.
2. Проверить `npm pack --dry-run` и отсутствие локальных установочных ссылок,
   абсолютных infra-путей, IP-адресов и секретов в поставляемых файлах.
3. Собрать tarball из проверенного Git worktree.
4. Установить tarball на изолированный тестовый DSH web server (MiniPC).
5. Для browser half проверить loader id `@goodandready/dsh-cost-meter`, HTTP route
   состояния `GET /dsh-cost-meter/state` и smoke-сценарий тарификации (список моделей,
   расчёт стоимости, статус «не указана стоимость»); для host half — bundle identity и host smoke.
6. Выполнить cleanup тестовой установки и убедиться, что постоянные плагины
   сохранили работоспособность.
