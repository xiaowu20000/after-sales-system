# Admin App (uni-app Vue3)

## Setup

1. Install dependency:
   - `npm install`
2. Configure backend base URL in:
   - `config/index.js`
3. Run in HBuilderX.

## Features

- Login page (`pages/login/login`)
  - JWT login with admin account
- Mail config page (`pages/settings/mail-config`)
  - Configure SMTP host/port/secure/user/auth code/from email
- Home page (`pages/index/index`)
  - Active consultation list
  - Last message preview
  - Unread count
- Chat page (`pages/chat/chat`)
  - Two-way real-time messaging via `socket.io-client`
  - Quick phrase panel with one-click fill
  - Blacklist switch (calls `/users/:id`)
  - Image choose/camera + upload + send IMAGE message
  - `uni.previewImage` for image message preview
  - Cleanup image storage folders by days (`DELETE /upload/cleanup?days=n`)
