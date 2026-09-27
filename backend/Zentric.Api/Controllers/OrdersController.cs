using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Orders.Commands;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión integral del ciclo de pedidos: carrito de compras, adición de ítems con validación de stock, checkout con reserva temporal y confirmación de pago.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("5. Carrito y Órdenes")]
    [Produces("application/json", "application/problem+json")]
    public class OrdersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public OrdersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Inicializa un nuevo carrito de compras para un comprador registrado.
        /// </summary>
        /// <remarks>
        /// Crea una orden de compra en estado inicial Cart asociada al BuyerId especificado.
        /// Este carrito servirá de contenedor para acumular los productos seleccionados.
        /// </remarks>
        /// <param name="command">Comprador para el cual se inicializa el carrito.</param>
        /// <response code="200">Carrito inicializado con éxito. Retorna el identificador (Guid) del pedido.</response>
        /// <response code="400">Error si el comprador no existe o no tiene rol de Buyer (RFC 7807 ProblemDetails).</response>
        [HttpPost("cart")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateCart([FromBody] CreateCartCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Añade una cantidad de un producto específico al carrito de compras activo.
        /// </summary>
        /// <remarks>
        /// Valida en tiempo real la disponibilidad de existencias físicas en el inventario antes de admitir el ítem.
        /// Previene la sobreventa bloqueando la adición si la cantidad requerida supera el stock disponible.
        /// </remarks>
        /// <param name="command">Identificador del carrito, producto, cantidad requerida y precio unitario.</param>
        /// <response code="200">Ítem añadido satisfactoriamente al carrito.</response>
        /// <response code="400">Error si el carrito no está en estado Cart o si no hay stock suficiente (RFC 7807 ProblemDetails).</response>
        [HttpPost("cart/items")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddOrderItem([FromBody] AddOrderItemCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
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
        /// <param name="orderId">Identificador único (Guid) del pedido en estado Cart a procesar.</param>
        /// <response code="200">Checkout completado, reservas aplicadas y paquetes de fulfillment creados.</response>
        /// <response code="400">Error si el pedido está vacío, no existe o expiró la sesión (RFC 7807 ProblemDetails).</response>
        [HttpPost("{orderId}/checkout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Checkout(Guid orderId)
        {
            var result = await _mediator.Send(new CheckoutOrderCommand(orderId));
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Confirma la recepción del pago de la orden y consolida la reserva para despacho.
        /// </summary>
        /// <remarks>
        /// Transita el estado de la orden de Checkout a Paid, confirmando la reserva definitiva del inventario
        /// y habilitando las órdenes de fulfillment para su preparación física y posterior despacho logístico.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido a marcar como pagado.</param>
        /// <response code="200">Pago registrado y confirmado exitosamente.</response>
        /// <response code="400">Error si la orden no se encuentra en estado Checkout o ya fue pagada (RFC 7807 ProblemDetails).</response>
        [HttpPost("{orderId}/pay")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Pay(Guid orderId)
        {
            var result = await _mediator.Send(new PayOrderCommand(orderId));
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Obtiene el estado actual, comprador, total e ítems detallados de un pedido por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) del pedido.</param>
        /// <response code="200">Detalle del pedido obtenido exitosamente.</response>
        /// <response code="404">Pedido no encontrado (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Zentric.Application.Orders.Queries.OrderDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetOrderById(Guid id)
        {
            var result = await _mediator.Send(new Zentric.Application.Orders.Queries.GetOrderByIdQuery(id));
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }
}
