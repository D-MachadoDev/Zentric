using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Presentation
{
    /// <summary>
    /// Matriz de autorizacion por rol (Q-21). Cierra RG-03: "ningun participante podra
    /// administrar informacion fuera de su rol" (ZENTRIC.md seccion 10).
    ///
    /// Que comprueba esta clase y por que existe. La autorizacion por rol no se puede validar
    /// con un mock del pipeline de ASP.NET: lo que se rompe en la vida real es que alguien
    /// agregue un endpoint nuevo y se olvide de ponerle politica, o le ponga una mas abierta de
    /// lo que la Ley manda. Estos tests reflejan sobre los controladores reales y comparan lo
    /// declarado contra la matriz dictada por el Owner el 2026-09-29 (opcion A), asi que un
    /// endpoint sin politica o con una politica equivocada rompe la compilacion de verde a rojo
    /// sin necesidad de levantar el servidor.
    ///
    /// Cada nombre de test se lee como el criterio de aceptacion de la especificacion:
    /// backendSDD/Presentation/02-authorization.md.
    /// </summary>
    public sealed class EndpointAuthorizationMatrixTests
    {
        /// <summary>Valor con el que se marca el endpoint que no exige identidad.</summary>
        private const string Anonymous = "(anonimo)";

        /// <summary>Valor que aparece si una accion no declaro ninguna politica.</summary>
        private const string NoPolicy = "(sin politica)";

        private static readonly System.Reflection.Assembly ApiAssembly = typeof(AuthorizationPolicies).Assembly;

        /// <summary>
        /// La matriz dictada, endpoint por endpoint. Es la traduccion de la Matriz de
        /// Responsabilidades (ZENTRIC.md seccion 12) mas el ADDENDUM, con la preferencia del
        /// ADDENDUM que fija ADR-0006.
        /// </summary>
        private static readonly IReadOnlyDictionary<string, string> ExpectedPolicyByEndpoint =
            new Dictionary<string, string>
            {
                // Autenticacion. Login es anonimo porque no se puede pedir un token antes de
                // tener cuenta; /me sirve la identidad del propio llamante (RG-01).
                ["AuthController.Login"] = Anonymous,
                ["AuthController.Me"] = AuthorizationPolicies.AnyAuthenticatedUser,

                // 1. Usuarios. El alta es anonima solo para Buyer; el resto se niega dentro del
                // controlador porque la condicion es el rol pedido, no el rol del llamante
                // (ZENTRIC.md Dominio 3).
                ["UsersController.CreateUser"] = Anonymous,
                ["UsersController.GetUsers"] = AuthorizationPolicies.UserAdministration,
                ["UsersController.GetUserById"] = AuthorizationPolicies.UserAdministration,

                // 2. Bodegas. Alta solo del Admin (seccion 5 y 6.1 paso 1).
                ["WarehousesController.CreateWarehouse"] = AuthorizationPolicies.WarehouseManagement,
                ["WarehousesController.GetWarehouses"] = AuthorizationPolicies.WarehouseRead,
                ["WarehousesController.GetWarehouseById"] = AuthorizationPolicies.WarehouseRead,

                // 3. Catalogo. Alta solo del Vendedor (seccion 12: "Registro Productos").
                ["CatalogController.CreateProduct"] = AuthorizationPolicies.ProductManagement,
                ["CatalogController.PublishProduct"] = AuthorizationPolicies.ProductManagement,
                ["CatalogController.GetProducts"] = AuthorizationPolicies.AnyAuthenticatedUser,
                ["CatalogController.GetProductsPaged"] = AuthorizationPolicies.AnyAuthenticatedUser,
                ["CatalogController.GetProductById"] = AuthorizationPolicies.AnyAuthenticatedUser,

                // 4. Inventario (seccion 12: "Administracion Inventario").
                ["InventoriesController.AddStock"] = AuthorizationPolicies.InventoryManagement,
                ["InventoriesController.GetInventoryByVariant"] = AuthorizationPolicies.InventoryRead,

                // 5. Pedidos. Escribirlos es del Comprador (seccion 6.1 paso 5).
                ["OrdersController.CreateCart"] = AuthorizationPolicies.Checkout,
                ["OrdersController.AddOrderItem"] = AuthorizationPolicies.Checkout,
                ["OrdersController.Checkout"] = AuthorizationPolicies.Checkout,
                ["OrdersController.Pay"] = AuthorizationPolicies.Checkout,
                ["OrdersController.GetOrderById"] = AuthorizationPolicies.OrderRead,

                // 6. Logistica (ADDENDUM Dominio 8).
                ["LogisticsController.CreateFulfillment"] = AuthorizationPolicies.FulfillmentOperate,
                ["LogisticsController.PackFulfillment"] = AuthorizationPolicies.FulfillmentOperate,
                ["LogisticsController.DispatchFulfillment"] = AuthorizationPolicies.FulfillmentOperate,
                ["LogisticsController.DeliverFulfillment"] = AuthorizationPolicies.FulfillmentDeliver,
                ["LogisticsController.CancelGhostStock"] = AuthorizationPolicies.FulfillmentCancelByQuiebre,
                ["LogisticsController.GetFulfillmentById"] = AuthorizationPolicies.FulfillmentRead,

                // 7. Devoluciones (ADDENDUM Dominio 10).
                ["ReturnsController.RequestReturn"] = AuthorizationPolicies.ReturnRequest,
                ["ReturnsController.InspectReturn"] = AuthorizationPolicies.ReturnInspect,
                ["ReturnsController.ApproveReturn"] = AuthorizationPolicies.ReturnApprove,
                ["ReturnsController.RejectReturn"] = AuthorizationPolicies.ReturnApprove,
                ["ReturnsController.RefundReturn"] = AuthorizationPolicies.ReturnRefund,
                ["ReturnsController.GetReturnById"] = AuthorizationPolicies.ReturnRead,

                // 8. Facturacion (ADDENDUM Dominio 9).
                ["BillingController.GenerateInvoices"] = AuthorizationPolicies.BillingGenerate,
                ["BillingController.GetInvoicesByOrder"] = AuthorizationPolicies.BillingRead,
            };

        /// <summary>
        /// Criterio: todo endpoint de la API declara una politica de la matriz, o declara
        /// explicitamente que es anonimo. Ninguno queda a merced de la politica de reserva.
        /// </summary>
        [Fact]
        public void EndpointMatrix_AllActions_DeclarePolicyOrAnonymous()
        {
            var undeclared = ActionMethods()
                .Where(method => EffectivePolicyOf(method) == NoPolicy)
                .Select(EndpointOf)
                .ToList();

            Assert.Empty(undeclared);
        }

        /// <summary>
        /// Criterio: cada endpoint responde a la politica que dicta la Ley, y no aparece ningun
        /// endpoint que no este registrado en la matriz dictada.
        /// </summary>
        [Fact]
        public void EndpointMatrix_EveryEndpoint_MatchesTheDictatedPolicy()
        {
            var declared = ActionMethods().ToDictionary(EndpointOf, EffectivePolicyOf);

            var newEndpoints = declared
                .Keys
                .Where(key => !ExpectedPolicyByEndpoint.ContainsKey(key))
                .OrderBy(key => key, StringComparer.Ordinal)
                .ToList();

            Assert.True(newEndpoints.Count == 0, "Endpoints nuevos sin registrar en la matriz: " + string.Join(", ", newEndpoints));

            foreach (KeyValuePair<string, string> expected in ExpectedPolicyByEndpoint)
            {
                Assert.True(declared.ContainsKey(expected.Key), "Falta el endpoint de la matriz: " + expected.Key);
                Assert.Equal(expected.Value, declared[expected.Key]);
            }
        }

        /// <summary>
        /// Criterio (ADDENDUM Dominio 10 + ADR-0006): la aprobacion de una devolucion es del
        /// Vendedor. El Administrador NO aprueba, aunque la Matriz de Responsabilidades de la
        /// seccion 12 lo dibujara asi: el ADDENDUM tiene la ultima palabra. El Dominio ya lo
        /// modela con ese nombre, en <c>ReturnRequest.ApproveByVendor</c>.
        /// </summary>
        [Fact]
        public void ApproveReturn_LawMatrix_GrantsSellerAndNeverAdministrator()
        {
            IReadOnlyList<string> allowed = AuthorizationPolicies.RolesByPolicy[AuthorizationPolicies.ReturnApprove];

            Assert.Equal(new[] { UserRole.Seller.ToString() }, allowed);
            Assert.DoesNotContain(UserRole.Administrator.ToString(), allowed);
        }

        /// <summary>
        /// Criterio (ZENTRIC.md seccion 12): el inventario lo administran el Vendedor y el
        /// Operador Logistico. El Administrador no figura en esa fila de la Matriz, y RG-03 le
        /// impide administrar informacion fuera de su rol.
        /// </summary>
        [Fact]
        public void InventoryManagement_LawMatrix_KeepsAdministratorOut()
        {
            IReadOnlyList<string> allowed = AuthorizationPolicies.RolesByPolicy[AuthorizationPolicies.InventoryManagement];

            Assert.Contains(UserRole.Seller.ToString(), allowed);
            Assert.Contains(UserRole.LogisticsOperator.ToString(), allowed);
            Assert.DoesNotContain(UserRole.Administrator.ToString(), allowed);
            Assert.DoesNotContain(UserRole.Buyer.ToString(), allowed);
        }

        /// <summary>
        /// Criterio (ZENTRIC.md seccion 5): el Supervisor es "perfil de consulta y seguimiento
        /// operativo", o sea que lee y no escribe. Ninguna politica de escritura puede incluirlo.
        /// </summary>
        [Fact]
        public void Supervisor_WritePolicies_NeverIncludeSupervisor()
        {
            string[] writePolicies =
            {
                AuthorizationPolicies.UserAdministration,
                AuthorizationPolicies.WarehouseManagement,
                AuthorizationPolicies.ProductManagement,
                AuthorizationPolicies.InventoryManagement,
                AuthorizationPolicies.Checkout,
                AuthorizationPolicies.FulfillmentOperate,
                AuthorizationPolicies.FulfillmentCancelByQuiebre,
                AuthorizationPolicies.ReturnRequest,
                AuthorizationPolicies.ReturnInspect,
                AuthorizationPolicies.ReturnApprove,
                AuthorizationPolicies.BillingGenerate,
            };

            foreach (string policy in writePolicies)
            {
                Assert.DoesNotContain(UserRole.Supervisor.ToString(), AuthorizationPolicies.RolesByPolicy[policy]);
            }
        }

        /// <summary>
        /// Criterio del dictamen Q-21c (Owner, 2026-09-29): el Operador Logistico
        /// detecta el faltante en bodega, asi que puede reportarlo. El Vendedor sigue
        /// dentro porque el ADDENDUM Dominio 8 le asigna la cancelacion. Sin esta
        /// asercion, quitar al Operador devolveria al flujo a un estado que la Ley
        /// describe pero que nadie podria ejecutar.
        /// </summary>
        [Fact]
        public void CancelByQuiebre_DictatedQ21c_KeepsSellerAndLogisticsOperator()
        {
            IReadOnlyList<string> allowed = AuthorizationPolicies.RolesByPolicy[AuthorizationPolicies.FulfillmentCancelByQuiebre];

            Assert.Contains(UserRole.Seller.ToString(), allowed);
            Assert.Contains(UserRole.LogisticsOperator.ToString(), allowed);
        }

        /// <summary>
        /// Criterio anti-error de dedo: todo rol escrito en la matriz tiene que existir en el
        /// enum <see cref="UserRole"/>. La claim <c>role</c> del token sale de ese enum, asi que
        /// un nombre inexistente seria un 403 permanente e inexplicable.
        /// </summary>
        [Fact]
        public void AuthorizationPolicies_EveryRoleNamed_ExistsInUserRoleEnum()
        {
            var known = new HashSet<string>(Enum.GetNames<UserRole>());

            foreach (KeyValuePair<string, IReadOnlyList<string>> rule in AuthorizationPolicies.RolesByPolicy)
            {
                foreach (string role in rule.Value)
                {
                    Assert.True(known.Contains(role), $"Rol '{role}' de la politica '{rule.Key}' no existe en UserRole.");
                }
            }
        }

        /// <summary>
        /// Criterio anti-regla muerta: toda politica registrada la usa al menos un endpoint. Una
        /// politica que nadie declara se registra, se prueba y no protege nada.
        /// </summary>
        [Fact]
        public void AuthorizationPolicies_EveryRegisteredPolicy_IsUsedByAnEndpoint()
        {
            var used = ActionMethods()
                .Select(EffectivePolicyOf)
                .Where(policy => policy != Anonymous)
                .SelectMany(policy => policy.Split(" + ", StringSplitOptions.RemoveEmptyEntries))
                .ToHashSet();

            foreach (string registered in AuthorizationPolicies.RolesByPolicy.Keys)
            {
                Assert.True(used.Contains(registered), "Politica registrada y nunca declarada en un endpoint: " + registered);
            }
        }

        /// <summary>Acciones de los controladores de la API, es decir los métodos con [Http*].</summary>
        private static IEnumerable<MethodInfo> ActionMethods()
        {
            var controllers = ApiAssembly
                .GetTypes()
                .Where(type => type.IsClass && !type.IsAbstract && typeof(ControllerBase).IsAssignableFrom(type));

            foreach (Type controller in controllers)
            {
                foreach (MethodInfo method in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                {
                    bool isAction = method
                        .GetCustomAttributes(inherit: false)
                        .Any(attribute => attribute.GetType().Namespace == "Microsoft.AspNetCore.Mvc"
                                       && attribute.GetType().Name.StartsWith("Http", StringComparison.Ordinal));

                    if (isAction)
                    {
                        yield return method;
                    }
                }
            }
        }

        /// <summary>
        /// Politica efectiva de una accion. Reglas del framework que se replican aqui: una
        /// <c>[AllowAnonymous]</c> en la accion gana sobre cualquier <c>[Authorize]</c> de la
        /// clase, y si la accion y la clase declaran politicas, se exigen las dos.
        /// </summary>
        private static string EffectivePolicyOf(MethodInfo method)
        {
            Type controller = method.DeclaringType ?? throw new InvalidOperationException("La accion no tiene tipo declarante.");

            if (method.GetCustomAttributes(inherit: false).Any(attribute => attribute is IAllowAnonymous)
                || controller.GetCustomAttributes(inherit: true).Any(attribute => attribute is IAllowAnonymous))
            {
                return Anonymous;
            }

            var policies = controller
                .GetCustomAttributes<AuthorizeAttribute>(inherit: true)
                .Select(PolicyName)
                .Concat(method.GetCustomAttributes<AuthorizeAttribute>(inherit: false).Select(PolicyName))
                .ToList();

            return policies.Count == 0 ? NoPolicy : string.Join(" + ", policies);
        }

        private static string PolicyName(AuthorizeAttribute attribute) =>
            attribute.Policy ?? "(roles: " + attribute.Roles + ")";

        private static string EndpointOf(MethodInfo method) =>
            (method.DeclaringType ?? throw new InvalidOperationException("La accion no tiene tipo declarante.")).Name + "." + method.Name;
    }
}

