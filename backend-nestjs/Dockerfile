FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# 使用 npm install 以避免必须存在 package-lock.json 的限制
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# 只安装生产依赖
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
