# Clasificacion de Hallazgos - Zentric

Auditoria sin modificaciones de codigo.

## 1. Endpoints Backend

| # | Controller | Metodo | Ruta | Consumidor Frontend | Clasificacion |
|---|-----------|--------|------|---------------------|---------------|
| 1 | Auth | POST | /api/auth/login | Si | MANTENER-DOCUMENTAR |
| 2 | Auth | GET | /api/auth/me | Si | MANTENER-DOCUMENTAR |
| 3-6 | Billing | various | /api/billing/invoices/* | Si | MANTENER-DOCUMENTAR |
| 7-17 | Catalog | various | /api/catalog/* | Si | MANTENER-DOCUMENTAR |
| 18-22 | Inventories | various | /api/inventories/* | Si | MANTENER-DOCUMENTAR |
| 23-29 | Logistics | various | /api/logistics/* | Si | MANTENER-DOCUMENTAR |
| 30 | Orders | GET | /api/orders | Si | MANTENER-DOCUMENTAR |
| 31 | Orders | GET | /api/orders/buyer | NO | REVISAR |
| 32-39 | Orders | various | /api/orders/* | Si | MANTENER-DOCUMENTAR |
| 40-46 | Returns | various | /api/returns/* | Si | MANTENER-DOCUMENTAR |
| 47-53 | Users | various | /api/users/* | Si | MANTENER-DOCUMENTAR |
| 54-57 | Warehouses | various | /api/warehouses/* | Si | MANTENER-DOCUMENTAR |
| 58-59 | Health | GET | /health, /ready | Parcial | MANTENER-DOCUMENTAR |

Hallazgo critico: Endpoint #31 (GET /api/Orders/buyer) no tiene consumidor en frontend. El frontend usa GET /api/Orders. El endpoint /buyer es redundante. Cubierto por tests (SddSynchronizationSlicesTests, EndpointAuthorizationMatrixTests). Clasificacion: REVISAR.

## 2. Componentes Frontend

Todos los componentes exportados por modulos estan referenciados en routeTree.tsx. No hay componentes huerfanos a nivel de export.

| Modulo | Exportados | Consumidos | Clasificacion |
|--------|-----------|------------|---------------|
| buyer | 12 | 12/12 | MANTENER-DOCUMENTAR |
| seller | 8 | 8/8 | MANTENER-DOCUMENTAR |
| admin | 7 | 7/7 | MANTENER-DOCUMENTAR |
| auth | 3 | 3/3 | MANTENER-DOCUMENTAR |
| logistics | 4 | 4/4 | MANTENER-DOCUMENTAR |
| supervisor | 7 | 7/7 | MANTENER-DOCUMENTAR |

## 3. Hallazgos Audit V2

| # | Categoria | Hallazgo | Archivo | Linea | Clasificacion |
|---|-----------|----------|---------|-------|---------------|
| 1 | Secretos | Password hardcodeada AdminLocal12345 | CorporateLoginPage.tsx | 120 | BORRAR |
| 2 | Secretos | Fallback password AdminLocal12345 | AdministratorBootstrapper.cs | 43 | IMPLEMENTAR |
| 3 | Secretos | Credenciales CI en workflow | frontend-quality.yml | 57,87,96,115 | MANTENER-DOCUMENTAR |
| 4 | Codigo no usado TS | 65 variables/imports no usados | Multiples | Varias | BORRAR |
| 5 | Duplicacion backend | 269 clones, 36.17% | Todo backend/ | - | REVISAR |
| 6 | Duplicacion frontend | 219 clones, 6.93% | Todo frontend/ | - | REVISAR |
| 7 | Abstracciones | ICurrentUserAccessor una sola impl | ClaimsUserAccessor.cs | 29 | REVISAR |

## 4. Documentacion vs Codigo

| Claim | Verificado | Clasificacion |
|-------|-----------|---------------|
| IErrorHandler centralizado | No existe | BORRAR (claim falso) |
| ExceptionHandlingMiddleware centralizado | No existe | BORRAR (claim falso) |
| Soft-delete inventarios | Implementado (commit ca93fd0) | MANTENER-DOCUMENTAR |
| PdfSharp 6.0 upgrade | Implementado, compila OK | MANTENER-DOCUMENTAR |

## 5. Resumen

| Clasificacion | Cantidad | Accion |
|---------------|----------|--------|
| MANTENER-DOCUMENTAR | 60 endpoints + 41 componentes | Sin cambios |
| REVISAR | 3 | Decision humana |
| IMPLEMENTAR | 2 | Completar |
| BORRAR | 4 | Eliminar codigo muerto |
| N/A | 2 | Corregir docs |
