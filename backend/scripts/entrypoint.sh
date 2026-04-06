#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Applying database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Starting application process..."
exec "$@"
