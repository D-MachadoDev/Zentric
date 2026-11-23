# Frontend — Zentric

React 19 + TypeScript + Vite web console for the Zentric marketplace. Consumes the .NET REST API (port `15433`) and serves per-role UIs for buyers, sellers, logistics, administrators, supervisors and authentication.

## Stack

| Element | Version | Notes |
|---------|---------|-------|
| React | 19.3 | |
| Vite | 8.x | dev server on port `15434` |
| TypeScript | 5.x | strict, `tsc --noEmit` typecheck |
| TanStack Router | 1.170 | type-safe routes |
| TanStack Query | 5.104 | server state |
| Tailwind CSS | v4 | theme via CSS `@theme` (no `tailwind.config.ts`) |
| shadcn/ui | — | configured via `components.json` |
| Vitest + Testing Library | — | unit tests |
| Playwright | — | e2e browser tests |

## Structure

```
frontend/
  src/
    app/            # components, guards, layouts, providers, routes
    core/           # API client (HttpClient), session, shared services
    features/       # admin, auth, buyer, logistics, seller, supervisor
    ui/             # design system: tokens, primitives, shadcn/ui
    styles/         # global CSS and @theme tokens
  tests/            # Playwright e2e specs
  public/           # static assets
```

The canonical frontend specification lives in [`../docs/spec/frontend/`](../docs/spec/frontend/).

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server → http://localhost:15434
pnpm build            # typecheck + production bundle
pnpm test             # Vitest unit tests (run once)
pnpm test:watch       # Vitest in watch mode
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm e2e              # Playwright end-to-end
pnpm quality:gate     # typecheck + tests + design-system audit
```

Requires Node >= 24. The pnpm version is pinned via `package.json#packageManager`.

## Configuration

- API base URL: `VITE_API_BASE_URL` (default `http://localhost:15433`).
- In Docker, nginx injects `window.__ZENTRIC_API_BASE_URL` at runtime (see `nginx.conf` and `Dockerfile`).
- Copy `frontend/.env.example` to `frontend/.env` for local overrides.

## Ports

| Environment | Port |
|-------------|------|
| Dev (Vite) | `15434` |
| Docker (nginx) | `15435` (host) → `80` (container) |
