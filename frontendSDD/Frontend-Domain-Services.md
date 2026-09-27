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
  constructor(
    private readonly api: ZentricApiPort,
    private readonly session: SessionPort,
  ) {}

  async ejecutar(input: CreateUserInput): Promise<string> {
    // El servidor valida unicidad de documento y correo (Validación crítica).
    // El cliente NO replica esa regla: la pide y propaga el error.
    const id = await this.api.createUser(input);
    this.session.setUserId(id);
    return id;
  }
}
```

---

## 2. Servicios por módulo

### 2.1 Identidad y acceso

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `IniciarSesionService` | `getUser`, `SessionPort` | Resuelve el actor y guarda rol e id en la sesión. **Provisional**: no valida contraseña porque el backend no expone autenticación. |
| `CerrarSesionService` | `SessionPort` | Limpia la sesión y devuelve el estado inicial. |
| `RegistrarUsuarioService` | `createUser` | Alta de usuario delegando la unicidad al servidor. |
| `ConsultarUsuariosService` | `listUsers` | Listado para el panel del Administrador. |

### 2.2 Catálogo

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `ConsultarCatalogoService` | `listProducts` | Filtra por vendedor si se indica. |
| `ConsultarProductoService` | `getProduct` | Detalle con variantes. |
| `RegistrarProductoService` | `createProduct`, `getProduct` | Crea el producto y **relee** para obtener el `variantId` (riesgo FR-03). Devuelve ambos identificadores para mostrarlos. |
| `PublicarProductoService` | `publishProduct` | Publica un producto ya registrado. |

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

### 2.4 Carrito y pedidos

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `AbrirCarritoService` | `createCart` | Crea el carrito en estado `Carrito`. |
| `AgregarAlCarritoService` | `addCartItem` | Añade una línea con su `variantId`. |
| `ConsultarPedidoService` | `getOrder` | Detalle con líneas y total. |
| `RealizarCheckoutService` | `checkoutOrder` | Ejecuta el checkout y devuelve el estado devuelto por el servidor. |
| `PagarPedidoService` | `payOrder` | Transición a `Pagado`. **No cobra**: el backend no tiene pasarela. |

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
| `EmitirFacturasService` | `generateInvoices` | Genera Factura Maestra y Detalle Zentric. |
| `ConsultarFacturasService` | `getInvoicesByOrder` | Consulta de las facturas del pedido. |

### 2.6 Logística

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `CrearDespachoService` | `createFulfillment` | Crea el despacho de un pedido pagado. |
| `DespacharService` | `dispatchFulfillment` | Marca el despacho como enviado. |
| `CancelarPorQuiebreService` | `cancelGhostStock` | Cancelación por quiebre; **exige confirmación previa** en la UI. |

### 2.7 Devoluciones

| Servicio | Puerto que usa | Responsabilidad |
| --- | --- | --- |
| `SolicitarDevolucionService` | `requestReturn` | Alta de la solicitud. |
| `InspeccionarDevolucionService` | `inspectReturn` | Dictamen del Operador logístico. |
| `AprobarDevolucionService` | `approveReturn` | Aprobación y devolución al stock. |

```ts
// Prohibido devolver productos digitales (ADDENDUM Dominio 10).
export function admiteDevolucion(tipo: ProductType): boolean {
  return tipo === ProductType.Physical;
}
```

---

## 3. Servicios transversales

| Servicio | Responsabilidad |
| --- | --- |
| `VerificarEstadoServidorService` | Consulta `GET /health` y traduce a un indicador comprensible. |
| `ExportarService` | Descarga de listados en CSV; usa datos ya cargados, sin reglas propias. |

---

## 4. Prohibiciones

1. Ningún servicio importa React, `fetch` o la librería de alertas.
2. Ningún servicio inventa una transición de estado que la Ley no defina.
3. Ningún servicio reimplementa la reserva de inventario ni el cálculo de stock.
4. Ningún servicio guarda contraseñas ni secretos.
