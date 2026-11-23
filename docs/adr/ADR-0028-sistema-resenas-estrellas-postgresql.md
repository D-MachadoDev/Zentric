# ADR-0028 — Sistema de Reseñas, Calificación por Estrellas y Agregación en PostgreSQL Relacional

- **Estado:** [APROBADO]
- **Fecha:** 2026-11-20
- **Autor:** Data & Backend Engineering Team
- **Ámbito:** Backend (`Zentric.Domain`, `Zentric.Application`, `Zentric.Infrastructure`, `Zentric.Api`)
- **Relacionado con:** [ADR-0013](ADR-0013-propiedad-del-recurso-por-rol.md) (Propiedad de Recurso) y [ADR-0024](ADR-0024-entrega-digital-inmediata-por-linea.md) (Entrega Inmediata)

---

## Contexto

Para fortalecer la confianza comercial (Buyer Trust) y proporcionar señales de reputación objetivas en Zentric Marketplace, se requiere un sistema de calificación cuantitativa (1 a 5 estrellas) y opiniones cualitativas (reseñas escritas con título y comentario) sobre los productos comercializados.

### Fuerzas en Conflicto
1. **Autenticidad y Prevención de Reseñas Falsas (Verified Purchase)**:
   - Permitir que cualquier usuario anónimo o registrado reseñe productos sin haberlos comprado degrada la integridad del catálogo mediante spam o manipulación de competidores. La Ley de Zentric exige trazabilidad estricta.
2. **Escalabilidad y Rendimiento en Lectura (Read Throughput en Catálogo)**:
   - Las consultas masivas de listado de productos (`GET /api/catalog/products`) y paginación no pueden ejecutar funciones agregadas en tiempo real (`SELECT AVG(stars), COUNT(*) FROM reviews WHERE product_id = @id`) para cientos de productos en cada petición. Esto causaría contención masiva de I/O en PostgreSQL 16.
3. **Persistencia e Integridad Relacional**:
   - Se debe mantener consistencia transaccional sin introducir bases de datos adicionales (NoSQL) ni servicios SaaS externos que encarezcan la infraestructura.

---

## Alternativas Consideradas

| | Opción | Por qué se descartó / Ventaja |
|---|---|---|
| **A** | **Modelo Híbrido Relacional con Compra Verificada y Columnas Desnormalizadas en `Product`** | — **Elegida.** Garantiza compra verificada a nivel de agregados y permite lecturas de catálogo $O(1)$ sin joins agregados. |
| **B** | Tabla `Reviews` pura con vistas SQL o cálculo `AVG()` en tiempo de lectura | Colapsa la base de datos bajo tráfico moderado en el endpoint público del catálogo; ineficiente en paginación masiva. |
| **C** | Servicio externo SaaS o base de datos NoSQL externa (DynamoDB / MongoDB) | Viola la arquitectura consolidada de PostgreSQL 16; impide validar transaccionalmente la orden de compra con el comprador sin acoplamiento de red. |

---

## Decisión

Se adopta un **Modelo Relacional Transaccional con Validación de Compra Verificada y Contadores Agregados Desnormalizados en `Product`**:

1. **Nuevo Agregado / Entidad de Dominio `ProductReview`**:
   - `Id` (Guid, PK)
   - `ProductId` (Guid, FK hacia `Product`)
   - `BuyerId` (Guid, FK hacia `Buyer`)
   - `CustomerOrderId` (Guid, FK hacia `CustomerOrder`)
   - `Rating` (int: 1, 2, 3, 4 o 5)
   - `Title` (string, max 100 caracteres)
   - `Comment` (string, max 2000 caracteres)
   - `IsVerifiedPurchase` (bool, forzado a `true`)
   - `CreatedAt` y `UpdatedAt` (DateTimeOffset gobernados por `IClock` - ADR-0010)

2. **Invariante de Negocio: Compra Verificada y Unicidad**:
   - Una reseña solo puede ser creada si el `BuyerId` autenticado posee al menos una orden `CustomerOrder` en estado `Paid` que contenga una línea (`OrderItem`) vinculada al `ProductId`.
   - **Restricción de Unicidad**: `UNIQUE (product_id, buyer_id)` a nivel de base de datos. Un comprador solo puede registrar una (1) reseña por producto, pero dispone de permiso para editar o actualizar su calificación en el futuro (`UpdateProductReviewCommand`).

3. **Optimización de Lecturas en la Tabla `Product`**:
   - La tabla física `products` incorpora tres columnas desnormalizadas:
     - `rating_average NUMERIC(3,2) DEFAULT 0.00`
     - `review_count INTEGER DEFAULT 0`
     - `rating_distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb`
   - El comando de escritura (`CreateProductReviewCommand` / `UpdateProductReviewCommand`) actualiza atómicamente el registro del producto dentro de la misma transacción (Unit of Work), garantizando que las consultas públicas de catálogo obtengan el promedio y total de opiniones en tiempo $O(1)$ sin realizar joins.

4. **Contrato de API REST**:
   - `POST /api/catalog/products/{productId}/reviews` (Exige Rol Comprador autenticado)
   - `PUT /api/catalog/products/{productId}/reviews/{reviewId}` (Solo el autor de la reseña)
   - `GET /api/catalog/products/{productId}/reviews` (Público, paginado, ordenable por `newest`, `highest_rating`, `lowest_rating`)

---

## Trade-offs Evaluados

- **Qué Ganamos:**
  - 100% de autenticidad: cero reseñas falsas o no verificadas en el marketplace.
  - Velocidad de respuesta instantánea en el catálogo público y fichas de producto.
  - Totalmente contenido dentro de PostgreSQL 16 con Entity Framework Core 10 sin dependencias externas.
- **Qué Sacrificamos:**
  - Ligero sobrecosto computacional en la escritura (cálculo y persistencia de contadores agregados al momento de emitir la reseña).

---

## Consecuencias

- **En Dominio:** Se crea la entidad `ProductReview` con invariantes de rango (1 a 5) y métodos semánticos `Create(...)` y `Update(...)`.
- **En Aplicación:** Se implementan `CreateProductReviewCommand`, `UpdateProductReviewCommand` y `GetProductReviewsQuery` con validadores FluentValidation.
- **En Persistencia:** Migración de base de datos en `Zentric.Infrastructure` con índices btree en `(product_id, created_at DESC)` y la restricción única `(product_id, buyer_id)`.
