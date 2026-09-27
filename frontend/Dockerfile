# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app

# Se copian primero los manifiestos para aprovechar la cache de npm
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS final

# Se elimina la configuracion por defecto de nginx y se instala la propia
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/zentric.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Se sobreescribe la URL de la API en tiempo de ejecucion para no reconstruir
# la imagen por entorno. Ver frontendSDD/Frontend-Architecture.md seccion 7.
RUN printf '%s\n' \
  '<script>window.__ZENTRIC_API_BASE_URL__="'"${ZENTRIC_API_BASE_URL:-}"'";</script>' \
  > /usr/share/nginx/html/env-config.js \
  && sed -i 's#</head>#<script src="/env-config.js"></script></head>#' \
       /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

# Usuario no root
RUN addgroup -S zentric && adduser -S zentric -G zentric \
  && chown -R zentric:zentric /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid && chown -R zentric:zentric /var/run/nginx.pid
USER zentric

CMD ["nginx", "-g", "daemon off;"]