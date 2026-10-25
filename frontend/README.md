# Frontend — Consola operativa Zentric

Monorepo Turborepo que aloja el design system y la consola web que consume la API de Zentric.

| Estado | Alcance |
| --- | --- |
| `IN_PROGRESS` — fase **F1** | Monorepo, design tokens, logo y base shadcn/ui |

> La especificación que gobierna lo que debe construirse aquí está en
> [`../frontendSDD/`](../frontendSDD/), y el catálogo vivo de la API, en
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md).

---

## Estructura

Q10 separa por paquetes; Q16-A fija la raíz del monorepo en `frontend/` para
conservar `docker-compose.yml` (`context: ./frontend`) y el job de CI sin romperlos.

```text
frontend/
├── apps/frontend/        # La consola (Vite + React 19 + TanStack Router)
├── packages/
│   ├── ui/               # Design system: tokens, logo, shadcn/ui, lib y hooks
│   └── config/           # TS, ESLint y Prettier compartidos
├── turbo.json            # Pipeline de tareas
├── pnpm-workspace.yaml   # Definición de workspaces
└── package.json          # Scripts raíz (delegan en turbo)
```

**Regla de dependencia** ([`Frontend-Architecture.md` §3](../frontendSDD/Frontend-Architecture.md)):
`apps/frontend` → `packages/ui` → `packages/config`. `packages/ui` **no** importa de la app y
`packages/config` no importa de nadie.

---

## Stack

| Elemento | Versión | Motivo |
| --- | --- | --- |
| pnpm | 12.6 | Q17 — workspaces, symlinks, instalación incremental |
| Turborepo | 2.11 | Q10 — pipeline con caché entre paquetes |
| React | 19.3 | Q4 |
| Vite | 8.3 | Q4 — build rápido y compatible con Docker multietapa |
| Tailwind CSS | 4.3 | Q18 — el tema vive en CSS `@theme`, sin `tailwind.config.ts` |
| TanStack Router | 1.170 | Q11 — rutas type-safe registradas en `Register` |
| TanStack Query | 5.104 | Q9 — estado remoto |
| Vitest + Testing Library | 5.0 / 16.3 | Pruebas alineadas con el CI |

---

## Comandos

```powershell
# Instalar dependencias (desde frontend/)
pnpm install

# Servidor de desarrollo de la app (puerto 15434)
pnpm --filter @zentric/frontend dev

# Pipeline completo, delegado en turbo
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Ejecutar una tarea sólo en un paquete
pnpm --filter @zentric/ui test
```

> Requiere Node >= 24. La versión de pnpm se fija en `package.json#packageManager`
> y la respeta corepack, así que CI y equipo local corren la misma.

---

## Design system (`packages/ui`)

| Subcaminho | Contenido |
| --- | --- |
| `@zentric/ui/tokens` | Colores (Q7), tipografía (Q8) y escala de espaciado |
| `@zentric/ui/lib` | `cn()`, formateadores de dinero, fechas e identificadores |
| `@zentric/ui/hooks` | `useMediaQuery`, `useDebounce` |
| `@zentric/ui/logo` | `Logo`, `LogoMark`, `LogoWordmark` (Q6) |
| `@zentric/ui/styles/theme.css` | **Fuente de verdad del tema** (`@theme` de Tailwind v4) |

`packages/ui/src/tokens/*.ts` replica los valores del CSS para lo que necesita JavaScript.
**Si ambos divergen, manda el CSS**; la prueba `tokens.test.ts` falla si se separan.

---

## Variable de entorno

| Variable | Defecto | Descripción |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:15433` | URL base de la API Zentric |

> El puerto `8080` corresponde al **contenedor** de la API. Desde el host, Docker Compose
> publica el `15433`. En producción la URL se inyecta en tiempo de ejecución vía
> `window.__ZENTRIC_API_BASE_URL__` (nginx), así que la misma imagen sirve a cualquier entorno.

---

## Proxy de desarrollo (solución al bloqueo R-02)

`apps/frontend/vite.config.ts` reenvía `/api` y `/health` al backend. Permite trabajar
**sin CORS** mientras el backend no lo habilite:

```text
Navegador  ->  http://localhost:15434/api/...  ->  proxy  ->  http://localhost:15433/api/...
```

En cuanto el backend registre una política CORS, el proxy puede retirarse. Ver
[`../frontendSDD/Contract-alignment.md`](../frontendSDD/Contract-alignment.md#5-cors).

---

## Bloqueos conocidos

| ID | Bloqueo | Efecto |
| --- | --- | --- |
| ~~R-01~~ | ~~El backend no emite JWT~~ **RESUELTO 2026-09-28** | Existe `POST /api/auth/login` (JWT HS256). Ver `ADR-0009` |
| R-02 | El backend no habilita CORS | Mitigado con el proxy de desarrollo |
| R-03 | `GET /api/Logistics/fulfillment` devuelve 405 | El panel de despachos no puede listar |
| Q-28 | Catálogo anónimo (SEO del Buyer) aplazado | Las rutas de catálogo se diseñan públicas; el guard va en el botón *Comprar* |
