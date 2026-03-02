#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"

DOMAIN="${1:-chat.google-banana.com}"
INTERNAL_PORT="${2:-1233}"
DB_PASSWORD="${3:-change_me_db_password}"
JWT_SECRET="${4:-change_me_jwt_secret}"
INIT_ADMIN_EMAIL="${5:-admin@example.com}"
INIT_ADMIN_PASSWORD="${6:-Admin123456}"

if [[ ! "${INTERNAL_PORT}" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] INTERNAL_PORT must be a number."
  exit 1
fi

cat > "${DEPLOY_DIR}/.env" <<EOF
DB_DATABASE=after_sales
DB_USERNAME=after_sales
DB_PASSWORD=${DB_PASSWORD}

INTERNAL_PORT=${INTERNAL_PORT}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

CORS_ORIGINS=https://${DOMAIN}

INIT_ADMIN_EMAIL=${INIT_ADMIN_EMAIL}
INIT_ADMIN_PASSWORD=${INIT_ADMIN_PASSWORD}
EOF

cat > "${DEPLOY_DIR}/host.nginx.${DOMAIN}.conf" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${INTERNAL_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "[INFO] Initialized deploy config:"
echo "  - ${DEPLOY_DIR}/.env"
echo "  - ${DEPLOY_DIR}/host.nginx.${DOMAIN}.conf"
echo "[INFO] Next:"
echo "  1) Review ${DEPLOY_DIR}/.env"
echo "  2) Copy host.nginx.*.conf into your host nginx sites"
echo "  3) ./scripts/deploy.sh"
