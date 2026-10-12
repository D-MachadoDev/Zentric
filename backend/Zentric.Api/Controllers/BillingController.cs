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
    [Produces("application/json")]
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
        /// Anula la factura maestra de un pedido (FAC-02).
        /// </summary>
        /// <remarks>
        /// Solo el Administrador puede ejecutar esta acción (política BillingGenerate).
        /// Se usa cuando hay un chargeback, el pago es rechazado a posteriori o por timed-out
        /// del comprobante. El motivo queda escrito en la propia factura.
        /// Las facturas de tipo VendorDetail y ZentricDetail no se anulan: solo la Maestra.
        /// </remarks>
        /// <param name="orderId">Identificador único (Guid) del pedido cuya factura maestra se anula.</param>
        /// <param name="command">Cuerpo con el motivo de la anulación (obligatorio).</param>
        /// <response code="200">Factura maestra anulada exitosamente.</response>
        /// <response code="400">Error si la factura ya estaba anulada o el motivo es vacío (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="403">El llamante no es Administrador (política BillingGenerate).</response>
        /// <response code="404">Factura maestra no encontrada para el pedido.</response>
        [HttpPost("invoices/annul/{orderId}")]
        [Authorize(Policy = AuthorizationPolicies.BillingGenerate)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AnnullMasterInvoice(Guid orderId, [FromBody] AnnullMasterInvoiceRequest command)
        {
            var result = await _mediator.Send(new AnnullMasterInvoiceCommand(orderId, command.Reason));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Lista las facturas visibles para quien pregunta.
        /// </summary>
        /// <remarks>
        /// Antes solo existía <c>GET /api/billing/invoices/order/{orderId}</c>, que obliga a saber
        /// de antemano el pedido. Sin este listado no hay "mis facturas": ni el Comprador puede ver
        /// sus facturas maestras, ni el Vendedor las suyas, ni el Supervisor puede auditar.
        ///
        /// El reparto por rol es el mismo que en el listado por pedido (Q-21b y ADDENDUM Dominio 9).
        /// El filtro no es un parametro: no hay forma de pedir las de otro.
        /// </remarks>
        /// <response code="200">Listado de facturas visibles para el llamante.</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet("invoices")]
        [Authorize(Policy = AuthorizationPolicies.BillingRead)]
        [ProducesResponseType(typeof(IReadOnlyList<Zentric.Application.Billing.Queries.InvoiceDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetInvoices()
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(
                new Zentric.Application.Billing.Queries.GetInvoicesQuery(userId.Value, role.Value));
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

    /// <summary>
    /// Request body para anular la factura maestra.
    /// </summary>
    public sealed record AnnullMasterInvoiceRequest(string Reason);
}
