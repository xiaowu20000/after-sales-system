# User Web Chat (Vue3)

## Run

1. `npm install`
2. `npm run dev`

Optional env:
- `VITE_API_BASE` (default `/api`)
- `VITE_SOCKET_BASE` (default `/`)

## Component

- File: `src/components/CustomerChatWidget.vue`
- Usage example:
  - `<CustomerChatWidget :user-id="2" :admin-id="1" base-url="http://127.0.0.1:3000" />`

## Implemented

- Email register/login UI
- Registration by email verification code
- Bottom-right floating customer-service entrance
- Text message send
- Image upload + send (`POST /upload`, then socket `IMAGE`)
- Click-to-zoom image lightbox
- Friendly error tips for backend codes:
  - `FORBIDDEN_WORD`
  - `BLACKLISTED`
