using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Queries;
using Zentric.Domain.Users.Enums;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
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
        /// Inicializa un nuevo carrito de compras para el comprador autenticado.
        /// </summary>
        /// <remarks>
        /// Crea una orden de compra en estado inicial Cart asociada al comprador
        /// del token. Q-21b (dictada por el Owner el 2026-09-29): el BuyerId ya no
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
        /// <param name="command">Identificador del carrito, producto, cantidad requerida y precio unitario. Un BuyerId en el cuerpo se descarta: la identidad la fija el token (Q-21b).</param>
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

            // Q-21b: la identidad la fija el token, no el cuerpo. El valor que
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
        /// <param name="orderId">Identificador único (Guid) del pedido en estado Cart a procesar. Debe pertenecer al comprador del token (Q-21b).</param>
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

            // Q-21b: el checkout solo opera sobre pedidos propios.
            var result = await _mediator.Send(new CheckoutOrderCommand(orderId, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Confirma la recepción del pago de la orden y consolida la reserva para despacho.
        /// </summary>
        /// <remarks>
        /// Transita el estado de la orden de Checkout a Paid, confirmando la reserva definitiva del inventario
        /// y habilitando las órdenes de fulfillment para su preparación física y posterior despacho logístico.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido a marcar como pagado. Debe pertenecer al comprador del token (Q-21b).</param>
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

            // Q-21b: nadie paga un pedido ajeno; el filtro por comprador viaja a
            // la consulta del handler.
            var result = await _mediator.Send(new PayOrderCommand(orderId, userId.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Obtiene el estado actual, total e ítems de un pedido por su identificador único.
        /// </summary>
        /// <remarks>
        /// Q-21b: la respuesta depende del rol. El Comprador recibe su pedido
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

            // Q-21b: cada rol lee lo suyo; el Operador, el Administrador y el
            // Supervisor leen sin filtro de dueno (dictado de Q-21 + dictamen).
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
