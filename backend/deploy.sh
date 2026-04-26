#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${HOME}/app"
cd "$APP_DIR"

[ -f .env ] || { echo "Erro: .env nao encontrado em $APP_DIR"; exit 1; }

PREV_HEAD=$(git rev-parse HEAD)

git fetch origin main
git checkout origin/main

NEW_HEAD=$(git rev-parse HEAD)

docker compose up -d --build

echo "Deployed: ${PREV_HEAD:0:7} -> ${NEW_HEAD:0:7}"
