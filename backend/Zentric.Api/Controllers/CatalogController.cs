using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Queries;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Catálogo comercial de productos, especificaciones dimensionales y ciclo de vida de publicación.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("4. Catálogo de Productos")]
    [Produces("application/json", "application/problem+json")]
    public class CatalogController : ControllerBase
    {
        private readonly IMediator _mediator;

        public CatalogController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Crea una nueva ficha técnica de producto en el catálogo en estado borrador (Draft).
        /// </summary>
        /// <remarks>
        /// Permite a un vendedor registrado definir el SKU, nombre comercial, dimensiones físicas (alto, ancho, largo, peso)
        /// y precio unitario base para su posterior comercialización en el Marketplace.
        /// </remarks>
        /// <param name="command">Datos descriptivos, dimensionales y precio del producto.</param>
        /// <response code="200">Ficha de producto creada con éxito en estado Draft. Retorna el identificador (Guid).</response>
        /// <response code="400">Error de validación si faltan dimensiones o el precio es inválido (RFC 7807 ProblemDetails).</response>
        [HttpPost("products")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }

        /// <summary>
        /// Publica un producto del catálogo para habilitar su comercialización activa.
        /// </summary>
        /// <remarks>
        /// Transita el estado del producto de Draft a Published, haciéndolo visible en las búsquedas
        /// de los compradores y permitiendo su incorporación a carritos de compra.
        /// </remarks>
        /// <param name="productId">Identificador único (Guid) del producto a publicar.</param>
        /// <response code="200">Producto publicado exitosamente.</response>
        /// <response code="400">Error si el producto no existe o ya se encuentra publicado (RFC 7807 ProblemDetails).</response>
        [HttpPost("products/{productId}/publish")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> PublishProduct(Guid productId)
        {
            var result = await _mediator.Send(new PublishProductCommand(productId));
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok();
        }

        /// <summary>
        /// Obtiene el catálogo de productos registrados, con filtro opcional por vendedor.
        /// </summary>
        /// <remarks>
        /// Permite a compradores y administradores consultar el catálogo general de productos o filtrar por proveedor (VendorId).
        /// </remarks>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <response code="200">Lista de productos obtenida exitosamente.</response>
        [HttpGet("products")]
        [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProducts([FromQuery] Guid? vendorId = null)
        {
            var result = await _mediator.Send(new GetProductsQuery(vendorId));
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene la ficha técnica detallada de un producto por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) del producto.</param>
        /// <response code="200">Detalle del producto obtenido exitosamente.</response>
        /// <response code="404">Producto no encontrado (RFC 7807 ProblemDetails).</response>
        [HttpGet("products/{id}")]
        [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProductById(Guid id)
        {
            var result = await _mediator.Send(new GetProductByIdQuery(id));
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }
}
