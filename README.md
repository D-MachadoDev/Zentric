# Zentric Marketplace

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16.15--alpine-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

Multi-vendor e-commerce marketplace. Buyers shop a shared catalog, sellers manage products and inventory, logistics operators run fulfillment, and administrators govern billing and refunds — all from one centralized platform.

---

## Overview

Zentric intermediates between buyers and sellers across the full commercial lifecycle:

- **Catalog** — physical and digital products, variants, images, ratings and reviews.
- **Inventory** — distributed stock per warehouse and variant (SKU), with atomic reservation and no-negative-stock guarantees.
- **Orders** — cart → checkout (15-minute reservation) → payment → fulfillment → delivery.
- **Fulfillment** — per-seller dispatch orders with packing, dispatch and delivery certification.
- **Billing** — master invoice, per-vendor split detail and platform commission breakdown.
- **Returns & refunds** — warranty window validation, physical inspection, and stock re-entry (used/refurbished).

### Roles

| Role | Responsibilities |
|------|------------------|
| **Buyer** | Public catalog, cart, checkout, orders, returns and reviews. |
| **Seller** | Products, inventory, store profile and payouts. |
| **Logistics Operator** | Warehouse receiving, packing, dispatch and delivery certification. |
| **Administrator** | Seller onboarding, warehouses, billing and refunds. |
| **Supervisor** | Read-only operational oversight. |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 10, ASP.NET Core, C# |
| Architecture | Hexagonal (Ports & Adapters), DDD, CQRS |
| Persistence | PostgreSQL 16.15, EF Core 10 |
| Auth | JWT (HS256), PBKDF2 password hashing, role-based authorization |
| Frontend | React 19, TypeScript, Vite |
| Routing / state | TanStack Router + Query |
| Styling | Tailwind CSS v4, shadcn/ui |
| Package manager | pnpm (workspaces) |
| Infra | Docker Compose, Nginx |

---

## Repository layout

```
backend/
  Zentric.Domain/         # Pure domain: aggregates, value objects, invariants
  Zentric.Application/     # CQRS commands & queries, validation pipeline
  Zentric.Infrastructure/  # EF Core persistence, mappers, background workers
  Zentric.Api/             # REST controllers, authorization, composition root
  Zentric.Tests/           # xUnit test suite
frontend/
  src/features/            # buyer, seller, logistics, admin, supervisor, auth
  src/app/layouts/         # per-role layout shells
  src/core/                # API client, session, shared services
  tests/                   # Vitest unit tests + Playwright e2e
docs/
  adr/                     # Architecture Decision Records (ADR-0001 … ADR-0030)
  spec/backend/            # Backend specification (domain, architecture, use cases, API)
  spec/frontend/           # Frontend specification (business, architecture, design)
scripts/
  ops/                     # PostgreSQL backup / restore
```

---

## Quick start

### Docker Compose (recommended)

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| API & Swagger UI | http://localhost:15433/swagger |
| Frontend | http://localhost:15435 |
| PostgreSQL | localhost:15432 (db `ZentricDb`, user `postgres`) |

Stop while keeping data:

```bash
docker compose down
```

Reset with a clean database (re-applies migrations and bootstrap):

```bash
docker compose down -v && docker compose up -d --build
```

Configuration is read from `.env` (copy `.env.example` first). The bootstrap administrator is created on first run only if no administrator exists.

### Local development (.NET 10 SDK + pnpm)

```bash
# Backend
dotnet restore backend/Zentric.slnx
dotnet build backend/Zentric.slnx -warnaserror
dotnet run --project backend/Zentric.Api/Zentric.Api.csproj
# → API & Swagger: http://localhost:15433/swagger · health: http://localhost:15433/health

# Frontend
cd frontend
pnpm install
pnpm dev
# → http://localhost:15434
```

---

## Testing

```bash
# Backend (unit + architecture; excludes E2E with Testcontainers)
dotnet test backend/Zentric.slnx --filter "FullyQualifiedName!~E2E"

# Backend (full suite, including E2E against ephemeral PostgreSQL)
dotnet test backend/Zentric.slnx

# Frontend (unit)
cd frontend && pnpm test

# Frontend (end-to-end, Playwright)
cd frontend && pnpm e2e

# Frontend typecheck
cd frontend && pnpm typecheck
```

---

## API

The REST API exposes 45 routes across authentication, users, warehouses, inventories, catalog, orders, logistics, returns and billing. Errors follow RFC 7807 (`application/problem+json`). The authoritative endpoint catalog lives in `docs/spec/backend/` and is browsable interactively via Swagger at `/swagger`.

---

## Architecture

The backend follows a strict Hexagonal layering (dependencies point inward):

```
Presentation (Zentric.Api) → Application (CQRS) → Domain (pure)
                              Infrastructure (EF Core) → Domain
```

- **Domain** is free of framework and persistence concerns; state mutates only through expressive aggregate methods.
- **Application** orchestrates use cases as commands/queries with a FluentValidation pipeline.
- **Infrastructure** uses dedicated `*DbModel` / `*Mapper` pairs so EF Core never leaks into the domain.
- **Authorization** is a fail-closed role matrix (21 policies), verified by reflection-based tests.

Architecture decisions are recorded as ADRs in [`docs/adr/`](./docs/adr/).

---

## License

[MIT](./LICENSE)
