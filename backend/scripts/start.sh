#!/usr/bin/env bash
set -euo pipefail

echo "[start] Running gunicorn on 0.0.0.0:8000"
exec gunicorn core.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout 120
