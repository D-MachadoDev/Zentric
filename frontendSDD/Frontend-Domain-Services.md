# Frontend-Domain-Services

> Casos de uso del cliente. Orquestan puertos del dominio; no conocen HTTP,
> React ni diálogos.

---

## 1. Principio

Cada servicio expone una intención de negocio en el vocabulario de la Ley. Si un
servicio necesita una regla que la Ley no define, se detiene y se registra como
`BLOCKED` en lugar de inventarla.

```ts
// application/services/RegistrarUsuarioService.ts
export class RegistrarUsuarioService {
  constructor(private readonly api: ZentricApiPort) {}

  async ejecutar(input: CreateUserInput): Promise<string> {
    // El servidor valida unicidad de documento y correo (Validación crítica).
    // El cliente NO replica esa regla: la pide y propaga el error.
    //
    // La sesión NO se toca: el Guid devuelto pertenece al usuario CREADO, no
    // al llamante. Sobrescribir el `userId` de la sesión con él dejaría al
    // Administrador que da de alta un Vendedor creyéndose ese Vendedor.
    return this.api.createUser(input);
  }
}
```

---

## 2. Servicios por módulo

### 2.1 Identidad y acceso

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `IniciarSesionService` | `SessionPort`, `ZentricApiPort` | Llama a `POST /api/auth/login`, guarda el **access token en memoria** (Q15-B) y toma `role`/`userId` de la respuesta. |
| `RestaurarSesionService` | `SessionPort`, `ZentricApiPort` | Al abrir la app, si hay token **en memoria**, llama a `GET /api/auth/me` para reconstruir la identidad. **No hay refresh**: sin token, no restaura. |
| `CerrarSesionService` | `SessionPort` | Limpia la sesión (memoria) y devuelve el estado inicial. |
| `RegistrarUsuarioService` | `createUser` | Alta de usuario delegando la unicidad al servidor. **No toca la sesión**: el `Guid` devuelto es del usuario creado, no del llamante. |
| `ConsultarUsuariosService` | `listUsers` | Listado para el panel del Administrador. |

### 2.2 Catálogo

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `ConsultarCatalogoService` | `listProducts` | Filtra por vendedor si se indica. |
| `ConsultarProductoService` | `getProduct` | Detalle con variantes. |
| `RegistrarProductoService` | `createProduct`, `getProduct` | Crea el producto y **relee** para obtener el `variantId` (riesgo FR-03). Devuelve ambos identificadores para mostrarlos. |
| `PublicarProductoService` | `publishProduct` | Publica un producto ya registrado (`Suspended` → `Published`). |
| `SuspenderProductoService` | `suspendProduct` | Suspende: el producto sale del catálogo comercial y el carrito lo rechaza (Q-27). **Sólo Vendedor** (política `ProductManagement`). |

```ts
// El identificador útil para inventario y carrito es el de la VARIANTE.
export interface ProductoRegistrado {
  productId: string;
  variantId: string | null;
  sku: string | null;
}
```

### 2.3 Inventario

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `IngresarExistenciasService` | `addStock` | Alta de existencias. Valida **cantidad > 0** en el cliente como *feedback inmediato* (INV-01); la autoridad sigue siendo el servidor. |
| `ConsultarInventarioService` | `listInventoryByVariant` | Existencias de una variante, separando disponible y reservado. |

**Composición del alta (F4c).** `/inventario` ofrece la bodega en un `Select`
poblado con `ConsultarBodegasService` —el servidor devuelve sólo las del
Vendedor (`WarehouseRead`)— y, tras ingresar, relee con
`ConsultarInventarioService`: el stock disponible y el reservado se **muestran**,
nunca se recalculan en el cliente.

### 2.4 Carrito y pedidos

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `AbrirCarritoService` | `createCart` | Crea el carrito en estado `Carrito`. |
| `AgregarAlCarritoService` | `addCartItem` | Añade una línea con su `variantId`. |
| `ConsultarPedidoService` | `getOrder` | Detalle con líneas y total. |
| `RealizarCheckoutService` | `checkoutOrder` | Ejecuta el checkout (`Cart` → `PendingPayment`, reserva stock). Responde `void`: el servidor devuelve `200 OK` sin cuerpo, así que el estado nuevo se relee con `ConsultarPedidoService`. |
| `PagarPedidoService` | `payOrder` | Transición a `Pagado`. Responde `void` por el mismo motivo. **No cobra**: el backend no tiene pasarela. |

**Regla de presentación (inmutable):**

```ts
// Un pedido Pagado o posterior no admite edición (Validación crítica de la Ley).
export function esPedidoModificable(estado: OrderStatus): boolean {
  return estado === OrderStatus.Cart || estado === OrderStatus.PendingPayment;
}
```

Esta función es de **presentación**, no una regla de negocio nueva: refleja la
restricción ya escrita en la Ley y en el backend.

### 2.5 Facturación

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `EmitirFacturasService` | `generateInvoices` | Emite los tres documentos del split (Q-18): Factura Maestra para el comprador, Detalle Zentric con la comisión y una factura por vendedor. **Sólo Administrador**; el backend rechaza con `400` un pedido no pagado o ya facturado. |
| `ConsultarFacturasService` | `getInvoicesByOrder` | Consulta de las facturas del pedido. |

### 2.6 Logística

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `CrearDespachoService` | `createFulfillment` | Crea el despacho de un pedido pagado. **Nace siempre en `PendingPack`.** |
| `EmpacarService` | `packFulfillment` | `PendingPack` → `Packed`. Requisito previo de todo despacho (`backendSDD/Domain/07-lifecycle.md`: "Dispatch sin haber empaquetado lanza excepción"). |
| `DespacharService` | `dispatchFulfillment` | `Packed` → `Dispatched`. Responde `void`. |
| `EntregarService` | `deliverFulfillment` | `Dispatched` → `Delivered`. **Sólo el Operador Logístico** cierra la entrega (Q-23): es un acto físico en bodega. |
| `CancelarPorQuiebreService` | `cancelGhostStock` | Cancelación por quiebre; **exige confirmación previa** en la UI. Sólo cabe desde `PendingPack` o `Packed`: un despacho enviado no se cancela. |

### 2.7 Devoluciones

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `SolicitarDevolucionService` | `requestReturn` | Alta de la solicitud. |
| `InspeccionarDevolucionService` | `inspectReturn` | Dictamen del Operador logístico. |
| `AprobarDevolucionService` | `approveReturn` | Aprobación y devolución al stock. **Sólo Vendedor** (política `ReturnApprove`): la UI no ofrece esta acción a otro rol. |
| `ConsultarDevolucionesService` | `listReturns` | Bandeja de devoluciones visible para el rol llamante; el reparto por rol lo hace el servidor. |
| `ReembolsarDevolucionService` | `refundReturn` | Emisión del reembolso. **Sólo Administrador** (Q-24) y sólo sobre una devolución **ya aprobada**; exige confirmación en la UI porque mueve dinero. |

```ts
// Prohibido devolver productos digitales (ADDENDUM Dominio 10).
export function admiteDevolucion(tipo: ProductType): boolean {
  return tipo === ProductType.Physical;
}
```

### 2.8 Bodegas

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `ConsultarBodegasService` | `listWarehouses` | Listado de bodegas visibles; el Vendedor sólo ve las suyas (lo decide el servidor). |
| `RegistrarBodegaService` | `createWarehouse` | Alta de bodega. El cliente ofrece *feedback* inmediato de la correspondencia `type`↔`vendorId` que el servidor valida (`CreateWarehouseCommandValidator`): una bodega `Marketplace` no tiene dueño y una `Vendor` sí. |

---

## 3. Servicios transversales

| Servicio | Responsabilidad |
| --- | --- |
| `VerificarEstadoServidorService` | Consulta `GET /health` y traduce a un indicador comprensible. |
| `ExportarService` | Descarga de listados en CSV; usa datos ya cargados, sin reglas propias. |

---

## 4. Formularios (Q13 — React Hook Form + Zod)

Cada caso de uso que acepta un formulario declara **un esquema Zod** que es la
única fuente de validación del cliente. El esquema se deriva del contrato real
del backend, no al revés:

```ts
// application/schemas/registrarProducto.ts
export const RegistrarProductoSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  type: z.enum(['Physical', 'Digital']),   // Q22/ADR-0012: enum por nombre
  price: z.number().positive(),
});
export type RegistrarProductoInput = z.input<typeof RegistrarProductoSchema>;
```

- **Feedback inmediato** en el cliente; la **autoridad** sigue siendo el servidor.
- Un `400` del backend se mapea a los campos del formulario (los `errors` de
  Problem Details tienen ruta JSON `$.campo`), conservando lo escrito.
- Los mensajes de error siguen la voz de `Frontend-Design-System.md` §8.

---

## 5. Prohibiciones

1. Ningún servicio importa React, `fetch` o la librería de alertas.
2. Ningún servicio inventa una transición de estado que la Ley no defina.
3. Ningún servicio reimplementa la reserva de inventario ni el cálculo de stock.
4. Ningún servicio guarda contraseñas ni secretos.
5. Ningún servicio escribe en `localStorage`; el access token vive sólo en memoria (Q12).
