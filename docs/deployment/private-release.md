# Релиз и deployment

Релизная версия повышается patch-изменением. После merge в `main` создаются
annotated tag, пакет GitHub Packages и private GitHub mirror/release.

Production должен содержать exact private package version и не должен иметь
старой локальной зависимости на исходный checkout. После restart проверяются
service health, browser loader и `GET /dsh-cost-meter/state`, затем issue
