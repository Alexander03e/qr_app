# Развертывание QueueFlow

Документ описывает первичную раскатку на чистый сервер и последующие обновления. Домен: `cfifeg1.fvds.ru`.

## Что добавлено

- `frontend/Dockerfile` собирает React/Vite и отдает статические файлы через Nginx.
- Корневой `docker-compose.yml` поднимает локально единый комплект: PostgreSQL, backend, frontend, Prometheus.
- `deploy/compose.prod.yml` запускает production-сервисы из готовых Docker-образов.
- `.github/workflows/docker-publish.yml` собирает и публикует образы в GitHub Container Registry при push в `main`.
- `deploy/nginx/cfifeg1.fvds.ru.conf` проксирует внешний домен на frontend-контейнер.

## Docker registry и CI/CD

Используется GitHub Container Registry:

- backend: `ghcr.io/alexander03e/qr_app-backend:main`;
- frontend: `ghcr.io/alexander03e/qr_app-frontend:main`.

Workflow запускается на push в `main`, на tag вида `v1.2.3`, вручную через `workflow_dispatch`, а для pull request только проверяет сборку без push.

Перед первым запуском проверь в GitHub:

1. `Settings -> Actions -> General -> Workflow permissions`: включить `Read and write permissions`.
2. После первой публикации образов в `Packages` сделать пакеты публичными или выполнить на сервере `docker login ghcr.io` с PAT, у которого есть `read:packages`.

## Первое развертывание на чистый сервер

1. Направь DNS A-запись `cfifeg1.fvds.ru` на IP сервера.

2. Убедись, что изменения с deploy-файлами уже попали в `main`, а workflow `Build and publish Docker images` успешно опубликовал backend/frontend образы.

3. Подключись к серверу:

```bash
ssh root@SERVER_IP
```

4. Установи базовые зависимости и скачай репозиторий:

```bash
apt-get update
apt-get install -y git
git clone https://github.com/Alexander03e/qr_app.git /opt/queueflow-src
bash /opt/queueflow-src/deploy/scripts/bootstrap-server.sh
```

5. Скопируй deploy-комплект:

```bash
mkdir -p /opt/queueflow
cp -r /opt/queueflow-src/deploy/. /opt/queueflow/
cd /opt/queueflow
cp .env.example .env
```

6. Заполни `/opt/queueflow/.env`.

Обязательно поменяй:

```bash
DJANGO_SECRET_KEY=...
POSTGRES_PASSWORD=...
```

Секрет можно сгенерировать так:

```bash
openssl rand -base64 48
```

7. Если GHCR-пакеты приватные, выполни login:

```bash
docker login ghcr.io -u Alexander03e
```

В качестве пароля укажи GitHub PAT с правом `read:packages`.

8. Запусти приложение:

```bash
bash /opt/queueflow/scripts/deploy.sh
```

9. Проверь:

```bash
docker compose -f /opt/queueflow/compose.prod.yml ps
curl -I http://cfifeg1.fvds.ru
```

После этого интерфейсы доступны:

- клиентский: `http://cfifeg1.fvds.ru/c/:queueId`;
- операторский: `http://cfifeg1.fvds.ru/o`;
- административный: `http://cfifeg1.fvds.ru/a`;
- API: `http://cfifeg1.fvds.ru/api/v1/`.

## HTTPS

Когда HTTP уже открывается по домену, установи сертификат:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d cfifeg1.fvds.ru
```

После включения HTTPS в `/opt/queueflow/.env` можно выставить:

```bash
DJANGO_CSRF_TRUSTED_ORIGINS=https://cfifeg1.fvds.ru
DJANGO_CORS_ALLOWED_ORIGINS=https://cfifeg1.fvds.ru
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
```

Затем применить:

```bash
bash /opt/queueflow/scripts/deploy.sh
```

## Последующие обновления

Обычный путь:

1. Сделать изменения в коде.
2. Запушить в `main`.
3. Дождаться успешного workflow `Build and publish Docker images`.
4. На сервере выполнить:

```bash
cd /opt/queueflow
bash scripts/deploy.sh
```

Скрипт подтянет новые образы, пересоздаст изменившиеся контейнеры, применит миграции backend через entrypoint и перезагрузит Nginx.

## Локальный запуск всего комплекта

Для локальной проверки Docker-комплекта из корня репозитория:

```bash
cp backend/.env.docker.example backend/.env.docker
docker compose up --build -d
```

Адреса:

- frontend: `http://localhost:8080`;
- backend напрямую: `http://localhost:8000/api/v1/`;
- Prometheus: `http://localhost:9090`.
