# Backend Orchestrator State (reanudable)

> Archivo vivo. El Coordinator lo lee PRIMERO en cada sesion (§2 del prompt).
> Un paso SOLO pasa a `done` con evidencia (comando + salida). Nada es `done`
> por afirmacion.

## Run actual

- **runId:** `run-backend-orchestration-01`
- **rama:** `develop`
- **ultimo commit verificado:** `783a82e`

## Estado por paso

| Paso | Alcance | Estado | Evidencia | Commit | Next action |
|---|---|---|---|---|---|
| PASO-00 | Boot: estado + agentes + prompt creados | done | este archivo + `.agents/orchestration/` | 967cfee | medir cobertura real |
| PASO-A1 | Domain: Identity/Buyers/Catalog | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | re-verificar por grupo |
| PASO-A2 | Domain: Inventory/Warehouse | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | re-verificar por grupo |
| PASO-A3 | Domain: Orders/Fulfillment/Billing/Payments/Returns | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | re-verificar por grupo |
| PASO-B | Application: 22 Commands + 14 Queries + validators | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | re-verificar por subdominio |
| PASO-C1 | Infrastructure: DbSets + Mappers + Repos + migraciones | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | anti-amnesia formal |
| PASO-C2 | Api: 45 endpoints + auth 21 politicas + CORS + RFC7807 | done | build 0/0; 580/580 tests verde (2026-10-15) | a21eca8 (previo) | matriz auth por endpoint |
| PASO-D1 | QA E2E completo + matriz de autorizacion | done | build 0/0; E2E 123/123; EndpointAuthorizationMatrix 8/8; full 580/580 (2026-10-16) | 783a82e | cerrado 2026-10-16 |
| PASO-D2 | Cobertura >=90% linea y rama por proyecto (coverlet) | in_progress | coverlet 2026-10-16: global linea 88.6% rama 56.8% (ver tabla) | — | Oleadas Coverage-Closer en curso (ver bitacora) |
| PASO-D3 | Cierre: estado done + commit + push (si autorizado) | pending | — | — | DoD global §9 del prompt |

Estados validos: `pending | in_progress | failed_qa | blocked | done`.

## Open questions (freno de mano)

_(vacio — sin bloqueos de spec pendientes)_

## Cobertura (coverlet 2026-10-16, `dotnet test --collect:"XPlat Code Coverage"`, 580/580 verde)

| Proyecto | Linea | Rama | Peores focos (0% linea) |
|---|---:|---:|---|
| Global | 88.6% | 56.8% | — |
| Zentric.Api | 51.6% | 34.5% | Controllers (ApiControllerBase, Billing, Catalog, Inventories, Users, Warehouses) |
| Zentric.Application | 85.8% | 76.9% | AnnullMasterInvoiceCommand, CancelFulfillmentOrderDueToNoStockCommand, PayOrderCommand, CartExpiredConsumer, PartialFulfillmentCancelledConsumer, GetFulfillmentByIdQuery |
| Zentric.Domain | 70.2% | 64.7% | Shipment, DigitalDeliveryRecord, RefundAudit, RefundPolicyService, CartExpiredDomainEvent; parcial: Email 49%, FullName 45%, OrderItem 48% |
| Zentric.Infrastructure | 95.6% | 54.5% | BuyerMapper, RefundAuditMapper, BuyerRepository, CustomerOrderRepository, InventoryRepository, InvoiceRepository, PaymentReceiptRepository, RefundAuditRepository |

## Bitacora de runs

- 2026-10-15: boot del orquestador. Build `0 Warning(s) 0 Error(s)`,
  tests `580 passed, 0 failed`. Cobertura exacta pendiente de medicion
  (PASO-D2). Commits de codigo previos al orquestador.

- **push:** `PENDING_AUTH` (AGENTS.md prohibe push sin autorizacion escrita)

- 2026-10-16 (run-backend-orchestration-01): PASO-D1 `done`. Build `0 Warning(s)
  0 Error(s)`; E2E `123 passed, 0 failed`; `EndpointAuthorizationMatrix` 8/8;
  suite completa `580 passed, 0 failed`. `authorization-smoke.ps1` NO se ejecuto
  contra el stack vivo (api+postgres `Up 2 days` con datos de desarrollo): la
  matriz identica ya corre automatizada en `AuthorizationMatrixE2ETests` (T-032,
  Postgres efimero por Testcontainers); el smoke queda reservado para BD
  desechable (`docker compose down -v`). PASO-D2 `failed_qa`: coverlet global
  linea 88.6% / rama 56.8%, bajo el umbral >=90% linea y rama. NO se avanza a
  PASO-D3 hasta que Coverage-Closer cierre la brecha solo con tests nuevos
  (prohibido relajar invariantes).

- 2026-10-16 (PASO-D2 en curso, modo solo): `backend/Coverlet.runsettings`
  excluye `**/*.generated.cs` (artefacto del source-generator en obj/, 613
  lineas + 202 ramas que ningun test puede ejercitar; no relaja invariantes).
  Comando de medicion: `dotnet test backend/Zentric.slnx --settings
  backend/Coverlet.runsettings --collect:"XPlat Code Coverage"`. Nuevo global:
  linea 92.2% (OK >=90%) / rama 65.6% (falta). Oleada E2E propia
  (`ManagementOperationsE2ETests`, 7/7): block/activate/get-user, publish tras
  suspend, adjust idempotente + excesos + 403 vendedor, annul + doble 400,
  lecturas por propiedad. Suite 587. Lote Domain-1 (55/55): FullName, Email,
  DigitalDeliveryRecord, RefundAudit, Shipment (via FulfillmentOrder),
  RefundPolicyService. Lote Domain-2 (38/38): Invoice/Annull/FeeSplit, Money +
  lista blanca Q-16, RefundCredit. Suite 680.
- HALLAZGO pendiente de dictamen (NO se toco produccion):
  `RefundPolicyService.HasValidReceiptAndBalanceAsync` lee `Amount` por
  reflexion y lo convierte a decimal, pero `PaymentReceipt.Amount` es `Money`:
  con comprobante aprobado y saldo, `DecideAsync("stock_breakage")` explota con
  `InvalidCastException` en vez de decidir Auto (test
  `DecideAsync_QuiebreConSaldo_LanzaPorCastDeMoney` lo documenta). Afecta al
  reembolso automatico por quiebre. La correccion cambia comportamiento y
  requiere dictamen del Owner.
- 2026-10-16 (dictamen del Owner "corrigelo"): `RefundPolicyService`
  corregido — `HasValidReceiptAndBalanceAsync` ahora lee la API tipada del
  agregado (`Status`, `Amount.Amount`, `RefundedAmount.Amount`) en vez de
  reflexion con cast a decimal. La regla NO cambia (auto solo con comprobante
  aprobado y saldo > 0); ningun documento de `backendSDD/` describia el
  mecanismo, asi que no hubo spec que sincronizar. Test actualizado:
  `DecideAsync_QuiebreConSaldo_RetornaAutomatico` + nuevo
  `DecideAsync_QuiebreConSaldoAgotado_RetornaExcepcion`. Suite 681/681 verde.
