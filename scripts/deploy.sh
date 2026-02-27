#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"

if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
  echo "[ERROR] deploy/.env not found. Copy deploy/.env.example to deploy/.env first."
  exit 1
fi

cd "${DEPLOY_DIR}"

echo "[INFO] Pulling latest code..."
git -C "${ROOT_DIR}" pull --rebase

echo "[INFO] Building and starting services..."
docker compose --env-file .env up -d --build

echo "[INFO] Deployment completed."
docker compose ps
