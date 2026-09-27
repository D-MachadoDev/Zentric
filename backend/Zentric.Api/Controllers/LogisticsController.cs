using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Logistics.Commands;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Operaciones logísticas de fulfillment: preparación de paquetes, despacho con guía y control de excepciones por stock fantasma en bodega.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("6. Logística y Despacho")]
    [Produces("application/json", "application/problem+json")]
    public class LogisticsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public LogisticsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Crea una nueva orden de fulfillment para empaque y despacho logístico.
        /// </summary>
        /// <remarks>
        /// Agrupa los ítems asignados a un vendedor específico para ser empacados y despachados
        /// desde una bodega determinada hacia el comprador.
        /// </remarks>
        /// <param name="command">Datos de la orden de fulfillment (OrderId, VendorId, WarehouseId, Items).</param>
        /// <response code="200">Orden de fulfillment creada con éxito. Retorna el identificador (Guid).</response>
        /// <response code="400">Error si los datos de la solicitud son inválidos o la orden no existe (RFC 7807 ProblemDetails).</response>
        [HttpPost("fulfillment")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateFulfillment([FromBody] CreateFulfillmentOrderCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Marca una orden de fulfillment como despachada (Dispatched) y descuenta el stock físico en bodega.
        /// </summary>
        /// <remarks>
        /// Concreta la entrega física del paquete al transportista o couriers.
        /// Transita el estado a Dispatched y ejecuta el descuento contable y físico del inventario reservado.
        /// </remarks>
        /// <param name="id">Identificador único (Guid) de la orden de fulfillment a despachar.</param>
        /// <response code="200">Orden de fulfillment marcada como despachada exitosamente.</response>
        /// <response code="400">Error si la orden no existe, ya fue despachada o cancelada (RFC 7807 ProblemDetails).</response>
        [HttpPost("fulfillment/{id}/dispatch")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DispatchFulfillment(Guid id)
        {
            var result = await _mediator.Send(new DispatchFulfillmentCommand(id));
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Cancela una orden de fulfillment debido a stock fantasma o faltante físico no hallado en bodega.
        /// </summary>
        /// <remarks>
        /// Permite al operador logístico reportar que físicamente no se encontró la mercancía en el estante.
        /// Cancela el paquete, registra el motivo de cancelación y libera la reserva de stock asociada.
        /// </remarks>
        /// <param name="command">Identificador del paquete a cancelar por faltante físico.</param>
        /// <response code="200">Cancelación procesada y reserva liberada exitosamente. Retorna el identificador (Guid).</response>
        /// <response code="400">Error si la orden de fulfillment ya fue cerrada o no existe (RFC 7807 ProblemDetails).</response>
        [HttpPost("fulfillment/cancel-ghost-stock")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CancelGhostStock([FromBody] CancelFulfillmentOrderDueToNoStockCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el estado, vendedor, pedido y paquetes de envío de una orden de fulfillment por su identificador.
        /// </summary>
        /// <param name="id">Identificador único (Guid) de la orden de fulfillment.</param>
        /// <response code="200">Detalle de la orden de fulfillment obtenido exitosamente.</response>
        /// <response code="404">Orden de fulfillment no encontrada (RFC 7807 ProblemDetails).</response>
        [HttpGet("fulfillment/{id}")]
        [ProducesResponseType(typeof(Zentric.Application.Logistics.Queries.FulfillmentOrderDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFulfillmentById(Guid id)
        {
            var result = await _mediator.Send(new Zentric.Application.Logistics.Queries.GetFulfillmentByIdQuery(id));
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }
}
