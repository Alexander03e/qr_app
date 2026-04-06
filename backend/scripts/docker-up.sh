#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env.docker ]]; then
  echo "[docker-up] .env.docker not found, copying from .env.docker.example"
  cp .env.docker.example .env.docker
fi

echo "[docker-up] Building and starting containers..."
docker compose up --build -d

echo "[docker-up] Done. Service is available on http://localhost:8000"
