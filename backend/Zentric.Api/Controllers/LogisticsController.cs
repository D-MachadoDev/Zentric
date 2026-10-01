using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Logistics.Commands;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Operaciones logísticas de fulfillment: preparación de paquetes, despacho con guía y control de excepciones por stock fantasma en bodega.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("6. Logística y Despacho")]

    [Produces("application/json")]
    public class LogisticsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public LogisticsController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
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
        [Authorize(Policy = AuthorizationPolicies.FulfillmentOperate)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateFulfillment([FromBody] CreateFulfillmentOrderCommand command)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: el Vendedor solo crea despachos a su nombre; el Operador
            // puede crearlos para cualquier vendedor.
            var result = await _mediator.Send(command with { CallerId = userId.Value, CallerRole = role.Value });
            if (result.IsFailure) return result.ToProblem();
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
        [Authorize(Policy = AuthorizationPolicies.FulfillmentOperate)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DispatchFulfillment(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: el Vendedor solo despacha los suyos; el Operador, cualquiera.
            var result = await _mediator.Send(new DispatchFulfillmentCommand(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Marca la orden de fulfillment como empacada (PendingPack → Packed).
        /// </summary>
        /// <remarks>
        /// ADDENDUM Dominio 8, estado 2: "Empacado: Listo para recolección". Sin este paso el ciclo
        /// no avanzaba: <c>Dispatch()</c> exige estar Packed, de modo que un paquete creado
        /// directamente en Pendiente de Empaque no podia despacharse por HTTP.
        /// </remarks>
        /// <param name="id">Identificador único de la orden de fulfillment a empacar.</param>
        /// <response code="200">Orden de fulfillment marcada como empacada exitosamente.</response>
        /// <response code="400">Error si la orden ya fue empacada, despachada o cancelada (RFC 7807 ProblemDetails).</response>
        /// <response code="404">Orden de fulfillment inexistente o ajena al vendedor (RFC 7807 ProblemDetails).</response>
        [HttpPost("fulfillment/{id}/pack")]
        [Authorize(Policy = AuthorizationPolicies.FulfillmentOperate)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PackFulfillment(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: el Vendedor solo empaca los suyos; el Operador empaca cualquiera.
            var result = await _mediator.Send(new PackFulfillmentCommand(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Confirma la entrega de la orden de fulfillment (Dispatched → Delivered).
        /// </summary>
        /// <remarks>
        /// ADDENDUM Dominio 8, estado 4: "Entregado: Recibido por el comprador". Solo el Operador
        /// Logistico puede ejecutarla (dictamen del Owner 2026-10-01); el Comprador y el Vendedor
        /// la consultan pero no la cierran.
        /// </remarks>
        /// <param name="id">Identificador único de la orden de fulfillment entregada.</param>
        /// <response code="200">Entrega confirmada exitosamente.</response>
        /// <response code="400">Error si la orden no está despachada o ya fue entregada (RFC 7807 ProblemDetails).</response>
        /// <response code="403">El rol del llamante no es Operador Logistico.</response>
        [HttpPost("fulfillment/{id}/deliver")]
        [Authorize(Policy = AuthorizationPolicies.FulfillmentDeliver)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> DeliverFulfillment(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new DeliverFulfillmentCommand(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
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
        [Authorize(Policy = AuthorizationPolicies.FulfillmentCancelByQuiebre)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CancelGhostStock([FromBody] CancelFulfillmentOrderDueToNoStockCommand command)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: el despacho ajeno se trata como inexistente. El Operador tambien puede
            // reportar el faltante: Q-21c esta DICTADA (ADR-0014) y abre la politica
            // al Operador, no solo al Vendedor.
            var result = await _mediator.Send(command with { CallerId = userId.Value, CallerRole = role.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el estado, vendedor, pedido y paquetes de envío de una orden de fulfillment por su identificador.
        /// </summary>
        /// <remarks>
        /// Q-21b: el Comprador solo ve despachos de pedidos propios y el
        /// Vendedor solo los suyos; el Operador, el Administrador y el Supervisor
        /// leen sin filtro de dueño. Un despacho ajeno responde 404, igual que
        /// uno inexistente.
        /// </remarks>
        /// <param name="id">Identificador único (Guid) de la orden de fulfillment.</param>
        /// <response code="200">Detalle de la orden de fulfillment obtenido exitosamente.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Orden de fulfillment no encontrada o ajena al llamante (RFC 7807 ProblemDetails).</response>
        [HttpGet("fulfillment/{id}")]
        [Authorize(Policy = AuthorizationPolicies.FulfillmentRead)]
        [ProducesResponseType(typeof(Zentric.Application.Logistics.Queries.FulfillmentOrderDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFulfillmentById(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new Zentric.Application.Logistics.Queries.GetFulfillmentByIdQuery(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }
}
