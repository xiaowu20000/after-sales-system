# After Sales System

Monorepo:
- `backend-nestjs` (NestJS API + Socket.io)
- `admin-app` (uni-app admin client)
- `user-web` (Vue3 web client)

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: init after-sales system"
git branch -M main
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

## 2. One-Click Deploy on Server (Docker Compose)

### 2.1 Clone

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

### 2.2 Initialize

```bash
chmod +x scripts/server-init.sh scripts/deploy.sh
./scripts/server-init.sh
./scripts/init-deploy.sh chat.google-banana.com 1233 <db-password> <jwt-secret> <admin-email> <admin-password>
```

This command initializes:
- `deploy/.env`
- `deploy/host.nginx.<domain>.conf`

### 2.3 Deploy

```bash
./scripts/deploy.sh
```

After deploy:
- internal project gateway: `http://127.0.0.1:1233`

### 2.4 Domain Binding (host nginx)

Target:
- domain: `chat.google-banana.com`
- server: `107.174.35.205`
- host nginx -> reverse proxy to `127.0.0.1:1233`

DNS:
- A record: `chat.google-banana.com -> 107.174.35.205`

Host nginx vhost:

```nginx
server {
    listen 80;
    server_name chat.google-banana.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.google-banana.com;

    ssl_certificate /etc/letsencrypt/live/chat.google-banana.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.google-banana.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:1233;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then public access:
- user web: `https://chat.google-banana.com/`
- api base: `https://chat.google-banana.com/api`
- socket path: `https://chat.google-banana.com/socket.io/`

## 3. Daily Update

```bash
git pull
./scripts/deploy.sh
```

## 4. Optional: Auto Deploy from GitHub Actions

Workflow file:
- `.github/workflows/deploy.yml`

Add repository secrets:
- `SSH_HOST`: server IP/domain
- `SSH_USER`: server login user
- `SSH_PRIVATE_KEY`: private key content
- `SERVER_PROJECT_PATH`: absolute path to repo on server

Then each push to `main` will trigger:
- `git pull --rebase`
- `./scripts/deploy.sh`

## 5. Notes

- Backend DB migrations run at startup (`migrationsRun: true`).
- `admin-app` is mobile client; package and release via HBuilderX.
- Initial admin is configurable via `INIT_ADMIN_EMAIL` and `INIT_ADMIN_PASSWORD`.
