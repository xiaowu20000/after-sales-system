# After Sales Backend (NestJS)

## 1. Install

```bash
npm install
```

## 2. Configure DB

Copy `.env.example` to `.env` and edit values:

```env
DB_TYPE=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=after_sales
NODE_ENV=production
CORS_ORIGINS=https://admin.example.com,https://user.example.com
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
```

`DB_TYPE` supports `postgres` and `mysql`.

`synchronize` is disabled. Schema is managed by migrations and runs automatically on startup.

## 3. Run

```bash
npm run start:dev
```

## 4. API Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/send-register-code`
- `POST /auth/register`

Default seeded admin:
- email: `admin@example.com`
- password: `Admin123456`

### Admin Mail Config (ADMIN token required)

- `PUT /admin/mail-config`
- `GET /admin/mail-config`

### Users

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /users/me`

### Messages

- `POST /messages` (ADMIN)
- `GET /messages?peerId=2&page=1&pageSize=20`
- `GET /messages/conversations?page=1&pageSize=20`
- `GET /messages/:id`
- `PATCH /messages/:id` (ADMIN)
- `DELETE /messages/:id` (ADMIN)

### Quick Phrases

- `POST /quick-phrases`
- `GET /quick-phrases`
- `GET /quick-phrases/:id`
- `PATCH /quick-phrases/:id`
- `DELETE /quick-phrases/:id`

### Forbidden Words

- `POST /forbidden-words`
- `GET /forbidden-words`
- `GET /forbidden-words/:id`
- `PATCH /forbidden-words/:id`
- `DELETE /forbidden-words/:id`

### Upload

- `POST /upload` (multipart/form-data)
- fields:
  - `file`: image file
- response:
  - `{ "url": "http://127.0.0.1:3000/uploads/2026-02-27/xxx.png" }`
- file storage:
  - `uploads/YYYY-MM-DD/filename.ext`
- cleanup:
  - `DELETE /upload/cleanup?days=7` (ADMIN)

## 5. WebSocket

- transport: `socket.io`
- connect with `userId`:
  - `io("http://127.0.0.1:3000", { auth: { token: "JWT_TOKEN" } })`
  - or query: `?token=JWT_TOKEN`

### Client -> Server

- event: `send_message`
- payload:
  - `receiverId: number`
  - `content: string`
  - `type: "TEXT" | "IMAGE"`

### Server -> Client

- `connected`: connect success
- `new_message`: sent/received message
- `message_blocked`: forbidden word intercepted
- `chat_error`: connection/message rejected (blacklisted, invalid data, etc.)
