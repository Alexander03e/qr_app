#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/queueflow}"
DOMAIN="${DOMAIN:-cfifeg1.fvds.ru}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo APP_DIR=${APP_DIR} DOMAIN=${DOMAIN} bash $0"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg nginx

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

systemctl enable --now docker
systemctl enable --now nginx

mkdir -p "${APP_DIR}"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

echo "Server base is ready."
echo "Next: copy deploy files to ${APP_DIR}, configure ${APP_DIR}/.env, then run deploy/scripts/deploy.sh."
