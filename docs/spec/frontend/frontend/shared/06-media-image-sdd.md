# Zentric — SDD transversal: Medios e Imágenes

## 1. Alcance
Define el ciclo de vida de assets visuales en Zentric: productos, perfiles, logos, categorías, banners, pruebas de entrega, inspecciones. Aplicable a **todos los roles**.

## 2. Tipos de recurso (`resourceType`)
| Tipo | Entidad dueña | Público/Privado | TTL URL firmada | Fallback |
|------|---------------|-----------------|-----------------|----------|
| `product` | Product | Público | 1 año (CDN) | `product-placeholder.svg` |
| `seller_profile` | Seller | Público | 1 año | `seller-placeholder.svg` |
| `seller_logo` | Seller | Público | 1 año | `logo-placeholder.svg` |
| `category` | Category | Público | 1 año | `category-placeholder.svg` |
| `user_avatar` | User (Buyer) | Privado | 1 hora | Iniciales (BG determinista) |
| `return_inspection` | ReturnRequest | Privado | 24h | `inspection-placeholder.svg` |
| `fulfillment_proof` | FulfillmentOrder | Privado | 24h | `proof-placeholder.svg` |
| `banner` | Config | Público | 1 año | `banner-placeholder.svg` |

## 3. Flow de subida (Upload)
1. **Frontend**: Usuario selecciona archivo → valida tipo/tamaño client-side (UX) → llama `POST /api/v1/media/upload-url` con `{ resourceType, resourceId, fileName, contentType }`.
2. **Backend**: Valida auth + scope (ownership) → genera signed PUT URL (S3/MinIO/Azure) + campos form-data → responde `{ uploadUrl, fields, expiresAt, storageKey }`.
3. **Frontend**: `fetch(uploadUrl, { method: 'PUT', body: file, headers: fields })` → espera 200.
4. **Frontend**: Confirma `POST /api/v1/media/confirm` con `{ storageKey, resourceType, resourceId }`.
5. **Backend**: Valida MIME real (magic bytes), tamaño, escanea malware → genera thumbnail (si policy) → registra metadata en `MediaAsset` → responde `{ cdnUrl, thumbnailUrl, metadata }`.
6. **Frontend**: Muestra preview + éxito. Actualiza UI optimista.

## 4. Validaciones (Backend = autoridad)
- **MIME permitidos**: `image/webp`, `image/avif`, `image/jpeg`, `image/png`. Rechazar `image/gif` (no optimizable), `application/*`.
- **Tamaño máx**: 10 MB (configurable por `resourceType` via config).
- **Dimensiones**: Mín 100×100px. Máx 4000×4000px.
- **Nombre almacenamiento**: `{resourceType}/{resourceId}/{uuid}.{ext}` (sin info usuario).
- **Thumbnail**: 300×300 WebP (auto) para listados. Original preservado.

## 5. URLs y entrega
- **Públicos (product, seller, category, banner)**: CDN URL estable (`https://cdn.zentric.com/{storageKey}`). `Cache-Control: public, max-age=31536000, immutable`.
- **Privados (avatar, inspection, proof)**: Signed GET URL (TTL 1h default, configurable). `Cache-Control: private, max-age=3600`.
- **Dominios permitidos** en `next.config.js` (`images.remotePatterns`).

## 6. Componente `ImageUploader` (reutilizable)
- Props: `resourceType`, `resourceId`, `accept`, `maxSizeMB`, `multiple`, `onComplete`, `value` (MediaAsset[]).
- Estados: empty → dropzone/click → uploading (progress) → preview grid → confirmed.
- Accesibilidad: `aria-label`, keyboard (Enter/Space para abrir, Escape para cancelar), focus trap en modal.
- Fallback: Si upload falla → toast error + botón "Reintentar" + link a ayuda.

## 7. Componente `ProductGallery` / `Avatar` / `Logo` (reutilizables)
- `ProductGallery`: Thumbnails + main image + zoom (lightbox) + keyboard nav. `priority` en primera imagen.
- `Avatar`: 1:1, `object-fit: cover`, fallback iniciales (BG hash email), `alt` = nombre.
- `Logo`: Max-height 40px, width auto, fallback texto nombre.

## 8. Limpieza y retención (INC-07 - ABIERTO)
- **Huérfanos**: Job nocturno busca `MediaAsset` sin entidad referenciada > 30d → soft delete → purge storage tras 90d.
- **Versiones**: Al reemplazar imagen → marca anterior `deprecated` → purge tras 30d.
- **Retención legal**: Facturas/inspecciones → retención 5 años (configurable).

## 9. Criterios de aceptación
- Upload flow funciona en todos los roles (Buyer avatar, Seller product/logo, Logistics proof, Admin banner).
- Backend rechaza MIME/tamaño inválidos → frontend muestra error claro.
- Imágenes públicas cargan por CDN (rápido, cacheado). Privadas por signed URL (seguro).
- `next/image` configurado con dominios, fallback, blur placeholder.
- No URLs arbitrarias en `src` ni `alt` con datos personales.
- Tests: Unit (validaciones), Integration (upload flow completo), E2E (subir + ver en detalle).