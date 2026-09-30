using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Billing.Commands;
using Zentric.Application.Billing.Queries;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Facturación comercial, generación de factura maestra para el comprador y liquidación de comisión por intermediación para Zentric.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("8. Facturación y Liquidación")]
    [Produces("application/json", "application/problem+json")]
    public class BillingController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public BillingController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Genera las facturas comerciales de una orden y el desglose de comisión interna para Zentric.
        /// </summary>
        /// <remarks>
        /// Emite la Factura Maestra correspondiente al valor total cancelado por el comprador,
        /// genera la factura de comisión por servicios de intermediación tecnológica para Zentric (ZentricDetail)
        /// y calcula la liquidación neta a dispersar a los vendedores participantes.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido pagado a facturar.</param>
        /// <response code="200">Facturación procesada y emitida con éxito. Retorna true.</response>
        /// <response code="400">Error si la orden no existe, no ha sido pagada o ya tiene facturación generada (RFC 7807 ProblemDetails).</response>
        [HttpPost("invoices/generate/{orderId}")]
        [Authorize(Policy = AuthorizationPolicies.BillingGenerate)]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GenerateInvoices(Guid orderId)
        {
            var result = await _mediator.Send(new GenerateInvoicesCommand(orderId));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene la lista de facturas emitidas para un pedido específico, visible según el rol del llamante.
        /// </summary>
        /// <remarks>
        /// Q-21b: el Comprador solo ve la Factura Maestra de un pedido propio;
        /// el Vendedor solo sus facturas de vendedor; el Administrador y el
        /// Supervisor ven todas (incluido el Detalle Zentric de plataforma).
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido pagado.</param>
        /// <response code="200">Lista de facturas visibles para el llamante.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Pedido no encontrado o ajeno al llamante (RFC 7807 ProblemDetails).</response>
        [HttpGet("invoices/order/{orderId}")]
        [Authorize(Policy = AuthorizationPolicies.BillingRead)]
        [ProducesResponseType(typeof(IReadOnlyList<InvoiceDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetInvoicesByOrder(Guid orderId)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: la visibilidad de cada factura depende del rol (ver el handler).
            var result = await _mediator.Send(new GetInvoicesByOrderQuery(orderId, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }
}
