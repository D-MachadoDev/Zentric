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
    [Produces("application/json")]
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
        /// <param name="command">Datos de entrada de stock (ProductId, WarehouseId, NewQuantity, UsedQuantity). Un CallerId en el cuerpo se descarta: la identidad la fija el token.</param>
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
        /// Lista las existencias visibles para quien pregunta.
        /// </summary>
        /// <remarks>
        /// Antes solo existía <c>GET /api/Inventories/{variantId}</c>, que obliga a saber de
        /// antemano la variante. Sin este listado no hay pantalla de inventario: ni el Vendedor
        /// puede revisar su stock, ni el Operador puede ver la red de bodegas.
        ///
        /// El reparto por rol es el mismo que en el detalle: el Vendedor ve el stock de SUS
        /// productos aunque esten en cualquier bodega, y el Operador ve la red completa. El filtro
        /// no es un parametro: no hay forma de pedir el stock de otro.
        /// </remarks>
        /// <response code="200">Listado de existencias visibles para el llamante.</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.InventoryRead)]
        [ProducesResponseType(typeof(IReadOnlyList<Zentric.Application.Inventories.Queries.InventoryDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetInventories()
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(
                new Zentric.Application.Inventories.Queries.GetInventoriesQuery(userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }


        /// <summary>
        /// Consulta las existencias físicas, reservas y stock disponible de una variante (SKU) en las bodegas.
        /// </summary>
        /// <remarks>
        /// El Vendedor solo ve el stock de sus productos; la variante de
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

        /// <summary>
        /// Ajusta el inventario fisico por conteo (ADR-0021).
        /// </summary>
        /// <remarks>
        /// Permite al Administrador o Supervisor corregir el stock disponible tras un conteo fisico.
        /// El conteo SOLO puede reducir el disponible (no inventar stock). Se registra el ajuste
        /// con evidencia: cantidad contada, motivo, quien conto y cuando. Idempotente: reenviar
        /// la misma peticion en 5 minutos devuelve el mismo resultado sin duplicar el registro.
        /// </remarks>
        /// <param name="id">Identificador unico (Guid) del registro de inventario (clave VariantId + WarehouseId).</param>
        /// <param name="command">Datos del ajuste: countedQuantity (nuevo disponible), reason (motivo).</param>
        /// <response code="200">Ajuste registrado con exito. Retorna el registro de ajuste creado.</response>
        /// <response code="400">Error si la cantidad es negativa, supera el disponible actual, o el motivo es vacio (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o invalido.</response>
        /// <response code="403">El rol del llamante no es Administrador ni Supervisor.</response>
        /// <response code="404">Registro de inventario no encontrado.</response>
        [HttpPost("{id}/adjust")]
        [Authorize(Policy = AuthorizationPolicies.InventoryAdjust)]
        [ProducesResponseType(typeof(AdjustInventoryResult), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AdjustInventory(Guid id, [FromBody] AdjustInventoryRequest command)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new AdjustInventoryCommand(id, command.CountedQuantity, command.Reason, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Request body para ajustar inventario por conteo fisico.
        /// </summary>
        public sealed record AdjustInventoryRequest(int CountedQuantity, string Reason);
    }
}
