# Backend — Integraciones y Servicios Externos — Zentric

## 1. Principios
- **Puertos en dominio**: `IPaymentGatewayService`, `IMediaStorageService`, `IEmailService`, `ISmsService`, `IClock`, `IIdGenerator`.
- **Adapters en infraestructura**: Implementaciones concretas desacopladas del dominio.
- **Contratos estables**: DTOs de integración en `Zentric.Application.Common.Models.Integration`.
- **Resilencia**: Timeout, retry (Polly), circuit breaker, fallback. No bloquear dominio por integración lenta.
- **Observabilidad**: Correlation ID propagado. Logs de request/response (sin secrets). Métricas latencia, error rate, circuit state.

## 2. Payment Gateway (Puerto: `IPaymentGatewayService`)
**V1: Simulado** (`SimulatedPaymentGateway`)
- `InitiatePayment(amount, currency, orderId, returnUrl) -> PaymentInitiationResult` (idempotent por `orderId`).
- `GetPaymentStatus(attemptId) -> PaymentStatus` (polling si async).
- `Refund(paymentReceiptId, amount) -> RefundResult`.
- **Simulación**: 90% success, 10% failure. Latencia configurable (default 500ms). Webhook opcional para async.

**Futuro: Proveedor real** (Stripe, MercadoPago, Wompi, etc.)
- Adapter implementa mismo puerto. Config por env vars / Key Vault.
- Webhook endpoint `/api/v1/payments/webhook` valida firma, actualiza `PaymentReceipt`.
- Idempotency key = `orderId` + `attemptNumber`.
- Estados: `Pending` → `Authorized`/`Failed` → `Refunded` (parcial/total).
- **INC-03**: Diseñar `PENDING_RECONCILIATION` para timeouts/unknown antes de integrar real.

## 3. Media Storage (Puerto: `IMediaStorageService`)
**Operaciones**:
- `GetUploadUrl(resourceType, resourceId, fileName, contentType, ttlMinutes) -> SignedUploadUrlDto` (url, fields, expiresAt).
- `GetDownloadUrl(resourceType, resourceId, fileName, ttlMinutes) -> string` (público o firmado).
- `Delete(resourceType, resourceId, fileName) -> bool`.
- `GenerateThumbnail(resourceType, resourceId, fileName, width, height) -> ThumbnailDto` (opcional, async).

**Recursos tipados** (`resourceType`): `product`, `seller_profile`, `seller_logo`, `category`, `user_avatar`, `return_inspection`, `fulfillment_proof`.

**Proveedores**: S3-compatible (MinIO, AWS S3, Cloudflare R2), Azure Blob, GCS, Local (dev).
- **INC-07**: Formatos, tamaño max, TTL, retención, limpieza huérfanos → ADR dedicado.

**Seguridad**:
- Frontend pide signed URL a backend → backend valida auth/scope/tipo → genera URL firmada (PUT para upload, GET para download privado).
- Backend valida MIME real (magic bytes), tamaño, detecta malware (ClamAV/buckets scan).
- Nombres de almacenamiento generados en servidor (`{resourceType}/{resourceId}/{uuid}.{ext}`).
- CDN frente a bucket público. Cache-Control: `public, max-age=31536000, immutable` para assets versionados.

## 4. Email Service (Puerto: `IEmailService`)
**Templates** (Razor/Liquid en `Zentric.Infrastructure/Email/Templates`):
- `welcome_buyer`, `welcome_seller`, `order_confirmed`, `payment_failed`, `checkout_expired`, `order_shipped`, `order_delivered`, `return_requested`, `return_approved`, `return_rejected`, `refund_processed`, `password_recovery`, `password_changed`.

**Proveedor**: SendGrid, Mailgun, AWS SES, SMTP (configurable).
- **Rate limit**: 100/min por IP, 1000/hora por dominio.
- **Suppressions**: Bounce, complaint, unsubscribe listas.
- **Tracking**: Open/click (opcional, consentimiento).

## 5. SMS / Notificaciones Push (Puerto: `ISmsService` / `IPushService`)
- **SMS**: Twilio, Vonage, Plivo. Templates: `checkout_otp`, `delivery_otp`, `order_status_change`.
- **Push**: Firebase (FCM), OneSignal. Topics: `buyer_{id}`, `seller_{id}`, `logistics_{id}`.
- **INC-08**: Canales, plantillas, consentimiento → ADR dedicado.

## 6. Clock & ID Generator (Puertos: `IClock`, `IIdGenerator`)
- `IClock`: `UtcNow` (permite time travel en tests). Implementación real = `SystemClock`.
- `IIdGenerator`: `NewGuid()`, `NewSequentialGuid()` (para PKs clusterizados), `NewUlid()`. Implementación real = `GuidGenerator`.

## 7. Patrones de integración distribuida
- **Outbox Pattern** (para eventos que cruzan fronteras): Tabla `outbox_messages` (id, type, payload, created_at, processed_at). Worker/background service publica a broker (si existe) o llama HTTP.
- **Saga coreografiada** (evitar orquestador central): Cada paso emite evento → siguiente servicio reacciona. Compensación = evento inverso.
- **Reconciliación programada**: Jobs nocturnos comparan estado local vs proveedor (pagos, storage, email delivery) y corrigen drift.

## 8. Testing de integraciones
- **Contract tests**: Pact para payment gateway, media storage, email.
- **Test doubles**: `FakePaymentGateway`, `FakeMediaStorage` en tests de aplicación.
- **Integration tests**: Testcontainers + proveedores reales en staging (LocalStack para S3, Stripe test mode).
- **Chaos**: Simular latencia, errores 5xx, timeouts, circuit open → verificar fallback y no corrupción.