# Registro de Decisiones de Arquitectura (ADRs) — Zentric Marketplace

> **Área**: Documentación Técnica y Arquitectura (Diátaxis)  
> **Ubicación Canónica**: `docs/adr/`  
> **Formato**: MADR (Markdown Architectural Decision Records)  
> **Última Actualización**: 2026-11-20

Este directorio alberga las decisiones arquitectónicas vinculantes que rigen el backend (.NET 10), frontend (React 19 / Vite), esquemas de persistencia (PostgreSQL 16) y modelos de dominio de Zentric.

---

## Índice Maestro de Decisiones de Arquitectura

| ADR | Título | Estado | Ámbito Principal |
| :---: | :--- | :---: | :--- |
| **[ADR-0001](ADR-0001-reserva-fragmentacion-contingencia.md)** | Reserva de inventario: bodega única con fraccionamiento de contingencia | Aceptado | Dominio / Inventarios |
| **[ADR-0002](ADR-0002-clave-inventario-variantid.md)** | Clave del inventario: `VariantId` (SKU) | Aceptado | Dominio / Productos / Stock |
| **[ADR-0003](ADR-0003-variante-obligatoria-productos-fisicos.md)** | Los productos físicos exigen al menos una variante con dimensiones | Aceptado | Dominio / Catálogo |
| **[ADR-0004](ADR-0004-estado-cancelacion-despacho.md)** | El estado Cancelled de `FulfillmentOrder` exige un motivo | Aceptado | Dominio / Logística |
| **[ADR-0005](ADR-0005-modelado-carrito-compras.md)** | El carrito se modela en el agregado `CustomerOrder` (estado `Cart`) | Aceptado | Dominio / Pedidos |
| **[ADR-0006](ADR-0006-resolucion-contradiccion-ley-addendum.md)** | El addendum prevalece sobre la Ley en facturas y despachos | Aceptado | Gobernanza de Negocio |
| **[ADR-0007](ADR-0007-dispatcher-propio-sustituye-mediatr.md)** | Dispatcher propio en lugar de MediatR para comandos y consultas | Aceptado | Aplicación / CQRS |
| **[ADR-0008](ADR-0008-transportadora-y-tarifa-de-envio.md)** | Transportadora única por bodega y tarifa a cargo del comprador | Aceptado | Logística / Tarifas |
| **[ADR-0009](ADR-0009-autenticacion-jwt-rg01.md)** | Autenticación simétrica con JWT en `POST /api/auth/login` | Aceptado | Seguridad / Presentación |
| **[ADR-0010](ADR-0010-relojo-como-puerto-iclock.md)** | El tiempo entra al dominio a través del puerto inyectable `IClock` | Aceptado | Dominio / Puertos |
| **[ADR-0011](ADR-0011-matriz-autorizacion-por-rol.md)** | 21 políticas registradas con `FallbackPolicy` fail-closed | Aceptado | Seguridad / Autorización |
| **[ADR-0012](ADR-0012-contrato-json-de-los-enum-por-nombre.md)** | Enumeraciones se serializan exclusivamente como texto en JSON | Aceptado | Presentación / API |
| **[ADR-0013](ADR-0013-propiedad-del-recurso-por-rol.md)** | El rol define el filtro de propiedad; recurso ajeno devuelve 404 | Aceptado | Aplicación / Seguridad |
| **[ADR-0014](ADR-0014-enmiendas-a-la-matriz-de-autorizacion.md)** | Enmiendas operativas a la matriz de roles y permisos | Aceptado | Seguridad / Autorización |
| **[ADR-0015](ADR-0015-contrato-de-error-http-problem-json.md)** | Respuestas de error estandarizadas bajo RFC 7807 (Problem Details) | Aceptado | Presentación / API |
| **[ADR-0016](ADR-0016-pruebas-e2e-http-con-postgres-efimero.md)** | Pruebas de integración E2E HTTP sobre PostgreSQL efímero en Docker | Aceptado | Testing / Infraestructura |
| **[ADR-0017](ADR-0017-listados-de-recurso-propio.md)** | Endpoints de consulta masiva con filtrado obligatorio por llamante | Aceptado | Aplicación / CQRS |
| **[ADR-0018](ADR-0018-devoluciones-confianza-recepcion-responsabilidad.md)** | Inspección física en bodega y responsabilidad del vendedor | Aceptado | Posventa / Devoluciones |
| **[ADR-0019](ADR-0019-auditoria-reembolsos-excepcionales.md)** | Registro inmutable de auditoría para reembolsos de Administrador | Aceptado | Auditoría / Posventa |
| **[ADR-0020](ADR-0020-precio-congelado-y-credito-parcial-por-linea.md)** | Precio congelado por línea de carrito y nota crédito proporcional | Aceptado | Dominio / Precios |
| **[ADR-0021](ADR-0021-ajuste-de-stock-sin-cuello-de-botella.md)** | Ajuste de stock según tipo de bodega sin cuellos de botella | Aceptado | Dominio / Inventarios |
| **[ADR-0022](ADR-0022-pedido-resuelto-pasa-a-cancelled.md)** | Pedido transiciona a `Cancelled` si todos sus despachos son cancelados | Aceptado | Dominio / Pedidos |
| **[ADR-0023](ADR-0023-split-de-pagos-documentos-no-transferencias.md)** | Split de pagos satisfecho mediante 3 documentos contables | Aceptado | Facturación / Dominio |
| **[ADR-0024](ADR-0024-entrega-digital-inmediata-por-linea.md)** | La entrega digital es inmediata al pago y se registra por línea | Aceptado | Dominio / Logística Digital |
| **[ADR-0025](ADR-0025-stock-negativo-update-condicional-atomico.md)** | No-negatividad de stock garantizada con UPDATE condicional atómico | Aceptado | Persistencia / SQL |
| **[ADR-0026](ADR-0026-estrategia-dominios-seo-marketplace.md)** | Estrategia de Dominios y SEO para Marketplace Multi-Vendedor | Aceptado | Frontend / SEO / Routing |
| **[ADR-0027](ADR-0027-split-sticky-variantes-no-cromaticas.md)** | Split Sticky y Selección de Variantes No Cromáticas en PDP | Aceptado | Frontend / UI / Conversión |
| **[ADR-0028](ADR-0028-sistema-resenas-estrellas-postgresql.md)** | Sistema de Reseñas, Calificación por Estrellas y Agregación en PostgreSQL | Aceptado | Dominio / CQRS / PostgreSQL |
| **[ADR-0029](ADR-0029-modularizacion-guest-cart-zod.md)** | Modularización del Subsistema GuestCart con Validación Defensiva Zod y Resiliencia | Aceptado | Frontend / Carrito / Resiliencia |
| **[ADR-0030](ADR-0030-recuperacion-contrasena-cqrs-resend-polaris.md)** | Vertical Slice Architecture para Recuperación y Restablecimiento de Contraseñas | Aceptado | Fullstack / CQRS / Polaris / Resend |

---

## Gobernanza de Estados Documentales

Conforme al marco de ingeniería:
- Los registros en estado `[PROPUESTO]` reflejan diseños de arquitectura previos o paralelos a la implementación de código.
- Los registros son promovidos formalmente a `Aceptado` una vez que la verificación técnica adversarial aprueba la suite de pruebas automatizadas con Exit Code 0.
