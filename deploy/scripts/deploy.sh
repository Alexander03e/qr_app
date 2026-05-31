#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
DOMAIN="${DOMAIN:-qq-flow.ru}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"

cd "${DEPLOY_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${DEPLOY_DIR}/.env. Copy .env.example to .env and fill secrets first."
  exit 1
fi

DOCKER_CONFIG_PATH="$(grep -E '^DOCKER_CONFIG_PATH=' .env | tail -n 1 | cut -d '=' -f 2-)"
DOCKER_CONFIG_PATH="${DOCKER_CONFIG_PATH:-/root/.docker/config.json}"

if [[ "${EUID}" -eq 0 && ! -f "${DOCKER_CONFIG_PATH}" ]]; then
  mkdir -p "$(dirname "${DOCKER_CONFIG_PATH}")"
  printf '{}\n' > "${DOCKER_CONFIG_PATH}"
fi

if ! docker compose -f compose.prod.yml pull; then
  cat <<EOF

Failed to pull Docker images.

Most likely the GHCR images do not exist yet or the server is not logged in.
Check that GitHub Actions finished successfully and published:
  ${BACKEND_IMAGE:-BACKEND_IMAGE is not set}
  ${FRONTEND_IMAGE:-FRONTEND_IMAGE is not set}

If packages are private, run:
  docker login ghcr.io -u Alexander03e

EOF
  exit 1
fi

docker compose -f compose.prod.yml up -d --remove-orphans

if [[ ! -f "nginx/${DOMAIN}.conf" ]]; then
  echo "Missing ${DEPLOY_DIR}/nginx/${DOMAIN}.conf. Copy the deploy/nginx files from the repository first."
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  if [[ -f "${NGINX_CONF}" && "${FORCE_NGINX_CONFIG:-0}" != "1" ]]; then
    echo "Keep existing ${NGINX_CONF}. Set FORCE_NGINX_CONFIG=1 to overwrite it."
  else
    cp "nginx/${DOMAIN}.conf" "${NGINX_CONF}"
  fi
  ln -sfn "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
  nginx -t
  systemctl reload nginx
else
  cat <<EOF

Nginx config was not installed because this script is not running as root.
Run one of these commands on the server:
  sudo bash ${DEPLOY_DIR}/scripts/deploy.sh

or install nginx config manually:
  sudo cp ${DEPLOY_DIR}/nginx/${DOMAIN}.conf ${NGINX_CONF}
  sudo ln -sfn ${NGINX_CONF} /etc/nginx/sites-enabled/${DOMAIN}.conf
  sudo nginx -t
  sudo systemctl reload nginx

EOF
fi

docker image prune -f

docker compose -f compose.prod.yml ps
