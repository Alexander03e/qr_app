#!/usr/bin/env bash
set -euo pipefail

echo "[docker-down] Stopping and removing containers..."
docker compose down
