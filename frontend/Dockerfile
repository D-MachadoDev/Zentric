# La raiz del monorepo es frontend/; docker-compose apunta a ./frontend.
# Gestor de paquetes pnpm con pnpm-lock.yaml.
FROM node:24-alpine AS build
WORKDIR /app

# pnpm via corepack respetando version fijada en package.json raiz.
# ipv4first evita timeout en redes con IPv6 anunciado no enrutable.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

# Manifiestos primero para cachear la capa de dependencias.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

# frozen-lockfile falla en CI si package.json y el lockfile discrepan.
RUN pnpm install --frozen-lockfile --filter @zentric/frontend...

COPY . .
RUN pnpm --filter @zentric/frontend build

FROM nginx:1.27-alpine AS final

# Se elimina la configuracion por defecto de nginx y se instala la propia
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/zentric.conf
# El build del monorepo deja la salida en apps/frontend/dist, no en dist.
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Se sobreescribe la URL de la API en tiempo de ejecucion para no reconstruir
# la imagen por entorno. Ver frontendSDD/Frontend-Architecture.md seccion 7.
RUN printf '%s\n' \
  'window.__ZENTRIC_API_BASE_URL__ = "'"${ZENTRIC_API_BASE_URL:-}"'";' \
  > /usr/share/nginx/html/env-config.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

# Usuario no root
RUN addgroup -S zentric && adduser -S zentric -G zentric \
  && chown -R zentric:zentric /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid && chown -R zentric:zentric /var/run/nginx.pid
USER zentric

CMD ["nginx", "-g", "daemon off;"]
