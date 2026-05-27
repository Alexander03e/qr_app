#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
DOMAIN="${DOMAIN:-cfifeg1.fvds.ru}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"

cd "${DEPLOY_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${DEPLOY_DIR}/.env. Copy .env.example to .env and fill secrets first."
  exit 1
fi

docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d --remove-orphans

if [[ -d /etc/nginx/sites-available && -w /etc/nginx/sites-available ]]; then
  cp "nginx/${DOMAIN}.conf" "${NGINX_CONF}"
  ln -sfn "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
  nginx -t
  systemctl reload nginx
else
  echo "Skip nginx reload: run as root to install nginx/${DOMAIN}.conf."
fi

docker image prune -f

docker compose -f compose.prod.yml ps
