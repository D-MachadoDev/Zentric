using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Common.Models;

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
        private readonly ICurrentUserAccessor _currentUser;

        public CatalogController(IMediator mediator, ICurrentUserAccessor currentUser)
        {
            _mediator = mediator;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Crea una nueva ficha técnica de producto en el catálogo en estado borrador (Draft).
        /// </summary>
        /// <remarks>
        /// Permite a un vendedor registrado definir el SKU, nombre comercial, dimensiones físicas (alto, ancho, largo, peso)
        /// y precio unitario base para su posterior comercialización en el Marketplace.
        /// </remarks>
        /// <param name="command">Datos descriptivos, dimensionales y precio del producto. El VendorId ya no lo decide el cliente: lo fija el token (Q-21b), y un valor en el cuerpo se descarta.</param>
        /// <response code="200">Ficha de producto creada con éxito en estado Draft. Retorna el identificador (Guid).</response>
        /// <response code="400">Error de validación si faltan dimensiones o el precio es inválido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("products")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            // Q-21b: el vendedor es el llamante. Un VendorId en el cuerpo se
            // descarta: registrar producto a nombre de otro corromperia el split
            // de facturacion (Q-18) y no se podria corregir despues.
            var result = await _mediator.Send(command with { VendorId = userId.Value });
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
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
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
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProducts([FromQuery] Guid? vendorId = null)
        {
            var result = await _mediator.Send(new GetProductsQuery(vendorId));
            return Ok(result.Value);
        }


        /// <summary>
        /// Lista el catalogo por paginas. Es la variante recomendada para el
        /// frontend: <c>size</c> se acota en 100 y por defecto trae 20 elementos.
        /// </summary>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <param name="page">Página basada en cero (primera página = 0).</param>
        /// <param name="size">Tamaño de página (1..100, por defecto 20).</param>
        /// <response code="200">Página de productos con metadatos de paginación.</response>
        [HttpGet("products/paged")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(PagedResult<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProductsPaged(
            [FromQuery] Guid? vendorId = null,
            [FromQuery] int page = 0,
            [FromQuery] int size = PageRequest.DefaultPageSize)
        {
            var result = await _mediator.Send(new GetProductsPagedQuery(vendorId, page, size));
            return Ok(result.Value);
        }
        /// <summary>
        /// Obtiene la ficha técnica detallada de un producto por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) del producto.</param>
        /// <response code="200">Detalle del producto obtenido exitosamente.</response>
        /// <response code="404">Producto no encontrado (RFC 7807 ProblemDetails).</response>
        [HttpGet("products/{id}")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
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
