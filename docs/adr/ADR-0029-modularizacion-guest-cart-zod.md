# ADR-0029 — Modularización del Subsistema GuestCart con Validación Defensiva Zod y Resiliencia de Sincronización

- **Estado:** [APROBADO]
- **Fecha:** 2026-11-21
- **Autor:** Carlos (Agente T-005 — Guardián Diátaxis) / Aprobado por Marcos (Agente T-003 — Auditor RDD)
- **Ámbito:** Frontend (`frontend/src/features/buyer/cart/`, `frontend/src/features/buyer/guestCart.ts`)
- **Relacionado con:** [ADR-0005](ADR-0005-modelado-carrito-compras.md) (Carrito en CustomerOrder) y [ADR-0015](ADR-0015-contrato-de-error-http-problem-json.md) (Problem Details)

---

## Contexto

El archivo `guestCart.ts` en `frontend/src/features/buyer/` operaba históricamente como un monolito concentrador de responsabilidades: definía interfaces de TypeScript, esquemas de serialización en `localStorage`, emisión de eventos globales de ventana (`window.dispatchEvent`), lógica de persistencia y algoritmos de sincronización de carrito invitado hacia el backend tras el login.

### Fuerzas en Conflicto

1. **Riesgo de Corrupción en Almacenamiento Local (Storage Corruption)**:
   - Los datos leídos desde `localStorage` carecían de una barrera defensiva en tiempo de ejecución. Cualquier dato manipulado o con esquemas antiguos generaba excepciones no controladas (`TypeError: Cannot read properties of undefined`) en componentes visuales consumidores.
2. **Fragilidad en Sincronización de Sesión (Session Drift / Bloqueador D1)**:
   - Si la sincronización del carrito invitado contra el backend fallaba por problemas de red o concurrencia durante el proceso de login, abortaba el flujo completo de autenticación, dejando al comprador en un limbo operativo.
3. **Mantenibilidad y Acoplamiento (Separación de Responsabilidades)**:
   - Múltiples componentes y pruebas dependían de funciones heterogéneas concentradas en un único archivo de más de 400 líneas, dificultando la prueba unitaria aislada de cada subcapa.

---

## Alternativas Consideradas

| | Opción | Justificación |
|---|---|---|
| **A** | **Arquitectura por Capas Modular con Fachada Retrocompatible y Zod `safeParse`** | — **Elegida.** Desacopla tipos, esquemas, eventos, storage y sincronización en `features/buyer/cart/`, manteniendo `guestCart.ts` como re-export fachada para no quebrar consumidores existentes. |
| **B** | Mantener el monolito `guestCart.ts` añadiendo funciones adicionales | Aumenta la deuda técnica, eleva el blast radius ante cambios y perpetúa la falta de aislamiento en pruebas. |
| **C** | Migrar el estado del carrito a una librería externa global (Zustand/Redux) | Sobrecarga de dependencias innecesaria para un subsistema efímero de almacenamiento local cuyo destino canónico es el backend. |

---

## Decisión

Se adopta una **Arquitectura Modular por Capas para el Carrito Invitado** bajo la ruta `frontend/src/features/buyer/cart/`:

1. **Estructura Modular Desacoplada**:
   - `types.ts`: Definiciones canónicas de contratos de datos (`GuestCartItem`, `GuestCart`, `CartSyncResult`).
   - `schemas.ts`: Esquemas de validación Zod en tiempo de ejecución (`GuestCartItemSchema`, `GuestCartSchema`) con coerción y valores por defecto defensivos.
   - `events.ts`: Publicación y suscripción tipada de eventos reactivos del ciclo de vida del carrito (`emitCartUpdated`, `subscribeToCartUpdates`).
   - `storage.ts`: Gestión de `localStorage` con barrera anti-corrupción vía `GuestCartSchema.safeParse`. Si el contenido en disco está corrupto, se purga de forma segura retornando un carrito vacío válido sin lanzar excepciones.
   - `sync.ts`: Algoritmo resiliente de sincronización de sesión contra el endpoint `POST /api/cart/items`. Captura errores de red sin abortar el flujo principal de autenticación (resolución Blocker D1).
   - `index.ts`: Punto único de exportación del módulo.

2. **Fachada de Compatibilidad hacia Atrás**:
   - `frontend/src/features/buyer/guestCart.ts` se conserva marcado con `@deprecated`, re-exportando el 100% de los identificadores desde `./cart` para garantizar cero regresiones en el código cliente existente.

3. **Suite de Pruebas TDD Aislada**:
   - `__tests__/cartModule.test.ts`: 19 pruebas unitarias cubriendo serialización, eventos, resiliencia ante datos corruptos y sincronización con mock de API.

---

## Consecuencias

### Positivas
- Cero fallos por desincronización de esquemas en `localStorage`.
- Desacoplamiento total verificado con 19 pruebas unitarias limpias.
- 100% retrocompatible: ningún componente consumidor existente requirió reescritura forzada.

### Negativas / Mitigaciones
- Existe duplicidad transitoria en rutas de importación (`guestCart.ts` vs `cart/`); se mitigará migrando gradualmente las importaciones a `@/features/buyer/cart`.
