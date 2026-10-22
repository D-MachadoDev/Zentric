using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Common.Models;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Catálogo comercial de productos, especificaciones dimensionales y ciclo de vida de publicación.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("4. Catálogo de Productos")]
    [Produces("application/json")]
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
        /// Crea una nueva ficha técnica de producto que nace publicada (auto-publicación, CAT-01).
        /// </summary>
        /// <remarks>
        /// Permite a un vendedor registrado definir el SKU, nombre comercial, dimensiones físicas (alto, ancho, largo, peso)
        /// y precio unitario base para su posterior comercialización en el Marketplace.
        /// </remarks>
        /// <param name="command">Datos descriptivos, dimensionales y precio del producto. El VendorId ya no lo decide el cliente: lo fija el token (Q-21b), y un valor en el cuerpo se descarta.</param>
        /// <response code="200">Ficha de producto creada en estado Published (CAT-01, sin aprobación previa). Retorna el productId y los variantIds creados, para que el vendedor pueda dar de alta stock sin releer el producto.</response>
        /// <response code="400">Error de validación si faltan dimensiones o el precio es inválido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpPost("products")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(Zentric.Application.Catalog.Commands.CreatedProductDto), StatusCodes.Status200OK)]
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
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Reactiva un producto suspendido devolviéndolo al estado Published.
        /// </summary>
        /// <remarks>
        /// Un producto recién creado ya nace Published (auto-publicación, CAT-01): este endpoint
        /// deshace una suspensión, volviendo a hacerlo visible en las búsquedas de los compradores
        /// y admitiendo su incorporación a carritos de compra. Publicar uno que ya está publicado
        /// responde 400.
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
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Suspende un producto (Q-25: camino de entrada al estado Suspended).
        /// </summary>
        /// <remarks>
        /// La Ley (ZENTRIC.md Dominio 5) define tres estados: Published, Suspended, Discontinued.
        /// <c>POST /api/catalog/products/{productId}/publish</c> reactiva desde Suspended,
        /// pero no existia el camino inverso. Este endpoint lo provee: un Vendedor puede
        /// suspender su propio producto temporalmente. El producto deja de ser visible
        /// en busquedas y no se puede agregar a carritos. Los pedidos ya pagados y sus
        /// despachos no se tocan.
        /// </remarks>
        /// <param name="productId">Identificador único (Guid) del producto a suspender.</param>
        /// <response code="200">Producto suspendido exitosamente.</response>
        /// <response code="400">Error si el producto no existe o ya esta suspendido (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o invalido.</response>
        /// <response code="403">El llamante no es el vendedor del producto (política ProductManagement).</response>
        /// <response code="404">Producto no encontrado.</response>
        [HttpPost("products/{productId}/suspend")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SuspendProduct(Guid productId)
        {
            var result = await _mediator.Send(new SuspendProductCommand(productId));
            if (result.IsFailure) return result.ToProblem();
            return Ok();
        }

        /// <summary>
        /// Obtiene el catálogo de productos registrados, con filtro opcional por vendedor.
        /// </summary>
        /// <remarks>
        /// El catálogo comercial sólo muestra productos <c>Published</c> (Q-27). La única
        /// excepción es el Vendedor que pide su propio <c>VendorId</c>: esa es su vista de
        /// gestión y sí refleja los suspendidos, porque si no no podría reactivarlos con
        /// <c>publish</c>.
        /// </remarks>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <param name="category">Filtro opcional por categoría del producto.</param>
        /// <response code="200">Lista de productos obtenida exitosamente.</response>
        [HttpGet("products")]
        [HttpGet("/api/products")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProducts(
            [FromQuery] Guid? vendorId = null,
            [FromQuery] string? category = null)
        {
            // Q-27 (Q22=B): la identidad viene del token y decide qué se ve. Pedir el
            // propio vendorId es la vista de gestión del dueno; cualquier otro filtro
            // (incluido ninguno) es el catálogo comercial, sólo Published.
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new GetProductsQuery(vendorId, userId.Value, category));
            return Ok(result.Value);
        }


        /// <summary>
        /// Lista el catalogo por paginas. Es la variante recomendada para el
        /// frontend: <c>size</c> se acota en 100 y por defecto trae 20 elementos.
        /// </summary>
        /// <remarks>
        /// Comparte con <c>GET products</c> la regla de visibilidad: sólo <c>Published</c>,
        /// salvo el <c>VendorId</c> propio del llamante (vista de gestión).
        ///
        /// Los filtros del comprador (S3) operan sobre TODO el catalogo, no sobre la
        /// pagina: <c>search</c>, <c>sort</c> y <c>type</c> se aplican antes del conteo
        /// y la paginacion, para que <c>totalItems</c> y <c>totalPages</c> cuadren.
        /// </remarks>
        /// <param name="vendorId">Filtro opcional por identificador único del vendedor.</param>
        /// <param name="page">Página basada en cero (primera página = 0).</param>
        /// <param name="size">Tamaño de página (1..100, por defecto 20).</param>
        /// <param name="category">Filtro opcional por categoría del producto.</param>
        /// <param name="search">Búsqueda opcional por nombre o descripción, insensible a mayúsculas. Vacío o ausente no filtra.</param>
        /// <param name="sort">Orden: <c>relevance</c> (por defecto, fecha de creación ascendente), <c>price-asc</c> o <c>price-desc</c>. Un valor fuera de esos tres responde 400.</param>
        /// <param name="type">Tipo de producto: <c>Physical</c> o <c>Digital</c>. Un valor fuera de esos dos responde 400.</param>
        /// <response code="200">Página de productos con metadatos de paginación.</response>
        /// <response code="400">Algún filtro tiene un valor fuera del contrato (RFC 7807 ProblemDetails).</response>
        [HttpGet("products/paged")]
        [HttpGet("/api/products/paged")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(PagedResult<ProductDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetProductsPaged(
            [FromQuery] Guid? vendorId = null,
            [FromQuery] int page = 1,
            [FromQuery] int size = PageRequest.DefaultPageSize,
            [FromQuery] string? category = null,
            [FromQuery] string? search = null,
            [FromQuery] string? sort = null,
            [FromQuery] string? type = null)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var zeroBasedPage = page > 0 ? page - 1 : 0;
            var result = await _mediator.Send(new GetProductsPagedQuery(
                vendorId, userId.Value, zeroBasedPage, size, category, search, sort, type));

            // El validador del caso de uso puede fallar (sort/type fuera del contrato):
            // sin esta guarda result.Value lanzaria y el 400 prometido se volveria 500.
            if (result.IsFailure) return result.ToProblem();

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
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene las categorías con conteo de productos publicados.
        /// Solo devuelve categorías que tienen al menos 1 producto publicado.
        /// </summary>
        /// <response code="200">Lista de categorías con conteo.</response>
        [HttpGet("categories")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var result = await _mediator.Send(new GetCategoriesQuery());
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene una muestra aleatoria de productos publicados para el hero/mosaico.
        /// </summary>
        /// <param name="count">Número de productos a devolver (por defecto 6).</param>
        /// <response code="200">Lista de productos aleatorios.</response>
        [HttpGet("products/hero")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetHeroProducts([FromQuery] int count = 6)
        {
            var result = await _mediator.Send(new GetHeroProductsQuery(count));
            return Ok(result.Value);
        }
    }
}
