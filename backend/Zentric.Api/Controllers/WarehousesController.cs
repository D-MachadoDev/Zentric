using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Warehouses.Commands;
using Zentric.Application.Warehouses.Queries;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Administración de bodegas físicas, capacidad volumétrica y centros de acopio.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("2. Bodegas")]
    [Produces("application/json", "application/problem+json")]
    public class WarehousesController : ControllerBase
    {
        private readonly IMediator _mediator;

        public WarehousesController(IMediator mediator)
        {
            _mediator = mediator;
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
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene la lista de bodegas físicas, con filtro opcional por vendedor.
        /// </summary>
        /// <remarks>
        /// Permite consultar todas las bodegas activas o filtrar únicamente las pertenecientes a un vendedor (VendorId).
        /// </remarks>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <response code="200">Lista de bodegas obtenida exitosamente.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<WarehouseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetWarehouses([FromQuery] Guid? vendorId = null)
        {
            var result = await _mediator.Send(new GetWarehousesQuery(vendorId));
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el detalle de una bodega por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) de la bodega.</param>
        /// <response code="200">Detalle de la bodega obtenido exitosamente.</response>
        /// <response code="404">Bodega no encontrada (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetWarehouseById(Guid id)
        {
            var result = await _mediator.Send(new GetWarehouseByIdQuery(id));
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }
}
