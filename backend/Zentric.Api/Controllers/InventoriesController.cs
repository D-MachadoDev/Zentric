using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Inventories.Commands;
using Zentric.Application.Inventories.Queries;

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

        public InventoriesController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Ingresa y actualiza existencias de un producto en una bodega determinada.
        /// </summary>
        /// <remarks>
        /// Registra la entrada física de inventario para un producto en una bodega específica,
        /// diferenciando entre unidades nuevas (NewQuantity) y usadas/reacondicionadas (UsedQuantity).
        /// </remarks>
        /// <param name="command">Datos de entrada de stock (ProductId, WarehouseId, NewQuantity, UsedQuantity).</param>
        /// <response code="200">Stock registrado con éxito. Retorna el identificador del registro de inventario (Guid).</response>
        /// <response code="400">Error si la bodega o producto no existen o las cantidades son negativas (RFC 7807 ProblemDetails).</response>
        [HttpPost("stock")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddStock([FromBody] AddStockCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Consulta las existencias físicas, reservas y stock disponible de una variante (SKU) en las bodegas.
        /// </summary>
        /// <param name="variantId">Identificador único (Guid) de la variante del producto.</param>
        /// <response code="200">Lista de registros de inventario por bodega para la variante consultada.</response>
        [HttpGet("{variantId}")]
        [ProducesResponseType(typeof(IReadOnlyList<InventoryDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetInventoryByVariant(Guid variantId)
        {
            var result = await _mediator.Send(new GetInventoryByVariantQuery(variantId));
            return Ok(result.Value);
        }
    }
}
