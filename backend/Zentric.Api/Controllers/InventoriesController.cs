using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Inventories.Commands;
using Zentric.Application.Inventories.Queries;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de inventario distribuido, clasificación de existencias y control de stock físico.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("3. Inventario y Stock")]
    [Produces("application/json", "application/problem+json")]
    public class InventoriesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public InventoriesController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Ingresa y actualiza existencias de un producto en una bodega determinada.
        /// </summary>
        /// <remarks>
        /// Registra la entrada física de inventario para un producto en una bodega específica,
        /// diferenciando entre unidades nuevas (NewQuantity) y usadas/reacondicionadas (UsedQuantity).
        /// </remarks>
        /// <param name="command">Datos de entrada de stock (ProductId, WarehouseId, NewQuantity, UsedQuantity). Un CallerId en el cuerpo se descarta: la identidad la fija el token (Q-21b).</param>
        /// <response code="200">Stock registrado con éxito. Retorna el identificador del registro de inventario (Guid).</response>
        /// <response code="400">Error si la bodega o producto no existen, las cantidades son negativas o el vendedor no es dueño del producto o de la bodega (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("stock")]
        [Authorize(Policy = AuthorizationPolicies.InventoryManagement)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> AddStock([FromBody] AddStockCommand command)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(command with { CallerId = userId.Value, CallerRole = role.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Consulta las existencias físicas, reservas y stock disponible de una variante (SKU) en las bodegas.
        /// </summary>
        /// <remarks>
        /// Q-21b: el Vendedor solo ve el stock de sus productos; la variante de
        /// otro responde 404. El Operador ve cualquiera: el stock de la red es su
        /// trabajo.
        /// </remarks>
        /// <param name="variantId">Identificador único (Guid) de la variante del producto.</param>
        /// <response code="200">Lista de registros de inventario por bodega para la variante consultada.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Variante no encontrada o de otro vendedor (RFC 7807 ProblemDetails).</response>
        [HttpGet("{variantId}")]
        [Authorize(Policy = AuthorizationPolicies.InventoryRead)]
        [ProducesResponseType(typeof(IReadOnlyList<InventoryDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetInventoryByVariant(Guid variantId)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new GetInventoryByVariantQuery(variantId, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }
}
