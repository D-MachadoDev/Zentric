# Servicios de Aplicación y Esquemas Zod (Frontend Domain Services)

> Casos de uso del cliente Zentric. Orquestan los puertos del dominio y gestionan el estado remoto de TanStack Query; permanecen completamente desacoplados del DOM, componentes de React y detalles de transporte HTTP.

---

## 1. Principio Rector: Intenciones de Negocio de la Ley

Cada servicio de aplicación modela una intención de usuario expresada en el lenguaje ubicuo de la Ley ([`ZENTRIC.md`](../ZENTRIC.md)) y los contratos CQRS del backend ([`backendSDD/Application/01-use-cases-and-ports.md`](../backendSDD/Application/01-use-cases-and-ports.md)).

- **Validación Preventiva en Cliente:** Esquemas Zod que replican con precisión los validadores FluentValidation del backend para proporcionar retroalimentación inmediata sin realizar peticiones de red redundantes.
- **Autoridad Suprema en el Servidor:** Las reglas críticas de concurrencia, unicidad y contabilidad financiera no se replican en el cliente; el servicio despacha la petición al puerto y propaga fielmente la respuesta del backend.
- **Inmutabilidad de la Sesión:** Un comando administrativo de creación de usuario (ej. `RegistrarUsuarioService`) devuelve el identificador de la entidad creada y **nunca altera la identidad ni los tokens del usuario autenticado**.

---

## 2. Catálogo de Servicios por Módulo Funcional

### 2.1 Identidad y Control de Acceso
Coordinan el ciclo de vida de la sesión activa en memoria RAM:

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`IniciarSesionService`** | `ZentricApiPort`, `SessionPort` | Ejecuta `POST /api/auth/login`, recibe el token Bearer JWT y almacena las credenciales **exclusivamente en la memoria RAM** de `SessionPort`, cumpliendo la política de seguridad ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). |
| **`RestaurarSesionService`** | `ZentricApiPort`, `SessionPort` | Al cargar la SPA, si existe un token en la memoria volátil, consulta `GET /api/auth/me` para validar vigencia. **No existe mecanismo de refresh token**: si no hay token o caducó (60 min), la sesión expira inmediatamente. |
| **`CerrarSesionService`** | `SessionPort` | Purga el token JWT de la memoria RAM y reestablece el estado al contexto inicial anónimo. |
| **`RegistrarUsuarioService`** | `ZentricApiPort` | Alta de nuevo usuario (`CreateUserCommand`). La unicidad de correo y documento la audita la base de datos PostgreSQL. No altera la sesión del administrador llamante. |
| **`ConsultarUsuariosService`** | `ZentricApiPort` | Consulta paginada o filtrada de usuarios para la consola de administración. |

---

### 2.2 Catálogo de Productos
Administra el ciclo de vida comercial de los productos y sus variantes físicas obligatorias ([ADR-0003](../backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md)):

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`ConsultarCatalogoService`** | `ZentricApiPort` | Consulta el catálogo público (`GET /api/catalog/products`). Si incluye el parámetro `vendorId`, devuelve la vista de gestión privada del vendedor incluyendo productos en estado `Suspended`. |
| **`ConsultarProductoService`** | `ZentricApiPort` | Consulta la ficha técnica completa de un producto por su ID, desglosando dimensiones, peso y variantes (`VariantId`). |
| **`RegistrarProductoService`** | `ZentricApiPort` | Da de alta un nuevo producto que nace publicado (`Published`). Retorna tanto el `productId` como los `variantIds` generados para su posterior aprovisionamiento de stock en bodega. |
| **`PublicarProductoService`** | `ZentricApiPort` | Reactiva un producto previamente suspendido (`Suspended` $\rightarrow$ `Published`), haciéndolo elegible para compra. |
| **`SuspenderProductoService`** | `ZentricApiPort` | Suspende temporalmente un producto del catálogo (`Published` $\rightarrow$ `Suspended`). El carrito lo rechaza preventivamente. Acción restringida exclusivamente al Vendedor propietario. |

---

### 2.3 Inventario y Bodegas Físicas
Supervisa el ingreso y consulta atómica de existencias distribuidas:

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`IngresarExistenciasService`** | `ZentricApiPort` | Registra unidades de stock en una bodega específica (`AddStockCommand`). Valida cantidad positiva ($> 0$) en cliente; la verificación de capacidad volumétrica de la bodega reside en el servidor. |
| **`ConsultarInventarioService`** | `ZentricApiPort` | Consulta los contadores atómicos de existencias por variante (`VariantId`): `AvailableQuantity`, `ReservedQuantity`, `UsedQuantity` y `DamagedQuantity`. |
| **`ConsultarBodegasService`** | `ZentricApiPort` | Lista las bodegas activas. Aislamiento por rol: el vendedor solo visualiza sus bodegas asignadas; el administrador fiscaliza todas las bodegas de la plataforma. |
| **`RegistrarBodegaService`** | `ZentricApiPort` | Alta de bodega con capacidad volumétrica ($m^3$). Valida correspondencia entre tipo de bodega (`Marketplace` vs. `Vendor`) y propietario. |

---

### 2.4 Carrito de Compras y Checkout Atómico (15 Minutos)
Gestiona el flujo transaccional de compra y la retención temporal de existencias ([ADR-0001](../backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md) y [ADR-0005](../backendSDD/Adr/0005-modelado-carrito-compras.md)):

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`AbrirCarritoService`** | `ZentricApiPort` | Inicializa un nuevo carrito a nombre del comprador del token JWT (`POST /api/orders/cart`). |
| **`AgregarAlCarritoService`** | `ZentricApiPort` | Agrega una variante al carrito **congelando el precio unitario vigente** ([ADR-0020](../backendSDD/Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)). |
| **`ConsultarPedidoService`** | `ZentricApiPort` | Obtiene el detalle consolidado del pedido, líneas de compra (`OrderItem`), subtotales y estado actual. |
| **`RealizarCheckoutService`** | `ZentricApiPort` | Transiciona el pedido de `Cart` a `PendingPayment`, reservando preventivamente el stock en las bodegas con menor carga operativa e iniciando la **ventana de expiración de 15 minutos**. |
| **`PagarPedidoService`** | `ZentricApiPort` | Procesa la confirmación de pago (`PendingPayment` $\rightarrow$ `Paid`), consolidando la reserva y emitiendo el comprobante inmutable (`PaymentReceipt`). |

> **Invariante de Modificación:** Un pedido en estado `Paid`, `Cancelled` o `Resolved` es estrictamente inmutable; la interfaz inhabilita cualquier acción de edición de ítems.

---

### 2.5 Logística, Despacho y Contingencia por Quiebre
Controla la partición de despachos por vendedor y bodega física ([ADR-0004](../backendSDD/Adr/0004-estado-cancelacion-despacho.md) y [ADR-0022](../backendSDD/Adr/0022-pedido-resuelto-pasa-a-cancelled.md)):

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`CrearDespachoService`** | `ZentricApiPort` | Genera una orden logística de despacho (`FulfillmentOrder`) vinculada a un pedido pagado. Nace siempre en `PendingPack`. |
| **`EmpacarService`** | `ZentricApiPort` | Registra el empaque físico en bodega (`PendingPack` $\rightarrow$ `Packed`). Requisito ineludible antes del despacho. |
| **`DespacharService`** | `ZentricApiPort` | Asigna número de guía de transporte y marca salida física (`Packed` $\rightarrow$ `Dispatched`). |
| **`EntregarService`** | `ZentricApiPort` | Certifica la entrega efectiva al comprador en destino final (`Dispatched` $\rightarrow$ `Delivered`). **Acción reservada exclusivamente al Operador Logístico**. |
| **`CancelarPorQuiebreService`** | `ZentricApiPort` | Cancela un despacho ante quiebre físico por stock fantasma en bodega (`cancelGhostStock`), liberando las existencias restantes y reembolsando automáticamente al comprador ([ADR-0001](../backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md)). |

---

### 2.6 Devoluciones, Garantías y Reembolsos
Orquesta el ciclo de postventa con doble aprobación ([ADR-0018](../backendSDD/Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md) y [ADR-0019](../backendSDD/Adr/0019-auditoria-reembolsos-excepcionales.md)):

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`SolicitarDevolucionService`** | `ZentricApiPort` | Radica solicitud de garantía dentro del plazo legal. **Invariante: Exclusivo para productos físicos**; los productos digitales no admiten devolución (`ZENTRIC.md` Dominio 10). |
| **`InspeccionarDevolucionService`**| `ZentricApiPort` | Registra el dictamen técnico de inspección física en bodega realizado por el Operador Logístico. |
| **`AprobarDevolucionService`** | `ZentricApiPort` | Dictamen comercial emitido exclusivamente por el Vendedor propietario (`Approved`), reintegrando las unidades al stock usado de la bodega. |
| **`RechazarDevolucionService`** | `ZentricApiPort` | Rechazo comercial justificado por parte del Vendedor (`Rejected`). |
| **`ReembolsarDevolucionService`**| `ZentricApiPort` | Emisión y liquidación formal de la nota crédito y reembolso financiero. **Acción exclusiva del Administrador**, respaldada con registro inmutable de auditoría. |

---

### 2.7 Facturación Split
Emisión de los tres documentos contables independientes ([ADR-0023](../backendSDD/Adr/0023-split-de-pagos-documentos-no-transferencias.md)):

| Servicio | Puerto Consumido | Responsabilidad Técnica |
|---|---|---|
| **`EmitirFacturasService`** | `ZentricApiPort` | Genera la Factura Maestra (comprador), Detalle Zentric (comisión de plataforma) y Facturas de Vendedor (liquidación comercial). Exclusivo de Administrador sobre pedidos pagados. |
| **`ConsultarFacturasService`** | `ZentricApiPort` | Consulta de expedientes de facturación con aislamiento forzado en base de datos según el rol del llamante. |

---

## 3. Validación Defensiva con Esquemas Zod

Cada caso de uso que recibe entrada de formulario declara su esquema Zod correspondiente en `src/application/schemas/`. Los esquemas garantizan la no-negatividad de importes, límites de longitud y serialización estricta de enumeraciones por nombre ([ADR-0012](../backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)):

```typescript
import { z } from 'zod';

// application/schemas/catalogSchemas.ts
export const CreateProductSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(200),
  description: z.string().trim().max(2000, "La descripción no puede exceder 2000 caracteres"),
  type: z.enum(['Physical', 'Digital'], {
    errorMap: () => ({ message: "El tipo de producto debe ser Physical o Digital" }),
  }),
  basePrice: z.number().positive("El precio base debe ser un valor positivo"),
  currency: z.string().length(3, "La moneda debe ser un código ISO de 3 letras (ej. USD, COP)").default("USD"),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
```

```typescript
// application/schemas/inventorySchemas.ts
export const AddStockSchema = z.object({
  warehouseId: z.string().uuid("Debe seleccionar una bodega válida"),
  variantId: z.string().uuid("Debe seleccionar una variante válida"),
  quantity: z.number().int("La cantidad debe ser entera").positive("La cantidad a ingresar debe ser mayor a 0"),
  isUsed: z.boolean().default(false),
});

export type AddStockInput = z.infer<typeof AddStockSchema>;
```

---

## 4. Invariantes Absolutas de la Capa de Aplicación

1. **Aislamiento de Infraestructura:** Ningún servicio importa librerías HTTP (`fetch`, `axios`) ni manipula cabeceras de red.
2. **Cero Manipulación Arbitraria de Estados:** Los servicios nunca fuerzan transiciones de estado no avaladas por la máquina de estados del backend.
3. **Cero Persistencia Insegura:** Queda terminantemente prohibido almacenar tokens JWT en `localStorage` o `sessionStorage`. La sesión vive exclusivamente en la memoria RAM del navegador.
4. **Respeto a la Propiedad del Recurso:** Ningún servicio envía `userId` o `buyerId` en el cuerpo de peticiones cuando la identidad deba inferirse del token Bearer validado ([ADR-0013](../backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)).
