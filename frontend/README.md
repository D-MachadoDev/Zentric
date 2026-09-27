# Frontend — Consola operativa Zentric

Consola web que consume la API de Zentric.

| Estado | Alcance |
| --- | --- |
| `NOT_STARTED` | Implementación de capas, módulos y pruebas |

> **Este directorio contiene únicamente la configuración base.** No hay código de
> aplicación todavía. La especificación completa que gobierna lo que debe
> construirse aquí está en [`../frontendSDD/`](../frontendSDD/).

---

## Especificación (léase antes de implementar)

| Documento | Contenido |
| --- | --- |
| [`../frontendSDD/Frontend-SDD.md`](../frontendSDD/Frontend-SDD.md) | Orquestador: fases, estado, riesgos y bloqueos |
| [`../frontendSDD/Frontend-Architecture.md`](../frontendSDD/Frontend-Architecture.md) | Capas, puertos y límites de dependencia |
| [`../frontendSDD/Frontend-Domain-Services.md`](../frontendSDD/Frontend-Domain-Services.md) | Casos de uso del cliente |
| [`../frontendSDD/Frontend-Adapters.md`](../frontendSDD/Frontend-Adapters.md) | Mapeo de los 27 endpoints |
| [`../frontendSDD/Frontend-Role-Modules.md`](../frontendSDD/Frontend-Role-Modules.md) | Módulos por rol de Zentric |
| [`../frontendSDD/Frontend-Design-System.md`](../frontendSDD/Frontend-Design-System.md) | Tokens, componentes y accesibilidad |
| [`../frontendSDD/Frontend-User-Flows.md`](../frontendSDD/Frontend-User-Flows.md) | Recorridos observables |
| [`../frontendSDD/Contract-alignment.md`](../frontendSDD/Contract-alignment.md) | Auditoría cliente ↔ servidor |

---

## Stack

| Elemento | Versión | Motivo |
| --- | --- | --- |
| React | 18.3 | Componentes y enrutado con el equipo |
| TypeScript | 5.6 | Tipado estricto del contrato con la API |
| Vite | 5.4 | Build rápido y compatible con Docker multietapa |
| React Router | 6.27 | Módulos navegables por rol |
| TanStack Query | 5.59 | Cacheo y estados de carga y error consistentes |
| Vitest + Testing Library | 2.1 / 16 | Pruebas alineadas con el CI |

---

## Configuración

| Archivo | Propósito |
| --- | --- |
| `package.json` | Dependencias y scripts (`dev`, `build`, `preview`, `test`, `typecheck`) |
| `tsconfig.json` | TypeScript estricto, alias `@/*` → `src/*` |
| `vite.config.ts` | Plugin de React, alias, proxy de desarrollo, configuración de Vitest |
| `index.html` | Documento raíz con metadatos y punto de montaje |
| `.env.example` | Plantilla de `VITE_API_BASE_URL` |

### Variable de entorno

| Variable | Defecto | Descripción |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5076` | URL base de la API Zentric |

> El puerto `8080` corresponde al **contenedor** de la API. Desde el host,
> Docker Compose publica el `5076`.

---

## Comandos

```powershell
# Instalar dependencias
cd frontend; npm install

# Servidor de desarrollo (puerto 5173)
cd frontend; npm run dev

# Verificación de tipos
cd frontend; npm run typecheck

# Compilación de producción
cd frontend; npm run build

# Pruebas
cd frontend; npm test
```

Los tres últimos requieren que exista `src/`; fallarán mientras la implementación
esté en `NOT_STARTED`. `npm run dev` y `npm install` ya funcionan.

---

## Proxy de desarrollo (solución al bloqueo R-02)

`vite.config.ts` define un proxy que reenvía `/api` y `/health` al backend. Esto
permite trabajar **sin CORS** mientras el backend no lo habilite:

```text
Navegador  ->  http://localhost:5173/api/...  ->  proxy  ->  http://localhost:5076/api/...
```

En cuanto el backend registre una política CORS, el proxy puede retirarse. Ver
[`../frontendSDD/Contract-alignment.md`](../frontendSDD/Contract-alignment.md) §4.

---

## Bloqueos conocidos

| ID | Bloqueo | Efecto |
| --- | --- | --- |
| R-01 | El backend no emite JWT | No hay login real; la sesión es provisional |
| R-02 | El backend no habilita CORS | Mitigado con el proxy de desarrollo |
| R-03 | `GET /api/Logistics/fulfillment` devuelve 405 | El panel de despachos no puede listar |

Mientras R-01 siga abierto, **no es posible construir una pantalla de acceso
auténtica**. Está registrado como decisión pendiente del Owner en
[`../frontendSDD/Frontend-SDD.md`](../frontendSDD/Frontend-SDD.md) §7.
