FROM node:22-alpine AS build

WORKDIR /app
ENV HUSKY=0

COPY package*.json ./
# postinstall(copy-vad-assets.mjs)이 npm ci 도중 실행되므로 scripts/를 먼저 복사해야 한다.
COPY scripts ./scripts
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

ENV BACKEND_ORIGIN=http://fabbear-backend:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
