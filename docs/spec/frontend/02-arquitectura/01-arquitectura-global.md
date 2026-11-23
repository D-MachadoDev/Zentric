# Arquitectura global de Zentric

## 1. Principios
- Domain-first, DDD pragmático y arquitectura hexagonal (Ports & Adapters).
- SOLID, inversión de dependencias, alta cohesión y bajo acoplamiento.
- Las reglas e invariantes viven en el dominio/casos de uso, nunca en handlers, componentes UI o adaptadores.
- Separación clara entre dominio, aplicación, infraestructura y presentación.
- Contratos explícitos entre frontend y backend, OpenAPI versionado.
- Operaciones críticas observables, idempotentes cuando aplique, auditables y probadas bajo concurrencia.

## 2. Vista lógica
1. **Frontend Next.js (App Router):** navegación, accesibilidad, validación de entrada no autoritativa, estados de UI, consumo de API y presentación de resultados.
2. **API/Handlers C# (ASP.NET Core):** parseo, autenticación, validación estructural, mapeo de errores y respuesta HTTP; no contienen reglas de negocio.
3. **Application/use cases:** orquestan el caso de uso, cargan modelos mediante puertos, aplican políticas y coordinan persistencia/transacciones.
4. **Domain:** entidades, value objects, políticas, invariantes, eventos de dominio y estados válidos; sin imports HTTP, SQL, proveedor de pago o almacenamiento.
5. **Output ports:** contratos de repositorios, transacciones, pagos, media storage, reloj, IDs y servicios externos.
6. **Adapters:** PostgreSQL (EF Core), almacenamiento de objetos, simulador de pagos, autenticación/cripto y observabilidad.
7. **Composition root:** `Program.cs` / `Zentric.Api` construye adaptadores, servicios y router; no requiere framework DI externo.

## 3. Dependencias permitidas
- Domain no depende de Application, HTTP, SQL ni SDKs externos.
- Application puede depender de Domain y de interfaces/puertos.
- Adapters implementan puertos y pueden depender de SDKs, drivers y frameworks.
- Handler depende de Application/DTO HTTP y mapeos; no accede directamente a DB.
- Frontend no replica decisiones de autoridad ni asume éxito antes de respuesta confirmada.

## 4. Transacciones y consistencia
- Una transacción PostgreSQL debe encapsular Seller + primera Warehouse (ADR-0025).
- Checkout debe proteger la reserva y creación del pedido de condiciones de carrera. Definir la unidad transaccional exacta y restricciones SQL.
- Movimientos de inventario, reservas y liberaciones deben preservar no-negatividad bajo concurrencia (ADR-0025: actualización condicional atómica).
- Las integraciones externas no se deben simular como si fueran parte de una transacción SQL. Usar estados explícitos, outbox/saga/reconciliación cuando el caso lo requiera y la decisión esté aprobada.
- No introducir una saga genérica por defecto: documentar el proceso distribuido y sus compensaciones concretas.

## 5. Seguridad transversal
- Autenticación y autorización server-side para cada operación.
- Verificación de rol + estado + ownership + scope; denegar por defecto.
- No aceptar del cliente precio final, rol, balance de stock, estado final de pedido ni decisiones de autorización.
- Secretos solo por configuración segura; no commitear credenciales.
- Rate limits y protección antiabuso en login, recuperación, uploads y endpoints sensibles según política aprobada.
- Logs sin contraseñas, tokens, datos de pago sensibles ni URLs firmadas reutilizables.

## 6. Observabilidad
- Correlation ID propagado desde API hacia logs y llamadas internas.
- Logs estructurados; métricas para errores, latencia, stock conflicts, pagos inciertos y fallos de integración.
- Auditoría de operaciones sensibles con actor, recurso, acción, timestamp, resultado y motivo cuando aplique.
- Health/readiness endpoints sin filtrar secretos.

## 7. Decisiones arquitectónicas que no debe inventar un agente
Proveedor concreto de object storage, framework HTTP, librería JWT, estrategia de migraciones, broker de mensajes, proveedor real de pagos y plataforma de despliegue requieren aprobación o alineación con el repositorio existente.