using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Warehouses.Commands;
using Zentric.Application.Warehouses.Queries;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Administración de bodegas físicas, capacidad volumétrica y centros de acopio.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("2. Bodegas")]
    [Produces("application/json")]
    public class WarehousesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserAccessor _currentUser;

        public WarehousesController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Registra y da de alta una nueva bodega física de almacenamiento.
        /// </summary>
        /// <remarks>
        /// Registra una nueva infraestructura de almacenamiento físico para vendedores o la red logística de Zentric,
        /// definiendo nombre, dirección física y capacidad volumétrica máxima en metros cúbicos (m³).
        /// </remarks>
        /// <param name="command">Datos de registro de la bodega (nombre, ubicación y capacidad volumétrica).</param>
        /// <response code="200">Bodega registrada con éxito. Retorna el identificador único (Guid) generado.</response>
        /// <response code="400">Error de validación si el nombre está vacío o la capacidad volumétrica es menor o igual a cero (RFC 7807 ProblemDetails).</response>
        [HttpPost]
        [Authorize(Policy = AuthorizationPolicies.WarehouseManagement)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene la lista de bodegas físicas, con filtro opcional por vendedor.
        /// </summary>
        /// <remarks>
        /// Q-21b: el Vendedor queda encerrado en sus propias bodegas; pedir las de
        /// otro vendedor responde 400. El Operador y el Administrador listan todas.
        /// </remarks>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <response code="200">Lista de bodegas obtenida exitosamente.</response>
        /// <response code="400">El vendedor pide bodegas de otro vendedor (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.WarehouseRead)]
        [ProducesResponseType(typeof(IReadOnlyList<WarehouseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetWarehouses([FromQuery] Guid? vendorId = null)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new GetWarehousesQuery(vendorId, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el detalle de una bodega por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) de la bodega.</param>
        /// <response code="200">Detalle de la bodega obtenido exitosamente.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Bodega no encontrada o de otro vendedor (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [Authorize(Policy = AuthorizationPolicies.WarehouseRead)]
        [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetWarehouseById(Guid id)
        {
            var userId = _currentUser.UserId;
            var role = User.GetUserRole();
            if (userId is null || role is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new GetWarehouseByIdQuery(id, userId.Value, role.Value));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }
}
