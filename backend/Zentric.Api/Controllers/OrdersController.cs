using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Queries;
using Zentric.Domain.Users.Enums;

using Zentric.Api.Contracts;
using Zentric.Domain.Orders.Enums;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Request body para actualizar cantidad de ítem en carrito.
    /// </summary>
    public sealed record UpdateCartItemQuantityRequest(int Quantity);

    /// <summary>
    /// Gestión integral del ciclo de pedidos: carrito de compras, adición de ítems con validación de stock, checkout con reserva temporal y confirmación de pago.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("5. Carrito y Órdenes")]
    [Produces("application/json")]
    public class OrdersController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public OrdersController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Lista los pedidos visibles para quien pregunta.
        /// </summary>
        /// <remarks>
        /// Antes solo existía <c>GET /api/Orders/{id}</c>, así que sin este listado el frontend
        /// únicamente podía abrir un pedido si ya conocía su GUID. Sin esto no hay pantalla de
        /// "mis pedidos", ni de pedidos por despachar, ni de pedidos del comprador.
        ///
        /// El filtro lo decide el rol, no un parámetro: el Comprador ve los suyos, el Vendedor los
        /// que tienen alguna línea suya, y Administrador, Operador y Supervisor ven todos.
        /// Un cliente no puede pedir "los de otro" porque no hay por dónde decirlo.
        ///
        /// <c>status</c> es un filtro opcional y va por nombre (ADR-0012). Sin él también
        /// devuelve los carritos: el comprador tiene que ver su carrito abierto para poder
        /// continuar la compra.
        /// </remarks>
        /// <param name="status">Filtro opcional por estado del pedido.</param>
        /// <response code="200">Listado de pedidos visibles para el llamante.</response>
        /// <response code="400">El estado indicado no es un <c>OrderStatus</c> válido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.OrderRead)]
        [ProducesResponseType(typeof(IReadOnlyList<OrderListItemDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetOrders([FromQuery] string? status)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            OrderStatus? parsed = null;

            // El estado llega como texto porque el contrato de enums va solo por nombre
            // (ADR-0012). Un valor desconocido es un 400 explicito y no un filtro silencioso que
            // devuelve la lista completa: seria el peor fallo posible, porque el usuario creeria
            // estar filtrando y estaria viendo de todo.
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var value)
                    || !Enum.IsDefined(value))
                {
                    return BadRequest(new ProblemDetails
                    {
                        Detail = $"'{status}' is not a valid order status. Valid values: {string.Join(", ", Enum.GetNames<OrderStatus>())}."
                    });
                }

                parsed = value;
            }

            var result = await _mediator.Send(new GetOrdersQuery(userId.Value, role.Value, parsed));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el listado de pedidos realizados por el comprador autenticado.
        /// </summary>
        /// <remarks>
        /// Satisface el contrato GET /api/orders/buyer. Devuelve la lista de órdenes con ítems enriquecidos
        /// (nombre de producto, SKU, URL de imagen, vendedor) y tiempo de expiración.
        /// </remarks>
        /// <param name="status">Filtro opcional por estado de la orden.</param>
        /// <response code="200">Listado de órdenes del comprador autenticado.</response>
        /// <response code="400">Estado de orden inválido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet("buyer")]
        [Authorize(Policy = AuthorizationPolicies.OrderRead)]
        [ProducesResponseType(typeof(IReadOnlyList<OrderListItemDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetBuyerOrders([FromQuery] string? status)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            OrderStatus? parsed = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var value)
                    || !Enum.IsDefined(value))
                {
                    return BadRequest(new ProblemDetails
                    {
                        Detail = $"'{status}' is not a valid order status. Valid values: {string.Join(", ", Enum.GetNames<OrderStatus>())}."
                    });
                }

                parsed = value;
            }

            var result = await _mediator.Send(new GetOrdersQuery(userId.Value, UserRole.Buyer, parsed));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Inicializa un nuevo carrito de compras para el comprador autenticado.
        /// </summary>
        /// <remarks>
        /// Crea una orden de compra en estado inicial Cart asociada al comprador
        /// del token. Regla dictada por el Owner el 2026-09-29: el BuyerId ya no
        /// viaja en el cuerpo; se deriva del claim <c>sub</c>, de modo que un
        /// carrito a nombre de otro comprador es imposible por contrato.
        /// Este carrito servirá de contenedor para acumular los productos seleccionados.
        /// </remarks>
        /// <response code="200">Carrito inicializado con éxito. Retorna el identificador (Guid) del pedido.</response>
        /// <response code="400">Error de validación (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("cart")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateCart()
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            var result = await _mediator.Send(new CreateCartCommand(userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Añade una cantidad de un producto específico al carrito de compras activo.
        /// </summary>
        /// <remarks>
        /// Valida en tiempo real la disponibilidad de existencias físicas en el inventario antes de admitir el ítem.
        /// Previene la sobreventa bloqueando la adición si la cantidad requerida supera el stock disponible.
        /// </remarks>
        /// <param name="command">Identificador del carrito, variante y cantidad. El precio y el vendedor NO viajan: los pone el servidor con el catálogo (ADR-0020). Un BuyerId en el cuerpo se descarta: la identidad la fija el token.</param>
        /// <response code="200">Ítem añadido satisfactoriamente al carrito.</response>
        /// <response code="400">Error si el carrito no está en estado Cart, si no hay stock suficiente o si el carrito no pertenece al llamante (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("cart/items")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> AddOrderItem([FromBody] AddOrderItemCommand command)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            // La identidad la fija el token, no el cuerpo. El valor que
            // traiga el cliente se descarta antes de llegar al caso de uso, y el
            // handler verifica la propiedad del pedido contra este mismo valor.
            var result = await _mediator.Send(command with { BuyerId = userId.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Realiza el checkout del pedido: reserva stock temporal e inicia el temporizador de expiración de 15 minutos.
        /// </summary>
        /// <remarks>
        /// Valida que el pedido contenga al menos un ítem. Aplica la reserva atómica en bodega,
        /// subdivide el pedido en órdenes de fulfillment agrupadas por vendedor (VendorId)
        /// y activa la ventana de 15 minutos para formalizar el pago antes de que el stock expire automáticamente.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido en estado Cart a procesar. Debe pertenecer al comprador del token.</param>
        /// <response code="200">Checkout completado, reservas aplicadas y paquetes de fulfillment creados.</response>
        /// <response code="400">Error si el pedido está vacío, no existe (o no es suyo) o expiró la sesión (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("{orderId}/checkout")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Checkout(Guid orderId)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            // El checkout solo opera sobre pedidos propios.
            var result = await _mediator.Send(new CheckoutOrderCommand(orderId, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Remueve una línea del carrito de compras del comprador autenticado.
        /// </summary>
        /// <remarks>
        /// Elimina un ítem del carrito identificado por <paramref name="orderId"/> y <paramref name="variantId"/>.
        /// Solo el comprador dueño del carrito puede remover ítems (política Checkout).
        /// El carrito debe estar en estado Cart; si ya avanzó a PendingPayment o Paid, la operación se rechaza con 400.
        /// Si el carrito no existe o no pertenece al comprador autenticado, responde 404.
        /// </remarks>
        /// <param name="orderId">Identificador único del carrito (CustomerOrder).</param>
        /// <param name="variantId">Identificador único de la variante (ProductVariant) a remover.</param>
        /// <response code="204">Ítem removido satisfactoriamente.</response>
        /// <response code="400">El carrito no está en estado Cart (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Carrito no encontrado o ajeno al comprador (RFC 7807 ProblemDetails).</response>
        [HttpDelete("{orderId}/items/{variantId}")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveOrderItem(Guid orderId, Guid variantId)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            var result = await _mediator.Send(new RemoveOrderItemCommand(orderId, variantId, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return NoContent();
        }

        /// <summary>
        /// Actualiza la cantidad de una línea del carrito.
        /// </summary>
        /// <remarks>
        /// Permite incrementar o decrementar la cantidad de una variante en el carrito.
        /// La cantidad mínima es 1; para remover la línea completa use DELETE.
        /// Solo el comprador dueño del carrito puede modificar sus líneas.
        /// El carrito debe estar en estado Cart.
        /// </remarks>
        /// <param name="orderId">Identificador único del carrito (CustomerOrder).</param>
        /// <param name="variantId">Identificador único de la variante (ProductVariant) a actualizar.</param>
        /// <param name="body">Cuerpo con la nueva cantidad: { quantity: int }.</param>
        /// <response code="204">Cantidad actualizada satisfactoriamente.</response>
        /// <response code="400">Cantidad inválida (menor a 1), carrito no en estado Cart, o variante sin stock (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Carrito no encontrado, ajeno al comprador, o variante no existe en el carrito (RFC 7807 ProblemDetails).</response>
        [HttpPatch("{orderId}/items/{variantId}/quantity")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateCartItemQuantity(Guid orderId, Guid variantId, [FromBody] UpdateCartItemQuantityRequest body)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            var result = await _mediator.Send(new UpdateCartItemQuantityCommand(orderId, variantId, body.Quantity, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return NoContent();
        }

        /// <summary>
        /// Confirma la recepción del pago de la orden y consolida la reserva para despacho.
        /// </summary>
        /// <remarks>
        /// Transita el estado de la orden de Checkout a Paid, confirmando la reserva definitiva del inventario
        /// y habilitando las órdenes de fulfillment para su preparación física y posterior despacho logístico.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido a marcar como pagado. Debe pertenecer al comprador del token.</param>
        /// <response code="200">Pago registrado y confirmado exitosamente.</response>
        /// <response code="400">Error si la orden no se encuentra en estado Checkout, ya fue pagada o no pertenece al llamante (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("{orderId}/pay")]
        [Authorize(Policy = AuthorizationPolicies.Checkout)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Pay(Guid orderId)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return MissingIdentity();

            // Nadie paga un pedido ajeno; el filtro por comprador viaja a
            // la consulta del handler.
            var result = await _mediator.Send(new PayOrderCommand(orderId, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Obtiene el estado actual, total e ítems de un pedido por su identificador único.
        /// </summary>
        /// <remarks>
        /// La respuesta depende del rol. El Comprador recibe su pedido
        /// completo; el Vendedor recibe la vista filtrada (solo sus líneas y su
        /// subtotal, sin datos de otros vendedores); el Operador, el
        /// Administrador y el Supervisor leen sin filtro de dueño. Un pedido
        /// ajeno responde 404, igual que uno inexistente.
        /// </remarks>
        /// <param name="id">Identificador único (Guid) del pedido.</param>
        /// <response code="200">Detalle del pedido obtenido exitosamente (OrderDto o SellerOrderViewDto según el rol).</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Pedido no encontrado o ajeno al llamante (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [Authorize(Policy = AuthorizationPolicies.OrderRead)]
        [ProducesResponseType(typeof(Zentric.Application.Orders.Queries.OrderDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Zentric.Application.Orders.Queries.SellerOrderViewDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetOrderById(Guid id)
        {
            // Sin usuario identificado no se sirve el pedido: no hay forma de
            // saber si es suyo. Ver ZENTRIC.md Dominio 2.
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return MissingIdentity();

            // Cada rol lee lo suyo; el Operador, el Administrador y el
            // Supervisor leen sin filtro de dueno.
            switch (role.Value)
            {
                case UserRole.Buyer:
                {
                    var buyerResult = await _mediator.Send(new GetOrderByIdForBuyerQuery(id, userId.Value));
                    if (buyerResult.IsFailure) return buyerResult.ToProblem();
                    return Ok(buyerResult.Value);
                }

                case UserRole.Seller:
                {
                    var sellerResult = await _mediator.Send(new GetOrderByIdForSellerQuery(id, userId.Value));
                    if (sellerResult.IsFailure) return sellerResult.ToProblem();
                    return Ok(sellerResult.Value);
                }

                default:
                {
                    var result = await _mediator.Send(new GetOrderByIdQuery(id));
                    if (result.IsFailure) return result.ToProblem();
                    return Ok(result.Value);
                }
            }
        }

        /// <summary>
        /// 401 uniforme para peticiones sin identidad válida. Con la política de
        /// reserva no debería ocurrir (el middleware responde antes), pero se
        /// cubre explícitamente en vez de asumirlo.
        /// </summary>
        private IActionResult MissingIdentity() =>
            Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
    }
}
