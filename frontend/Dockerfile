# ---- Build stage ----
# Q16-A: la raiz del monorepo es frontend/, asi que el contexto de build no
# cambia y docker-compose.yml sigue apuntando a ./frontend.
# Q17: el gestor de paquetes es pnpm, no npm. El lockfile es pnpm-lock.yaml.
FROM node:24-alpine AS build
WORKDIR /app

# pnpm viene via corepack: respeta "packageManager" del package.json raiz,
# que fija la version exacta. Asi la imagen y el equipo local usan lo mismo.
#
# --dns-result-order=ipv4first: en redes con IPv6 anunciado pero no enrutable
# (comun en Docker Desktop), Node resuelve primero AAAA y la peticion expira
# aunque IPv4 funcione. Se verifica con `npm ping` dentro del contenedor:
# con la orden responde PONG; sin ella, ETIMEDOUT.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

# Se copian primero los manifiestos para aprovechar la cache de la capa:
# si sólo cambia codigo, la instalacion no se repite.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

# --frozen-lockfile: en CI/contenedores nunca se reescribe el lockfile.
# Si package.json y lockfile discrepan, falla en vez de discrepar en silencio.
RUN pnpm install --frozen-lockfile --filter @zentric/frontend...

COPY . .
RUN pnpm --filter @zentric/frontend build

# ---- Runtime stage ----
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
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

# Usuario no root
RUN addgroup -S zentric && adduser -S zentric -G zentric \
  && chown -R zentric:zentric /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid && chown -R zentric:zentric /var/run/nginx.pid
USER zentric

CMD ["nginx", "-g", "daemon off;"]
