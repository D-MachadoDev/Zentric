using MediatR;
using Microsoft.AspNetCore.Mvc;
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

        public ReturnsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Inicia una solicitud de devolución por parte del comprador para un producto entregado.
        /// </summary>
        /// <remarks>
        /// Valida que el pedido se encuentre debidamente entregado y que la solicitud esté dentro
        /// del período legal de garantía del producto según las reglas de negocio de ZENTRIC.md.
        /// </remarks>
        /// <param name="command">Datos de la devolución (OrderId, ProductId, Motivo y Detalle).</param>
        /// <response code="200">Solicitud de devolución radicada con éxito. Retorna el identificador (Guid).</response>
        /// <response code="400">Error si el plazo de garantía ha expirado o el producto no corresponde a la orden (RFC 7807 ProblemDetails).</response>
        [HttpPost("request")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RequestReturn([FromBody] RequestReturnCommand command)
        {
            var result = await _mediator.Send(command);
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
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ApproveReturn(Guid id, [FromBody] ApproveReturnCommand command)
        {
            if (id != command.ReturnRequestId) return BadRequest(new ProblemDetails { Detail = "El identificador de ruta no coincide con el cuerpo del comando." });
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Obtiene el estado, motivo y dictamen de inspección de una solicitud de devolución por su identificador.
        /// </summary>
        /// <param name="id">Identificador único (Guid) de la solicitud de devolución.</param>
        /// <response code="200">Detalle de la devolución obtenido exitosamente.</response>
        /// <response code="404">Solicitud de devolución no encontrada (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Zentric.Application.Returns.Queries.ReturnRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReturnById(Guid id)
        {
            var result = await _mediator.Send(new Zentric.Application.Returns.Queries.GetReturnByIdQuery(id));
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
