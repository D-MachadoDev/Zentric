using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Zentric.Domain.Users.Enums;

namespace Zentric.Api.Security
{
    /// <summary>
    /// Matriz de autorizacion por rol (Q-21, cierra RG-03 a nivel de endpoint).
    ///
    /// Que es este archivo. Es el UNICO punto de verdad de quien puede llamar a que. No es
    /// detalle tecnico de ASP.NET: es la Matriz de Responsabilidades de <c>ZENTRIC.md</c>
    /// seccion 12, mas el ADDENDUM, escrita una sola vez. De aqui sale el registro de
    /// politicas de <c>Program.cs</c>, la decoracion de los controladores y la matriz que
    /// asertan <c>EndpointAuthorizationMatrixTests</c>. Cambiar una regla aqui cambia las tres.
    ///
    /// Como se lee cada regla:
    /// [CONFIRMADO] la Ley o el ADDENDUM lo dicen textual.
    /// [INFERIDO]   la Ley no lo explicita; se deduce de una definicion de rol de la seccion 5.
    /// [ABIERTO Q-xx] hace falta dictamen del Owner; mientras tanto la politica es fail-closed
    ///                (el conjunto mas chico que la Ley sostiene).
    ///
    /// Dictamen del Owner que rige aqui (2026-09-29, opcion A de Q-21): las escrituras van
    /// exactas como las fija la Ley, y el Administrador y el Supervisor reciben SOLO lectura de
    /// pedidos, despachos, devoluciones y facturas. La propiedad por recurso (que un comprador
    /// vea solo SUS pedidos) no se cubre aqui: sigue abierta como Q-21b.
    ///
    /// RG-03 dice "ningun participante podra administrar informacion fuera de su rol", asi que
    /// lo que no esta en la matriz queda denegado: la politica de reserva de <c>Program.cs</c>
    /// exige token en todo endpoint, y una politica denegada responde 403.
    /// </summary>
    public static class AuthorizationPolicies
    {
        /// <summary>
        /// Basta estar autenticado. No habilita privilegio alguno: es la traduccion de RG-01
        /// ("toda operacion debe ejecutarse por un usuario autenticado") para los recursos que
        /// la Ley describe sin restringirlos a un actor.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 6.1 paso 4: "Publicacion: los productos se hacen
        /// visibles en el catalogo publico". Publico en el sentido de visible para todos los
        /// participantes, no anonimo: RG-01 sigue exigiendo token.
        /// </summary>
        public const string AnyAuthenticatedUser = "Zentric.AnyAuthenticatedUser";

        /// <summary>
        /// Altas de usuarios de cualquier rol.
        ///
        /// [CONFIRMADO] ZENTRIC.md Dominio 3: "los vendedores no pueden auto-registrarse; son
        /// incorporados por el Administrador", y la seccion 12 asigna "Registro Vendedores" solo
        /// al Admin. El auto-registro de Compradores es la unica excepcion y se resuelve en
        /// <c>UsersController.CreateUser</c>, no aqui, porque la condicion es el rol pedido y no
        /// el rol del llamante.
        /// </summary>
        public const string UserAdministration = "Zentric.UserAdministration";

        /// <summary>
        /// Altas de bodega.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 5: "Administrador: responsable de la administracion
        /// de vendedores y bodegas", y seccion 6.1 paso 1: "El Administrador registra al
        /// vendedor y su primera bodega".
        /// </summary>
        public const string WarehouseManagement = "Zentric.WarehouseManagement";

        /// <summary>
        /// Consulta de bodegas.
        ///
        /// [INFERIDO] La seccion 12 no tiene fila para bodegas. Se habilita al Admin (seccion 5
        /// lo declara responsable de las bodegas), al Vendedor (Dominio 4 distingue "bodegas de
        /// Vendedores") y al Operador Logistico (seccion 5: "encargado de la operacion fisica de
        /// bodegas y despachos"). El Comprador queda fuera: la Ley no le da ninguna funcion
        /// sobre la red fisica.
        /// </summary>
        public const string WarehouseRead = "Zentric.WarehouseRead";

        /// <summary>
        /// Alta y publicacion de productos del catalogo.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 12: "Registro Productos" tiene palomita
        /// exclusivamente en la columna del Vendedor. El Administrador NO figura, y la seccion 5
        /// no le da productos entre sus responsabilidades.
        /// </summary>
        public const string ProductManagement = "Zentric.ProductManagement";

        /// <summary>
        /// Carga de existencias en bodega.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 12: "Administracion Inventario: Vendedor y Operador
        /// Logistico".
        /// </summary>
        public const string InventoryManagement = "Zentric.InventoryManagement";

        /// <summary>
        /// Consulta de existencias de una variante.
        ///
        /// [INFERIDO] Espejo de la escritura anterior: quien administra el inventario lo lee.
        /// Admin y Supervisor quedan fuera porque el dictamen del Owner (opcion A) les da lectura
        /// de pedidos, despachos, devoluciones y facturas, y el inventario no esta en esa lista
        /// ni en la fila de inventario de la seccion 12. El Comprador tampoco: la disponibilidad
        /// la obtiene al validar el item contra el stock (Validaciones Criticas, seccion 11).
        /// </summary>
        public const string InventoryRead = "Zentric.InventoryRead";

        /// <summary>
        /// Consulta del estado de un pedido.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 12: "Gestion de Pedidos: Comprador, Vendedor,
        /// Operador Logistico". El Admin y el Supervisor entran por lectura: dictamen del Owner
        /// de 2026-09-29 sobre el hueco de la Matriz (deja en blanco la columna del Admin) y la
        /// definicion de Supervisor en la seccion 5: "perfil de consulta y seguimiento
        /// operativo".
        /// </summary>
        public const string OrderRead = "Zentric.OrderRead";

        /// <summary>
        /// Creacion de la orden de preparacion y despacho fisico.
        ///
        /// [CONFIRMADO] ADDENDUM Dominio 8: el fulfillment "deriva del pedido del cliente para
        /// organizar la entrega fisica por parte de cada vendedor", y sus estados (Pendiente de
        /// Empaque, Empacado, Despachado) son operacion de bodega. Vendedor y Operador Logistico
        /// son los dos actores de "Gestion de Pedidos" que tocan la entrega fisica.
        /// </summary>
        public const string FulfillmentOperate = "Zentric.FulfillmentOperate";

        /// <summary>
        /// Cancelacion por quiebre de stock fantasma.
        ///
        /// [CONFIRMADO] ADDENDUM Dominio 8 estado 5: "Cancelado por Quiebre: cancelacion
        /// unilateral DEL VENDEDOR por falta fisica de stock".
        ///
        /// [ABIERTO Q-21c] En la practica el faltante lo detecta quien esta en la bodega
        /// (Operador Logistico), pero la Ley nombra solo al Vendedor. Sin dictamen el conjunto
        /// queda en Vendedor, que es la lectura mas cerrada.
        /// </summary>
        public const string FulfillmentCancelByQuiebre = "Zentric.FulfillmentCancelByQuiebre";

        /// <summary>
        /// Consulta del despacho y su numero de guia.
        ///
        /// [CONFIRMADO] Mismo fundamento que <see cref="OrderRead"/>: el numero de guia
        /// (<c>TrackingNumber</c>) es la trazabilidad de "Gestion de Pedidos" y la necesita el
        /// comprador que espera la entrega.
        /// </summary>
        public const string FulfillmentRead = "Zentric.FulfillmentRead";

        /// <summary>
        /// Radicacion de una solicitud de devolucion.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 12: "Gestion Reembolsos" con palomita en Comprador;
        /// el ADDENDUM Dominio 10 abre el flujo con la solicitud.
        /// </summary>
        public const string ReturnRequest = "Zentric.ReturnRequest";

        /// <summary>
        /// Dictamen de la inspeccion fisica en bodega.
        ///
        /// [CONFIRMADO] ADDENDUM Dominio 10, flujo fisico: "El operador logistico inspecciona
        /// que el producto este en buen estado".
        /// </summary>
        public const string ReturnInspect = "Zentric.ReturnInspect";

        /// <summary>
        /// Aprobacion comercial de la devolucion.
        ///
        /// [CONFIRMADO] ADDENDUM Dominio 10: la inspeccion favorable "requiere la aprobacion del
        /// Vendedor". El Dominio ya lo modela asi: <c>ReturnRequest.ApproveByVendor</c>.
        ///
        /// Contra la Matriz: la seccion 12 pone la palomita de "Gestion Reembolsos" en el Admin.
        /// ADR-0006 resuelve la colision a favor del ADDENDUM, asi que el Admin NO aprueba. Se
        /// corrijo ademas <c>frontendSDD/Frontend-Role-Modules.md</c>, que heredaba la lectura
        /// equivocada de la Matriz.
        /// </summary>
        public const string ReturnApprove = "Zentric.ReturnApprove";

        /// <summary>
        /// Consulta del estado de una devolucion.
        ///
        /// [CONFIRMADO] Participan los tres actores del flujo: Comprador que la solicita,
        /// Operador que la inspecciona, Vendedor que la aprueba. El Admin figura en "Gestion
        /// Reembolsos" de la seccion 12 y conserva ahi su lectura. El Supervisor entra
        /// [INFERIDO] por "consulta y seguimiento operativo" (seccion 5).
        /// </summary>
        public const string ReturnRead = "Zentric.ReturnRead";

        /// <summary>
        /// Emision de las facturas de un pedido.
        ///
        /// [ABIERTO Q-21d] ADDENDUM Dominio 9 describe los tres documentos (Factura Maestra,
        /// Detalle Zentric, Factura de Vendedor) pero no dice quien los emite, y la seccion 12
        /// no tiene fila de facturacion. Fail-closed en Administrador: es el unico actor de la
        /// seccion 5 que representa a la plataforma, y el Detalle Zentric es documento de la
        /// plataforma.
        /// </summary>
        public const string BillingGenerate = "Zentric.BillingGenerate";

        /// <summary>
        /// Consulta de las facturas emitidas de un pedido.
        ///
        /// [CONFIRMADO] ADDENDUM Dominio 9 asigna un destinatario a cada documento: "Factura
        /// Maestra: entregada al cliente" (Comprador) y "Factura de Vendedor: monto que le
        /// corresponde al Vendedor". Admin y Supervisor por el dictamen de lectura operativa. El
        /// Operador Logistico queda fuera: la facturacion no es operacion fisica.
        /// [ABIERTO Q-21b] Hoy cualquier Comprador puede leer la factura de cualquier
        /// <c>orderId</c>; la restriccion de propiedad va en esa tanda, no en esta.
        /// </summary>
        public const string BillingRead = "Zentric.BillingRead";

        /// <summary>
        /// Carrito, checkout y pago.
        ///
        /// [CONFIRMADO] ZENTRIC.md seccion 5: "Comprador: persona que adquiere productos
        /// publicados", y seccion 6.1 paso 5: "El comprador selecciona productos mediante el
        /// carrito y confirma el pedido".
        /// </summary>
        public const string Checkout = "Zentric.Checkout";

        /// <summary>
        /// Nombre de los roles tal como viajan en la claim <c>role</c> del token. Se deriva del
        /// enum <see cref="UserRole"/> en lugar de escribir literales: si el enum cambia, la
        /// matriz se rompe en tiempo de compilacion y no en produccion.
        /// </summary>
        private static string Role(UserRole role) => role.ToString();

        /// <summary>
        /// La matriz completa: politica =&gt; roles admitidos. La recorre el registro de
        /// <c>Program.cs</c> y la aserta <c>EndpointAuthorizationMatrixTests</c>. Una politica
        /// con lista vacia solo exige identidad.
        /// </summary>
        public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> RolesByPolicy =
            new ReadOnlyDictionary<string, IReadOnlyList<string>>(
                new Dictionary<string, IReadOnlyList<string>>
                {
                    [AnyAuthenticatedUser] = Array.Empty<string>(),

                    [UserAdministration] = new[] { Role(UserRole.Administrator) },

                    [WarehouseManagement] = new[] { Role(UserRole.Administrator) },

                    [WarehouseRead] = new[]
                    {
                        Role(UserRole.Administrator),
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                    },

                    [ProductManagement] = new[] { Role(UserRole.Seller) },

                    [InventoryManagement] = new[] { Role(UserRole.Seller), Role(UserRole.LogisticsOperator) },

                    [InventoryRead] = new[] { Role(UserRole.Seller), Role(UserRole.LogisticsOperator) },

                    [Checkout] = new[] { Role(UserRole.Buyer) },

                    [OrderRead] = new[]
                    {
                        Role(UserRole.Buyer),
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },

                    [FulfillmentOperate] = new[] { Role(UserRole.Seller), Role(UserRole.LogisticsOperator) },

                    [FulfillmentCancelByQuiebre] = new[] { Role(UserRole.Seller) },

                    [FulfillmentRead] = new[]
                    {
                        Role(UserRole.Buyer),
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },

                    [ReturnRequest] = new[] { Role(UserRole.Buyer) },

                    [ReturnInspect] = new[] { Role(UserRole.LogisticsOperator) },

                    [ReturnApprove] = new[] { Role(UserRole.Seller) },

                    [ReturnRead] = new[]
                    {
                        Role(UserRole.Buyer),
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },

                    [BillingGenerate] = new[] { Role(UserRole.Administrator) },

                    [BillingRead] = new[]
                    {
                        Role(UserRole.Buyer),
                        Role(UserRole.Seller),
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },
                });
    }
}
