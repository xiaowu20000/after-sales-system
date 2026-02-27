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
cp deploy/.env.example deploy/.env
```

Edit `deploy/.env`:
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS`

### 2.3 Deploy

```bash
./scripts/deploy.sh
```

After deploy:
- user web: `http://<server-ip>/`
- api base: `http://<server-ip>/api`
- socket path: `http://<server-ip>/socket.io/`

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
