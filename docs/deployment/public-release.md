# Публичный релиз и deployment

Релизная версия повышается patch-изменением (v0.7.6). После merge в `main`
создаются annotated tag, пакет в npm (`@goodandready/dsh-cost-meter`) и
публичный GitHub release в `GooDAnDReaDY/dsh-cost-meter`.

Production должен содержать exact package version из npm и не должен иметь
локальной зависимости на исходный checkout. После restart проверяются
service health, browser loader и `GET /dsh-cost-meter/state`.
