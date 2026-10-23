using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Returns.Commands;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de posventa, solicitudes de devolución dentro de garantía legal, inspección física de mercancía y reingreso automático al stock.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("7. Devoluciones y Garantías")]
    [Produces("application/json")]
    public class ReturnsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public ReturnsController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Inicia una solicitud de devolución por parte del comprador para un producto entregado.
        /// </summary>
        /// <remarks>
        /// Valida que el pedido se encuentre debidamente entregado y que la solicitud esté dentro
        /// del período legal de garantía del producto según las reglas de negocio de ZENTRIC.md.
        /// </remarks>
        /// <param name="command">Datos de la devolución (CustomerOrderId, VariantId, WarehouseId de recepción, Quantity). El tipo de producto NO viaja: el servidor lo deduce (ADR-0018), igual que la identidad.</param>
        /// <response code="200">Solicitud de devolución radicada con éxito. Retorna el identificador (Guid).</response>
        /// <response code="400">Error si el plazo de garantía ha expirado, el producto no corresponde a la orden o el pedido no pertenece al llamante (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("request")]
        [Authorize(Policy = AuthorizationPolicies.ReturnRequest)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RequestReturn([FromBody] RequestReturnCommand command)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // La identidad la fija el token, no el cuerpo; el handler
            // verifica que el pedido a devolver sea del llamante.
            var result = await _mediator.Send(command with { BuyerId = userId.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Registra el dictamen de la inspección física del producto devuelto recibido en bodega.
        /// </summary>
        /// <remarks>
        /// Permite al operador logístico calificar el estado del producto retornado (buen estado o dañado).
        /// Esta inspección es un requisito previo indispensable para la aprobación de la devolución.
        /// </remarks>
        /// <param name="id">Identificador único (Guid) de la solicitud de devolución.</param>
        /// <param name="dto">Resultado de la inspección técnica (IsGoodCondition).</param>
        /// <response code="200">Inspección física registrada con éxito.</response>
        /// <response code="400">Error si la solicitud no está en estado pendiente de inspección (RFC 7807 ProblemDetails).</response>
        [HttpPost("{id}/inspect")]
        [Authorize(Policy = AuthorizationPolicies.ReturnInspect)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> InspectReturn(Guid id, [FromBody] InspectReturnRequestDto dto)
        {
            var result = await _mediator.Send(new InspectReturnCommand(id, dto.IsGoodCondition));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Aprueba la devolución y dispara el evento de dominio para reingresar el stock como usado.
        /// </summary>
        /// <remarks>
        /// Valida que el producto haya sido inspeccionado favorablemente. Al aprobarse,
        /// dispara el evento de dominio ReturnApprovedEvent que incrementa de forma atómica
        /// el inventario usado (UsedQuantity) en la bodega correspondiente.
        /// </remarks>
        /// <param name="id">Identificador de la solicitud en la ruta URL.</param>
        /// <param name="command">Solo el ReturnRequestId: si la devolución vuelve a una bodega del propio vendedor (la exención de inspección) lo deduce el servidor (ADR-0018), no el cliente.</param>
        /// <response code="200">Devolución aprobada y reingreso a stock ejecutado exitosamente.</response>
        /// <response code="400">Error si los identificadores no coinciden o la solicitud no es aprobable (RFC 7807 ProblemDetails).</response>
        [HttpPost("{id}/approve")]
        [Authorize(Policy = AuthorizationPolicies.ReturnApprove)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ApproveReturn(Guid id, [FromBody] ApproveReturnCommand command)
        {
            if (id != command.ReturnRequestId) return BadRequest(new ProblemDetails { Detail = "El identificador de ruta no coincide con el cuerpo del comando." });

            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // La aprobacion es del vendedor del producto devuelto.
            var result = await _mediator.Send(command with { CallerId = userId.Value, CallerRole = role.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Rechaza una solicitud de devolución (estado Rechazada).
        /// </summary>
        /// <remarks>
        /// ADDENDUM Dominio 10. Lo decide el mismo Vendedor que aprueba, porque es la misma decisión
        /// negada y la Ley le asigna esa decisión. Una devolución no solicitada, ya aprobada o ya
        /// reembolsada no se puede rechazar: el ciclo solo avanza hacia adelante.
        /// </remarks>
        /// <param name="id">Identificador único de la solicitud de devolución.</param>
        /// <response code="200">Devolución rechazada exitosamente.</response>
        /// <response code="400">Error si la solicitud no está en estado Solicitada (RFC 7807 ProblemDetails).</response>
        /// <response code="404">Solicitud inexistente o de otro vendedor (RFC 7807 ProblemDetails).</response>
        [HttpPost("{id}/reject")]
        [Authorize(Policy = AuthorizationPolicies.ReturnApprove)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RejectReturn(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new RejectReturnCommand(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Emite el reembolso de una devolución ya aprobada (estado Reembolsada).
        /// </summary>
        /// <remarks>
        /// ADDENDUM Dominio 10. Solo el Administrador (dictamen del Owner 2026-10-01). No basta con
        /// cambiar el estado: el caso de uso acredita también el comprobante de pago del pedido, en
        /// la misma transacción, para que nunca exista una devolución "Reembolsada" sin dinero
        /// entregado al comprador.
        /// </remarks>
        /// <param name="id">Identificador único de la solicitud de devolución.</param>
        /// <response code="200">Reembolso emitido exitosamente.</response>
        /// <response code="400">Error si la devolución no está aprobada o el pedido no tiene comprobante (RFC 7807 ProblemDetails).</response>
        /// <response code="403">El rol del llamante no es Administrador.</response>
        [HttpPost("{id}/refund")]
        [Authorize(Policy = AuthorizationPolicies.ReturnRefund)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> RefundReturn(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new RefundReturnCommand(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Lista las devoluciones visibles para quien pregunta.
        /// </summary>
        /// <remarks>
        /// Antes solo existía <c>GET /api/Returns/{id}</c>. Sin este listado no hay bandeja de
        /// devoluciones: ni el Comprador puede ver lo que devolvio, ni el Vendedor lo que tiene que
        /// aprobar o rechazar, ni el Supervisor puede auditar.
        ///
        /// El reparto por rol es el mismo que en el detalle: Comprador por pedido,
        /// Vendedor por variante, y Operador, Administrador y Supervisor sin filtro. El filtro no es
        /// un parametro: no hay forma de pedir las de otro.
        /// </remarks>
        /// <param name="status">Filtro opcional por estado de la devolucion, por nombre (ADR-0012).</param>
        /// <response code="200">Listado de devoluciones visibles para el llamante.</response>
        /// <response code="400">El estado indicado no es un <c>ReturnStatus</c> valido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.ReturnRead)]
        [ProducesResponseType(typeof(IReadOnlyList<Zentric.Application.Returns.Queries.ReturnRequestDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetReturns([FromQuery] string? status)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            Zentric.Domain.Returns.Enums.ReturnStatus? parsed = null;

            // Estado por nombre (ADR-0012). Un valor desconocido es 400 explicito y NO un filtro
            // ignorado: devolver la bandeja completa mientras el usuario cree estar filtrando seria
            // el peor fallo posible de este endpoint.
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (!Enum.TryParse<Zentric.Domain.Returns.Enums.ReturnStatus>(status, ignoreCase: true, out var value)
                    || !Enum.IsDefined(value))
                {
                    return BadRequest(new ProblemDetails
                    {
                        Detail = $"'{status}' is not a valid return status. Valid values: {string.Join(", ", Enum.GetNames<Zentric.Domain.Returns.Enums.ReturnStatus>())}."
                    });
                }

                parsed = value;
            }

            var result = await _mediator.Send(
                new Zentric.Application.Returns.Queries.GetReturnsQuery(userId.Value, role.Value, parsed));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el estado, motivo y dictamen de inspección de una solicitud de devolución por su identificador.
        /// </summary>
        /// <remarks>
        /// El Comprador solo ve devoluciones de pedidos propios y el
        /// Vendedor solo las de productos suyos; el Operador, el Administrador y
        /// el Supervisor leen sin filtro de dueño. Una devolución ajena responde
        /// 404, igual que una inexistente.
        /// </remarks>
        /// <param name="id">Identificador único (Guid) de la solicitud de devolución.</param>
        /// <response code="200">Detalle de la devolución obtenido exitosamente.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Solicitud de devolución no encontrada o ajena al llamante (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [Authorize(Policy = AuthorizationPolicies.ReturnRead)]
        [ProducesResponseType(typeof(Zentric.Application.Returns.Queries.ReturnRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReturnById(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new Zentric.Application.Returns.Queries.GetReturnByIdQuery(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }

    /// <summary>
    /// DTO para el registro del dictamen de inspección física.
    /// </summary>
    /// <param name="IsGoodCondition">Indica si el producto se encuentra en condiciones óptimas para retorno a inventario.</param>
    public record InspectReturnRequestDto(bool IsGoodCondition);
}
