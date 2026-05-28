# Backend overview

Краткий обзор бэкенда, чтобы быстрее влиться в проект. Бэкенд написан на Django + Django REST Framework и обслуживает API системы электронной очереди QueueFlow.

## Что здесь находится

- `core/` - настройки Django-проекта, общий URL-роутинг, обработчик ошибок, сбор технических метрик.
- `api/v1/` - единая точка подключения API-приложений версии `v1`.
- `users/` - пользователи, роли, авторизация администратора и оператора, управление операторами.
- `companies/` - компании и филиалы.
- `queues/` - очереди, талоны, статусы талонов и основные операции с очередью.
- `clients/` - клиенты очереди и их идентификаторы.
- `notifications/` - обратная связь, web push, VK-уведомления, webhook-интеграции.
- `analytics/` - административная бизнес-аналитика по очередям, талонам, операторам и отзывам. Технические HTTP-метрики живут отдельно в `core/metrics.py` и отдаются через Prometheus.
- `shared/` - место под общие вспомогательные сущности; сейчас практически пустое.
- `scripts/` - shell-скрипты для Docker-контейнера и локального управления.
- `migrations/` внутри каждого приложения - миграции БД для конкретного Django-приложения.

## Как проходит запрос

Все API-ручки начинаются с `/api/v1/`. Корневой роутинг находится в `core/urls.py`, дальше подключается `api/v1/urls.py`, а он автоматически подключает `urls.py` приложений:

- `users.urls`
- `clients.urls`
- `companies.urls`
- `queues.urls`
- `notifications.urls`
- `analytics.urls`

Схема OpenAPI доступна по `/api/v1/schema/`, Swagger UI - по `/api/v1/docs/`.

Обычно цепочка такая:

1. `urls.py` выбирает view/viewset.
2. `views.py` проверяет токен, права и входные данные.
3. `serializers.py` валидирует request/response.
4. `services.py` выполняет бизнес-логику.
5. `models.py` описывает таблицы и связи.

Важный паттерн проекта: HTTP-слой в `views.py` остается тонким. Например, `queues.views.TicketViewSet.join()` только валидирует payload и вызывает `queues.services.join_queue()`, а уже сервис открывает транзакцию, блокирует очередь, ищет или создает клиента, проверяет лимит и создает талон. Такой же принцип используется в авторизации (`users.services`), уведомлениях (`notifications.services`) и аналитике (`analytics.services`).

## Настройки проекта

Главный файл настроек: `core/settings.py`.

Важное:

- база данных настроена как PostgreSQL через переменные `POSTGRES_*`;
- CORS сейчас открыт через `CORS_ALLOW_ALL_ORIGINS = True`;
- DRF использует `drf-spectacular` для схемы API;
- ошибки приводятся к единому формату через `core.exceptions.custom_exception_handler`;
- технические HTTP-метрики собираются middleware `core.metrics_middleware.PrometheusMetricsMiddleware` и экспортируются в Prometheus через `/metrics`;
- middleware метрик пытается определить `company_id` по `Authorization: Bearer <token>` через таблицу `AuthToken`;
- web push и VK берут настройки из `WEB_PUSH_*` и `VK_*`, включая OAuth-параметры VK.

Файл `db.sqlite3` лежит в папке, но текущие настройки используют PostgreSQL.

## Доменные приложения

### `users/`

Отвечает за сотрудников системы.

Основные модели:

- `User` - пользователь с ролью `ADMIN` или `OPERATOR`, привязкой к компании/филиалу и назначенным очередям.
- `AuthToken` - единая таблица серверных токенов авторизации для администратора и оператора: `user`, `key`, `expires_at`, `created_at`.

Авторизация кастомная: после логина API возвращает непрозрачный токен, дальше его надо передавать как `Authorization: Bearer <token>`. Токен живет 12 часов (`TOKEN_TTL_HOURS = 12`), при новом логине старые токены пользователя удаляются, при logout токен удаляется из БД.

Ключевые ручки:

- `POST /api/v1/auth/admin/login/`
- `GET /api/v1/auth/admin/me/`
- `POST /api/v1/auth/admin/logout/`
- `PATCH /api/v1/auth/admin/settings/`
- `POST /api/v1/auth/operator/login/`
- `GET /api/v1/auth/operator/me/`
- `POST /api/v1/auth/operator/logout/`
- `PATCH /api/v1/auth/operator/settings/`
- `/api/v1/admin/operators/` - CRUD операторов для администратора.

Логика авторизации лежит в `users/services.py`: проверка email/password, выдача токена и проверка действующего токена. Старые plaintext-пароли переводятся в hash отдельной миграцией `users/migrations/0008_hash_plaintext_passwords.py`, а runtime-login работает только через `check_password()`.

Flow авторизации:

1. Frontend отправляет email/password в `AdminLoginView` или `OperatorLoginView`.
2. `authenticate_admin()` или `authenticate_operator()` ищет пользователя, проверяет роль, `is_active`, пароль и, для администратора, наличие `company`.
3. Пароль проверяется через стандартный Django `check_password()`.
4. `_issue_token()` удаляет прежние токены пользователя и создает новый `AuthToken` через `secrets.token_hex(32)`.
5. Защищенные ручки подключают `AuthTokenAuthentication`, который достает `Bearer`-токен, проверяет `AuthToken` и кладет пользователя в `request.user`.
6. Permission-классы `IsAdminUser`, `IsOperatorUser` и `IsStaffUser` проверяют роль, активность пользователя и, для администратора, наличие компании.

Почему здесь `AuthToken` + `Bearer`, а не JWT:

- `Bearer` используется как стандартный способ передать credential в HTTP-заголовке, но сам credential не JWT, а opaque token, состояние которого хранится на сервере.
- Нужен простой и надежный logout: API удаляет текущую запись `AuthToken`, и токен сразу перестает работать. С JWT для такого же поведения пришлось бы добавлять blacklist, rotation или очень короткий TTL.
- Роли, `is_active`, привязка к компании и назначенные очереди должны учитываться актуально на каждом запросе. При серверном токене изменение пользователя в БД сразу влияет на доступ; в JWT старые claims жили бы до истечения токена.
- Проект не требует stateless-авторизации между множеством независимых сервисов, поэтому один DB lookup на защищенный запрос приемлемее, чем усложнение refresh-токенами и blacklist-инфраструктурой.
- Для дипломного проекта это проще объяснить и проверить в коде: состояние сессии лежит в `users.models.AuthToken`, проверка токена вынесена в `users.authentication.AuthTokenAuthentication`, а роли описаны в `users.permissions`.

Минус такого подхода: защищенный запрос зависит от БД. Если в будущем понадобится горизонтальная stateless-авторизация или внешние сервисы, можно будет перейти на JWT с refresh/blacklist, но для текущей системы важнее управляемые сессии и мгновенный отзыв доступа.

### `companies/`

Описывает SaaS-структуру: компания -> филиалы.

Основные модели:

- `Company` - компания, часовой пояс.
- `Branch` - филиал компании, адрес, активность, расписание в JSON.

Ключевые ручки:

- `/api/v1/admin/companies/` - просмотр и редактирование компании администратора.
- `/api/v1/admin/branches/` - CRUD филиалов в рамках компании администратора.

Администратор видит и редактирует только данные своей компании.

### `queues/`

Главное приложение проекта. Управляет очередями и талонами.

Основные модели:

- `Queue` - очередь филиала: название, язык, лимит клиентов, timeout вызванного талона, настройки уведомлений, ссылка на очередь, заголовок/подзаголовок плаката.
- `Ticket` - талон клиента в очереди: номер, начальная позиция, статус, оператор, время постановки, вызова, начала обслуживания и завершения.
- `QueueStatus` - статусы талона: `WAITING`, `CALLED`, `IN_SERVICE`, `COMPLETED`, `SKIPPED`, `LEFT`, `NOT_ARRIVED`, `REMOVED`.

Ключевые публичные/клиентские ручки:

- `GET /api/v1/queues/<id>/snapshot/` - снимок очереди.
- `POST /api/v1/tickets/join/` - встать в очередь.
- `PATCH /api/v1/tickets/<id>/status/` со статусом `LEFT` - клиент вышел из очереди.
- `POST /api/v1/tickets/<id>/skip-one-ahead/` - пропустить одного вперед.

Ключевые операторские ручки:

- `GET /api/v1/operator/queues/` - очереди, назначенные оператору.
- `PATCH /api/v1/operator/queues/<id>/settings/` - настройки очереди оператором.
- `POST /api/v1/queues/<id>/invite-next/` - вызвать следующего.
- `POST /api/v1/tickets/<id>/invite/` - вызвать талон по id.
- `POST /api/v1/tickets/<id>/append-to-queue/` - вернуть активный талон в ожидание.
- `POST /api/v1/tickets/<id>/remove/` - удалить талон из очереди.
- `POST /api/v1/queues/<id>/tickets/delete/` - удалить несколько талонов.

Ключевые административные ручки:

- `/api/v1/admin/queues/` - CRUD очередей в филиалах компании администратора.
- `/api/v1/tickets/` - список/просмотр талонов с учетом прав администратора или оператора.

Основная бизнес-логика лежит в `queues/services.py`: постановка в очередь, атомарная выдача номера, проверка активного талона, расчет snapshot, переходы статусов, вызов следующего, возврат талона в очередь, удаление талонов, расчет ожидания и планирование уведомлений после изменения статуса.

Как это обыграно в коде:

- Все операции, которые меняют очередь или талоны, используют `transaction.atomic()`, а критичные строки блокируются через `select_for_update()`. Это нужно, чтобы два клиента не получили один номер и два оператора не вызвали одного и того же человека.
- `display_number` строится из `Queue.last_ticket_number` в виде `Q<queue_id>-0001`, а `initial_ticket_number` хранит позицию клиента на момент входа.
- Клиент считается активным в очереди, если у него есть талон со статусом `WAITING`, `CALLED` или `IN_SERVICE`; второй активный талон в той же очереди запрещен.
- `build_queue_snapshot()` сначала вызывает `expire_called_tickets()`: если `CALLED` висит дольше `called_ticket_timeout_seconds` или дефолтных 5 минут, талон становится `NOT_ARRIVED`.
- Snapshot возвращает публичное табло (`current_ticket`, `waiting_tickets`, `waiting_count`) и персональную часть клиента (`client_ticket`, `client_is_served`, `client_is_removed`, `client_is_not_arrived`, `client_called_remaining_seconds`, `estimated_wait_seconds`).
- `estimated_wait_seconds` считается по последним 30 завершенным талонам и количеству активных операторов, назначенных на очередь.
- `update_ticket()` централизует допустимые переходы статусов и проставляет служебные timestamps: `called_at`, `service_started_at`, `finished_at`. Оператор записывается в талон при вызове, обслуживании и финальных операторских статусах.

Основные переходы статусов:

- `WAITING` -> `CALLED`, `SKIPPED`, `LEFT`, `NOT_ARRIVED`, `REMOVED`.
- `CALLED` -> `WAITING`, `IN_SERVICE`, `SKIPPED`, `LEFT`, `NOT_ARRIVED`, `REMOVED`.
- `IN_SERVICE` -> `WAITING`, `COMPLETED`, `SKIPPED`, `REMOVED`.
- Финальные статусы `SKIPPED`, `COMPLETED`, `LEFT`, `NOT_ARRIVED`, `REMOVED` дальше не переводятся через обычный `update_ticket()`.

### `clients/`

Хранит клиентов, которые взаимодействуют с очередью.

Основная модель:

- `Client` - имя, VK ID, телефон, язык, филиал, device id, queue token, согласия на уведомления/рекламу.

Ключевые ручки:

- `/api/v1/clients/` - staff-only CRUD клиентов: администратор видит клиентов филиалов своей компании, оператор - клиентов своего филиала или назначенных очередей.
- `POST /api/v1/clients/language/` - обновить предпочитаемый язык клиента.

В `clients/services.py` есть логика поиска/создания клиента по `queue_token`, `device_id` или телефону. `queue_token` используется как устойчивый идентификатор сессии клиента в очереди.

Flow идентификации клиента:

1. Если пришел `queue_token`, он имеет главный приоритет. Существующий клиент переиспользуется, а новый `queue_token` может создать нового клиента даже на том же `device_id`.
2. Если `queue_token` нет, сервис ищет клиента по `device_id`, затем по телефону.
3. Если ничего не найдено, создается новый `Client`; при отсутствии `queue_token` генерируется значение вида `qt_...`.
4. `POST /api/v1/clients/language/` принимает `client_id`, который может быть числовым id, `device_id` или `queue_token`, и меняет язык только на `ru` или `en`.

### `notifications/`

Отвечает за клиентскую обратную связь, подписки и доставку уведомлений.

Основные модели:

- `FeedbackItem` - отзыв или жалоба клиента.
- `ClientNotificationSubscription` - подписка клиента на web push или VK.
- `WebhookSubscription` - подписка компании/очереди на webhook.
- `WebhookDelivery` - попытка отправки webhook.

Ключевые публичные ручки:

- `POST /api/v1/feedback/` - создать отзыв/жалобу.
- `GET /api/v1/notifications/status/` - проверить включенные каналы уведомлений клиента.
- `GET /api/v1/notifications/web-push/public-key/` - получить VAPID public key.
- `POST /api/v1/notifications/web-push/subscribe/` - подписаться на web push.
- `POST /api/v1/notifications/vk/oauth/start/` - начать OAuth-подключение VK.
- `GET /api/v1/notifications/vk/oauth/callback/` - callback VK OAuth, который завершает подписку и возвращает маленькую HTML-страницу для popup-flow.
- `POST /api/v1/notifications/vk/subscribe/` - подписаться на VK.

Ключевые административные ручки:

- `/api/v1/admin/feedback/` - управление обратной связью.
- `/api/v1/admin/webhook-subscriptions/` - управление webhook-подписками.

При изменении статуса талона `queues.services` запускает `notifications.services.notify_ticket_status_changed()` после коммита транзакции. Для webhook-подписок формируется событие `ticket.status_changed` с прежним и новым статусом. При переходе в `CALLED` дополнительно отправляются web push/VK-уведомления клиенту, а для совместимости поддерживается webhook-событие `ticket.called` для подписок, явно выбравших этот тип. Клиентские доставки web push/VK не сохраняются в отдельную таблицу: результат пишется в лог и счетчик Prometheus `queueflow_notification_deliveries_total`.

Flow уведомлений:

1. Любой сервис очереди меняет статус талона и вызывает `schedule_ticket_status_changed_notification()`.
2. Уведомление ставится через `transaction.on_commit()`, чтобы внешние webhooks и push не ушли, если транзакция откатится.
3. `notify_ticket_status_changed()` заново читает талон с очередью, филиалом и клиентом, собирает payload и отправляет webhook-события активным подпискам компании.
4. Если webhook-подписка имеет пустой `event_types`, она получает все поддерживаемые события; если список задан, событие фильтруется по нему.
5. Если у webhook-подписки задан `secret`, тело подписывается HMAC-SHA256 в заголовке `X-QueueFlow-Signature`.
6. Если новый статус `CALLED`, клиентские подписки `WEB_PUSH` и `VK` получают сообщение о вызове талона.
7. Для webhooks создается `WebhookDelivery` со статусом отправки, HTTP-кодом, ответом или ошибкой. Для web push/VK отдельная delivery-таблица не используется.

Flow VK OAuth:

1. Frontend вызывает `POST /api/v1/notifications/vk/oauth/start/` с `queue_id` и `client_id` или `ticket_id`.
2. Если `VK_OAUTH_CLIENT_ID` и `VK_OAUTH_CLIENT_SECRET` не настроены, API возвращает `configured: false`.
3. Если OAuth настроен, сервис подписывает `state` через `django.core.signing` и возвращает `auth_url`.
4. VK возвращает пользователя на `/notifications/vk/oauth/callback/`.
5. Callback проверяет `state`, меняет `code` на VK user id и вызывает тот же `subscribe_vk()`, что и ручная подписка.

### `analytics/`

Собирает бизнес-метрики для администратора. В `analytics/models.py` сейчас нет отдельной таблицы журналирования API-запросов: технические HTTP-метрики вынесены в Prometheus и доступны на `/metrics`.

Ключевая ручка:

- `GET /api/v1/admin/metrics/`

Поддерживаются фильтры:

- `branch_id`
- `queue_id`
- `operator_id`
- `date_from`
- `date_to`

Бизнес-метрики строятся в `analytics/services.py`: количество талонов по статусам, активные/обработанные талоны, среднее и максимальное ожидание, среднее обслуживание, SLA до 10 минут, нагрузка, throughput, отзывы/жалобы, рейтинг, срезы по филиалам, очередям, операторам, дням и часам.

Flow аналитики:

1. `AdminMetricsView.get()` проверяет admin-токен и парсит query-параметры в `MetricsFilters`.
2. `company_admin_metrics()` получает `company_id` администратора и не дает выйти за пределы его компании.
3. `_filtered_tickets()`, `_filtered_feedback()` и `_queue_queryset()` применяют фильтры по филиалу, очереди, оператору и периоду.
4. `_compose_business_metrics()` собирает агрегаты, а отдельные функции строят детализацию `branches`, `queues`, `operators`, `peak_hours`, `daily`.
5. Ответ сериализуется через `AdminMetricsSerializer`, поэтому frontend получает стабильную структуру даже при пустых данных.

## Важные связи данных

- `Company` имеет много `Branch`.
- `Branch` имеет много `Queue`.
- `Queue` имеет много `Ticket`.
- `Ticket` связан с `Client` и опционально с оператором `User`.
- `User` связан с `Company`, опционально с `Branch` и может быть назначен на несколько `Queue`.
- `AuthToken` связан с `User` и описывает серверную сессию сотрудника.
- `FeedbackItem` связан с компанией, опционально с филиалом, очередью и талоном.
- `ClientNotificationSubscription` связывает клиента, очередь и канал уведомления.
- `WebhookSubscription` принадлежит компании и может быть ограничена конкретной очередью.
- `WebhookDelivery` фиксирует попытку отправки webhook по конкретной подписке, очереди и талону.

## Права доступа

В проекте используется кастомная DRF-аутентификация поверх собственной таблицы `AuthToken`:

- `users.authentication.AuthTokenAuthentication` парсит `Authorization: Bearer <token>`, проверяет срок действия токена и активность пользователя;
- `users.permissions.IsAdminUser` разрешает действия только активному администратору с компанией;
- `users.permissions.IsOperatorUser` разрешает действия только активному оператору;
- `users.permissions.IsStaffUser` разрешает действия администратору или оператору.

Администратор ограничен своей компанией. Оператор ограничен очередями из `assigned_queues`. Для операторских действий с талонами дополнительно проверяется, что талон относится к назначенной оператору очереди.

На уровне кода это выглядит так:

- admin-ручки подключают `AuthTokenAuthentication` + `IsAdminUser` и фильтруют queryset по `request.user.company_id`;
- operator-ручки подключают `AuthTokenAuthentication` + `IsOperatorUser` и фильтруют очереди через `request.user.assigned_queues`;
- `TicketViewSet.list/retrieve` использует `request.user.role`: администратору отдает талоны компании, оператору - талоны назначенных очередей;
- публичные клиентские действия (`join`, `snapshot`, `feedback`, подписки на уведомления) работают без staff-токена, но валидируют принадлежность `queue_id`, `ticket_id` и клиента.

## Основные сценарии

### Клиент встает в очередь

1. Frontend вызывает `POST /api/v1/tickets/join/`.
2. `TicketViewSet.join()` валидирует входные данные.
3. `queues.services.join_queue()` блокирует очередь через `select_for_update()`.
4. Клиент находится или создается через `clients.services.get_or_create_client_by_identity()` с приоритетом `queue_token` -> `device_id` -> `phone`.
5. Проверяется отсутствие активного талона и лимит очереди.
6. Создается `Ticket` со статусом `WAITING`, начальной позицией и номером вида `Q<queue_id>-0001`.

### Клиент открывает табло или свой статус

1. Frontend вызывает `GET /api/v1/queues/<id>/snapshot/`, опционально с `client_id`.
2. `QueueViewSet.snapshot()` вызывает `get_queue_snapshot()`.
3. `build_queue_snapshot()` сначала переводит просроченные `CALLED` в `NOT_ARRIVED`.
4. Текущее окно берется как последний `IN_SERVICE`, а если его нет, как последний `CALLED`.
5. Очередь ожидания сортируется по `enqueued_at` и `id`.
6. Если передан `client_id`, код ищет клиента по числовому id, `device_id` или `queue_token` и добавляет в ответ персональный талон, флаги результата и примерное ожидание.

### Оператор вызывает следующего

1. Frontend вызывает `POST /api/v1/queues/<id>/invite-next/`.
2. Проверяется токен оператора и назначение на очередь.
3. Текущий `IN_SERVICE` закрывается как `COMPLETED`.
4. Текущий `CALLED`, если он был, становится `SKIPPED`.
5. Первый `WAITING` становится `CALLED`.
6. После коммита отправляется webhook-событие изменения статуса, а для нового `CALLED`-талона дополнительно отправляются клиентские уведомления.

### Оператор вызывает талон не по порядку

1. Frontend вызывает `POST /api/v1/tickets/<id>/invite/`.
2. Проверяется, что оператор назначен на очередь талона.
3. Если уже есть активный `CALLED` или `IN_SERVICE`, frontend обязан передать `action`.
4. При `action=complete` текущий активный талон завершается как `COMPLETED`.
5. При `action=return` текущий активный талон возвращается в `WAITING`.
6. Выбранный талон из `WAITING` переводится в `CALLED`, получает `called_at` и оператора.

### Клиент или оператор меняет статус талона

1. Frontend вызывает `PATCH /api/v1/tickets/<id>/status/`.
2. Если новый статус `LEFT`, действие считается клиентским и не требует staff-токена.
3. Для остальных статусов проверяется оператор и его назначение на очередь.
4. `update_ticket()` проверяет допустимость перехода по таблице переходов.
5. Код обновляет timestamps, оператора и планирует уведомление после коммита.

### Администратор смотрит метрики

1. Frontend вызывает `GET /api/v1/admin/metrics/`.
2. Проверяется admin-токен.
3. Фильтры парсятся в `analytics.views`.
4. `analytics.services.company_admin_metrics()` собирает бизнес-метрики только по компании администратора. Технические HTTP-метрики отдельно доступны на `/metrics`.

### Администратор управляет справочниками

1. Компании и филиалы идут через `companies.views`, очереди через `queues.views.AdminQueueViewSet`, операторы через `users.views.AdminOperatorViewSet`.
2. Каждый admin queryset фильтруется по `admin_user.company_id`.
3. При создании или изменении дополнительно проверяется, что выбранные филиалы, очереди и операторы не принадлежат чужой компании.
4. Для операторов пароль хэшируется через `make_password()`, а назначенные очереди сохраняются в `assigned_queues`.

## Локальный запуск

Через Docker:

```bash
cd backend
cp .env.docker.example .env.docker
docker compose up --build
```

Контейнер применяет миграции при старте через `scripts/entrypoint.sh`, затем запускает Gunicorn на `0.0.0.0:8000`.

Без Docker:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Для локального PostgreSQL проверь переменные `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`.

## Полезные команды

Создать миграции:

```bash
python manage.py makemigrations
```

Применить миграции:

```bash
python manage.py migrate
```

Запустить тесты:

```bash
python manage.py test
```

Создать или обновить администратора:

```bash
python manage.py seed_admin --email admin@example.com --password password --company-id 1
```

Создать или обновить оператора:

```bash
python manage.py seed_operator --email operator@example.com --password password --company-id 1 --branch-id 1
```

## Как добавлять новую функциональность

Обычный порядок изменений:

1. Добавить или изменить модель в `models.py`.
2. Создать миграцию.
3. Описать входные/выходные данные в `serializers.py`.
4. Положить бизнес-логику в `services.py`.
5. Подключить HTTP-слой в `views.py` и `urls.py`.
6. Добавить или обновить тесты в `tests.py`.
7. После ключевых изменений функционала актуализировать `backend/функционал.md`.

Если логика меняет очередь или статус талона, сначала смотри `queues/services.py`: там сосредоточены правила переходов статусов, транзакции и побочные эффекты уведомлений.
