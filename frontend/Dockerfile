FROM node:24-alpine AS build
WORKDIR /app

ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine AS final

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/zentric.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
  'window.__ZENTRIC_API_BASE_URL__ = "'"${ZENTRIC_API_BASE_URL:-}"'";' \
  > /usr/share/nginx/html/env-config.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

RUN addgroup -S zentric && adduser -S zentric -G zentric \
  && chown -R zentric:zentric /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid && chown -R zentric:zentric /var/run/nginx.pid
USER zentric

CMD ["nginx", "-g", "daemon off;"]
