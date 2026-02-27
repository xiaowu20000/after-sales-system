FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# 使用 npm install 以避免必须存在 package-lock.json 的限制
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY ./nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
