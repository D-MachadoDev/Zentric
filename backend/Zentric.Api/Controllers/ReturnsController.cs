using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Returns.Commands;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de posventa, solicitudes de devolución dentro de garantía legal, inspección física de mercancía y reingreso automático al stock.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("7. Devoluciones y Garantías")]
    [Produces("application/json", "application/problem+json")]
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
        /// <param name="command">Datos de la devolución (OrderId, ProductId, Motivo y Detalle). Un BuyerId en el cuerpo se descarta: la identidad la fija el token (Q-21b).</param>
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

            // Q-21b: la identidad la fija el token, no el cuerpo; el handler
            // verifica que el pedido a devolver sea del llamante.
            var result = await _mediator.Send(command with { BuyerId = userId.Value });
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
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
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
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
        /// <param name="command">Comando que incluye el ReturnRequestId y WarehouseId de destino.</param>
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

            // Q-21b: la aprobacion es del vendedor del producto devuelto.
            var result = await _mediator.Send(command with { CallerId = userId.Value, CallerRole = role.Value });
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Obtiene el estado, motivo y dictamen de inspección de una solicitud de devolución por su identificador.
        /// </summary>
        /// <remarks>
        /// Q-21b: el Comprador solo ve devoluciones de pedidos propios y el
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
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }

    /// <summary>
    /// DTO para el registro del dictamen de inspección física.
    /// </summary>
    /// <param name="IsGoodCondition">Indica si el producto se encuentra en condiciones óptimas para retorno a inventario.</param>
    public record InspectReturnRequestDto(bool IsGoodCondition);
}
