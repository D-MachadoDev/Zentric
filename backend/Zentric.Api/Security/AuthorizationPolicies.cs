using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Zentric.Domain.Users.Enums;

namespace Zentric.Api.Security
{
    /// <summary>
    /// Matriz de autorizacion por rol a nivel de endpoint.
    /// Define los roles autorizados para cada politica segun la matriz de responsabilidades.
    /// Las politicas se registran en <c>Program.cs</c> y se aplican mediante <c>[Authorize]</c>.
    /// </summary>
    public static class AuthorizationPolicies
    {
        /// <summary>
        /// Acceso permitido a cualquier usuario autenticado en la plataforma.
        /// </summary>
        public const string AnyAuthenticatedUser = "Zentric.AnyAuthenticatedUser";

        /// <summary>
        /// Altas de usuarios restringidas al rol Administrador.
        /// El auto-registro de compradores se gestiona en la logica del endpoint correspondiente.
        /// </summary>
        public const string UserAdministration = "Zentric.UserAdministration";

        /// <summary>
        /// Creacion y administracion de bodegas asignada a Administrador y Vendedor.
        /// </summary>
        public const string WarehouseManagement = "Zentric.WarehouseManagement";

        /// <summary>
        /// Consulta de bodegas para Administrador, Vendedor y Operador Logistico.
        /// </summary>
        public const string WarehouseRead = "Zentric.WarehouseRead";

        /// <summary>
        /// Alta y publicacion de productos del catalogo a cargo del Vendedor.
        /// </summary>
        public const string ProductManagement = "Zentric.ProductManagement";

        /// <summary>
        /// Carga y administracion de existencias en bodega por Vendedor, Operador Logistico y Administrador.
        /// </summary>
        public const string InventoryManagement = "Zentric.InventoryManagement";

        /// <summary>
        /// Consulta de existencias de una variante para roles operativos y de supervision.
        /// </summary>
        public const string InventoryRead = "Zentric.InventoryRead";

        /// <summary>
        /// Ajuste de existencias por conteo fisico asignado a Administrador y Supervisor para auditoria.
        /// </summary>
        public const string InventoryAdjust = "Zentric.InventoryAdjust";

        /// <summary>
        /// Consulta de pedidos para los participantes de la compra y roles de supervision.
        /// </summary>
        public const string OrderRead = "Zentric.OrderRead";

        /// <summary>
        /// Preparacion, empaque y despacho de envios a cargo de Vendedor y Operador Logistico.
        /// </summary>
        public const string FulfillmentOperate = "Zentric.FulfillmentOperate";

        /// <summary>
        /// Confirmacion de entrega final del pedido reservada al Operador Logistico.
        /// </summary>
        public const string FulfillmentDeliver = "Zentric.FulfillmentDeliver";

        /// <summary>
        /// Cancelacion de despacho por quiebre de stock a cargo de Vendedor u Operador Logistico.
        /// </summary>
        public const string FulfillmentCancelByQuiebre = "Zentric.FulfillmentCancelByQuiebre";

        /// <summary>
        /// Consulta de estado de despacho y guia de transporte.
        /// </summary>
        public const string FulfillmentRead = "Zentric.FulfillmentRead";

        /// <summary>
        /// Radicacion de solicitudes de devolucion reservada al Comprador.
        /// </summary>
        public const string ReturnRequest = "Zentric.ReturnRequest";

        /// <summary>
        /// Inspeccion fisica de productos devueltos en bodega por el Operador Logistico.
        /// </summary>
        public const string ReturnInspect = "Zentric.ReturnInspect";

        /// <summary>
        /// Aprobacion o rechazo comercial de devoluciones a cargo del Vendedor titular.
        /// </summary>
        public const string ReturnApprove = "Zentric.ReturnApprove";

        /// <summary>
        /// Emision de reembolsos monetarios asignada exclusivamente al Administrador por separacion de poderes.
        /// </summary>
        public const string ReturnRefund = "Zentric.ReturnRefund";

        /// <summary>
        /// Consulta de solicitudes de devolucion para participantes y roles de auditoria.
        /// </summary>
        public const string ReturnRead = "Zentric.ReturnRead";

        /// <summary>
        /// Generacion de facturacion de pedidos asignada al Administrador.
        /// </summary>
        public const string BillingGenerate = "Zentric.BillingGenerate";

        /// <summary>
        /// Consulta de facturas para los involucrados comerciales y supervision.
        /// </summary>
        public const string BillingRead = "Zentric.BillingRead";

        /// <summary>
        /// Flujo de carrito, checkout y pago reservado al Comprador.
        /// </summary>
        public const string Checkout = "Zentric.Checkout";

        /// <summary>
        /// Nombre del rol tal como viaja en la claim de identidad del token.
        /// </summary>
        private static string Role(UserRole role) => role.ToString();

        /// <summary>
        /// Matriz de autorizacion: mapea cada politica con la lista de roles autorizados.
        /// </summary>
        public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> RolesByPolicy =
            new ReadOnlyDictionary<string, IReadOnlyList<string>>(
                new Dictionary<string, IReadOnlyList<string>>
                {
                    [AnyAuthenticatedUser] = Array.Empty<string>(),

                    [UserAdministration] = new[] { Role(UserRole.Administrator) },

                    [WarehouseManagement] = new[] { Role(UserRole.Administrator), Role(UserRole.Seller) },

                    [WarehouseRead] = new[]
                    {
                        Role(UserRole.Administrator),
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                    },

                    [ProductManagement] = new[] { Role(UserRole.Seller) },

                    // Administrador gestiona bodegas generales; el alcance por bodega se valida a nivel de dominio.
                    [InventoryManagement] = new[]
                    {
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                        Role(UserRole.Administrator),
                    },

                    [InventoryRead] = new[]
                    {
                        Role(UserRole.Seller),
                        Role(UserRole.LogisticsOperator),
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },

                    [InventoryAdjust] = new[]
                    {
                        Role(UserRole.Administrator),
                        Role(UserRole.Supervisor),
                    },

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

                    // Confirmacion de entrega reservada al operador logistico para evitar auto-entrega.
                    [FulfillmentDeliver] = new[] { Role(UserRole.LogisticsOperator) },

                    [FulfillmentCancelByQuiebre] = new[] { Role(UserRole.Seller), Role(UserRole.LogisticsOperator) },

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

                    // Reembolso monetario exclusivo de Administrador por separacion de funciones frente al Vendedor.
                    [ReturnRefund] = new[] { Role(UserRole.Administrator) },

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
