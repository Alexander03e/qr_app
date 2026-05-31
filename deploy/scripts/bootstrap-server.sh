#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/develop/queueflow}"
DOMAIN="${DOMAIN:-qq-flow.ru}"

install_compose_plugin_from_github() {
  local arch

  case "$(uname -m)" in
    x86_64 | amd64)
      arch="x86_64"
      ;;
    aarch64 | arm64)
      arch="aarch64"
      ;;
    *)
      echo "Unsupported CPU architecture for Docker Compose: $(uname -m)"
      exit 1
      ;;
  esac

  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL \
    "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${arch}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
}

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
  apt-get update
  if ! apt-get install -y docker-compose-plugin; then
    echo "docker-compose-plugin is unavailable in apt, installing Compose CLI plugin from GitHub."
    install_compose_plugin_from_github
  fi
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin installation failed."
  exit 1
fi

systemctl enable --now docker
systemctl enable --now nginx

mkdir -p "${APP_DIR}"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

echo "Server base is ready."
echo "Next: copy deploy files to ${APP_DIR}, configure ${APP_DIR}/.env, then run deploy/scripts/deploy.sh."
