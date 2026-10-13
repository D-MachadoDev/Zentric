# Servicio de Dominio: RefundPolicyService

> **Especificación Táctica de Servicio de Dominio.** Define la política de clasificación y evaluación de reembolsos financieros, diferenciando resoluciones automáticas de la plataforma frente a excepciones que exigen autorización administrativa.

---

## 1. Propósito y Responsabilidad
Orquestar la decisión técnica de cuándo un reembolso es de aplicación **automática** por el sistema y cuándo constituye una **excepción** que requiere dictamen manual de un usuario con rol `Administrator`.

Garantiza el principio de segregación de funciones: los vendedores pueden autorizar devoluciones físicas, pero solo la plataforma y sus administradores gobiernan la salida de dinero.

---

## 2. Bounded Context y Ubicación
- **Bounded Context:** `Returns Context` en coordinación con `Payments Context` y `Ordering Context`.
- **Ubicación en Código:** `Zentric.Domain/Returns/Services/RefundPolicyService.cs`.
- **Agregados Coordinados:** `ReturnRequest`, `CustomerOrder`, `PaymentReceipt`.

---

## 3. Entradas y Salidas
- **Input:**
  - `RefundContext`: Estructura inmutable que transporta `CustomerOrderId`, `ReturnRequestId`, `VariantId`, `Quantity` y `Reason`.
- **Output:**
  - `Task<RefundDecision>`: Retorna si la decisión es automática (`RefundDecision.Auto(ruleApplied)`) o excepción administrativa (`RefundDecision.Exception(reason)`).

---

## 4. Reglas de Clasificación e Invariantes

### 1. Reembolsos Automáticos (`RefundDecision.Auto`)
Ocurren cuando la causa de la devolución no depende de peritaje comercial ni arbitraje humano:
- **Causa Estándar:** Quiebre físico de existencias durante el alistamiento de paquetes (`stock_breakage`, originado por `PartialFulfillmentCancelledDomainEvent`).
- **Comportamiento:** El sistema aprueba el reembolso de inmediato sin intervención manual, aplicando la regla `EXC-02`.

### 2. Reembolsos por Excepción (`RefundDecision.Exception`)
Aplica a cualquier otra disputa posventa:
- Devoluciones comerciales ordinarias aprobadas por el vendedor (`vendor_approved_return`).
- Reclamos por inconformidad o garantías.
- **Comportamiento:** Requiere la aprobación expresa de un `Administrator` en la API (`POST /api/returns/{id}/refund`), registrándose en [`RefundAudit`](../01-models.md).

### 3. Validación Monetaria de Fondos
Antes de emitir cualquier dictamen favorable:
- El importe a devolver se calcula a partir del precio unitario congelado en la línea de compra (`OrderItem.UnitPrice`).
- Se verifica que el saldo remanente no reembolsado en el comprobante de pago (`PaymentReceipt.Amount - PaymentReceipt.RefundedAmount`) sea suficiente para cubrir el importe solicitado.

---

## 5. Auditoría Inmutable
Toda decisión evaluada por este servicio deja una traza inalterable en la entidad de auditoría `RefundAudit` (almacenando regla aplicada, tipo de decisión, monto intentado y actor responsable).
