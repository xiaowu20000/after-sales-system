#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker is required. Install Docker first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] docker compose plugin is required."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "${ROOT_DIR}/deploy/data/postgres"
mkdir -p "${ROOT_DIR}/deploy/data/uploads"

chmod +x "${ROOT_DIR}/scripts/deploy.sh"
chmod +x "${ROOT_DIR}/scripts/init-deploy.sh"

echo "[INFO] Server init done."
echo "[INFO] Next:"
echo "  1) ./scripts/init-deploy.sh <domain> <internal-port> <db-password> <jwt-secret> <admin-email> <admin-password>"
echo "  2) copy deploy/host.nginx.<domain>.conf to host nginx and reload"
echo "  3) ./scripts/deploy.sh"
