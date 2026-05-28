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
git clone https://github.com/Alexander03e/qr_app.git /home/develop/queueflow-src
bash /home/develop/queueflow-src/deploy/scripts/bootstrap-server.sh
```

5. Скопируй deploy-комплект:

```bash
mkdir -p /home/develop/queueflow
cp -r /home/develop/queueflow-src/deploy/. /home/develop/queueflow/
cd /home/develop/queueflow
cp .env.example .env
```

6. Заполни `/home/develop/queueflow/.env`.

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
bash /home/develop/queueflow/scripts/deploy.sh
```

9. Проверь:

```bash
docker compose -f /home/develop/queueflow/compose.prod.yml ps
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

Certbot изменит активный Nginx-конфиг в `/etc/nginx/sites-available/cfifeg1.fvds.ru.conf`: добавит `listen 443 ssl`, пути к сертификатам и HTTP -> HTTPS redirect. Deploy-скрипт не будет перезаписывать уже существующий серверный Nginx-конфиг, если явно не передать `FORCE_NGINX_CONFIG=1`.

После включения HTTPS в `/home/develop/queueflow/.env` можно выставить:

```bash
DJANGO_CSRF_TRUSTED_ORIGINS=https://cfifeg1.fvds.ru
DJANGO_CORS_ALLOWED_ORIGINS=https://cfifeg1.fvds.ru
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
```

Затем применить:

```bash
bash /home/develop/queueflow/scripts/deploy.sh
```

## Если не находится docker-compose-plugin

На некоторых чистых серверах apt может вывести `E: Unable to locate package docker-compose-plugin`. Обновленный `deploy/scripts/bootstrap-server.sh` в таком случае скачает Compose CLI plugin напрямую из официальных релизов Docker Compose на GitHub.

Если нужно починить текущую сессию без повторного запуска всего bootstrap-скрипта:

```bash
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

Для ARM-сервера вместо `docker-compose-linux-x86_64` используй `docker-compose-linux-aarch64`.

## Последующие обновления

Обычный путь:

1. Сделать изменения в коде.
2. Запушить в `main`.
3. Дождаться успешного workflow `Build and publish Docker images`.
4. На сервере выполнить:

```bash
cd /home/develop/queueflow
bash scripts/deploy.sh
```

Скрипт подтянет новые образы, пересоздаст изменившиеся контейнеры, применит миграции backend через entrypoint и перезагрузит Nginx.

## Автообновление через Watchtower

В production compose добавлен Watchtower. Он проверяет Docker registry каждые `WATCHTOWER_INTERVAL_SECONDS` секунд и обновляет только контейнеры с label `com.centurylinklabs.watchtower.enable=true`. Сейчас этот label стоит только на `backend` и `frontend`, поэтому PostgreSQL автоматически не обновляется.

Если GHCR-пакеты приватные, сначала залогинь Docker на сервере:

```bash
docker login ghcr.io -u Alexander03e
```

В `/home/develop/queueflow/.env` должны быть переменные:

```bash
WATCHTOWER_INTERVAL_SECONDS=300
DOCKER_CONFIG_PATH=/root/.docker/config.json
DOCKER_API_VERSION=1.44
```

Запуск или обновление Watchtower:

```bash
cd /home/develop/queueflow
sudo bash scripts/deploy.sh
```

Проверка:

```bash
docker compose -f /home/develop/queueflow/compose.prod.yml ps watchtower
docker compose -f /home/develop/queueflow/compose.prod.yml logs watchtower --tail=80
```

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
