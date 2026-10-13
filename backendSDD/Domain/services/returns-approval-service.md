# Servicio de Dominio: ReturnsApprovalService

> **Especificación Táctica de Servicio de Dominio.** Define la regla de doble verificación técnica y comercial requerida para autorizar la devolución de mercancía física y su reingreso a bodega.

---

## 1. Propósito y Responsabilidad
Asegurar la regla de negocio que exige **doble verificación** (peritaje físico del Operador Logístico + visto bueno comercial del Vendedor) antes de concretar la devolución de un producto físico, evitando fraudes y descuadres de existencias.

---

## 2. Bounded Context y Ubicación
- **Bounded Context:** `Returns Context`, coordinando con `Inventory Context`.
- **Ubicación en Código:** `Zentric.Domain/Returns/Services/ReturnsApprovalService.cs`.
- **Agregados Coordinados:** `ReturnRequest` (como sujeto de decisión) e `Inventory` (a través del evento de reingreso).

---

## 3. Entradas y Salidas
- **Input:**
  - `ReturnRequest request`: Instancia de la solicitud de devolución a evaluar.
  - `bool isSameWarehouseAndVendor`: Indicador computado en el servidor que determina si la recepción ocurre en la bodega privada del propio vendedor propietario.
- **Output:** `void` (delega en `ReturnRequest.ApproveByVendor(...)`, cambiando el estado a `Approved` o lanzando excepción si no se cumplen las condiciones).

---

## 4. Flujo Lógico y Reglas de Negocio (Doble Verificación Técnica y Comercial)

### Paso 1: Peritaje Técnico en Bodega (Logística)
- Cuando el paquete arriba a la bodega receptora, un usuario con rol `LogisticsOperator` inspecciona físicamente el bien.
- Invoca `request.Inspect(isGoodCondition)`. Si el producto está dañado por mal uso o abierto, el dictamen es negativo (`isGoodCondition = false`).

### Paso 2: Evaluación Comercial (Vendedor)
- El vendedor revisa la solicitud para autorizar el reingreso.
- **Regla General:** Para aprobarse, el producto debe contar obligatoriamente con inspección física favorable (`IsGoodCondition == true`).
- **Excepción de Misma Bodega:** Si el producto se recibe directamente en la bodega privada del propio vendedor (`isSameWarehouseAndVendor == true`), la inspección del operador no bloquea la decisión y el vendedor puede autorizar el reingreso bajo su propia discreción.

### Paso 3: Transición y Efectos
- Al cumplirse las condiciones, `request.ApproveByVendor()` pasa el estado a `ReturnStatus.Approved`.
- Emite el evento `ReturnApprovedEvent`.

---

## 5. Eventos de Dominio Emitidos y Efecto Secundario
- **`ReturnApprovedEvent`:** Emitido al aprobarse la devolución. El manejador de este evento toma el ítem y lo reingresa a la bodega correspondiente dentro del contador de mercancía usada (`Inventory.ReturnToUsedStock`).
- **Rechazo:** Si el vendedor o logística rechazan la devolución, el estado pasa a `Rejected` sin emitir eventos al inventario (la mercancía no reingresa).
