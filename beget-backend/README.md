# Backend CRM для Beget

Загрузите эти файлы в корень сайта рядом с собранным React (`index.html` и `assets/`).

1. Импортируйте `install.sql` в MySQL на Beget.
2. Скопируйте `config.example.php` в `config.php`.
3. В `config.php` укажите доступы к MySQL и свой `jwt_secret`.
4. Первый вход в CRM создаст администратора, если `allow_first_admin_bootstrap = true`.
5. После первого входа поменяйте `allow_first_admin_bootstrap` на `false`.

Frontend по умолчанию отправляет запросы на `/api.php`.
