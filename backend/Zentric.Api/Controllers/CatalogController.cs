using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Common.Messaging;
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
        /// Crea una nueva ficha técnica de producto que nace publicada (auto-publicación, CA).
        /// </summary>
        /// <remarks>
        /// Permite a un vendedor registrado definir el SKU, nombre comercial, dimensiones físicas (alto, ancho, largo, peso)
        /// y precio unitario base para su posterior comercialización en el Marketplace.
        /// </remarks>
        /// <param name="command">Datos descriptivos, dimensionales y precio del producto. El VendorId ya no lo decide el cliente: lo fija el token, y un valor en el cuerpo se descarta.</param>
        /// <response code="200">Ficha de producto creada en estado Published (CA, sin aprobación previa). Retorna el productId y los variantIds creados, para que el vendedor pueda dar de alta stock sin releer el producto.</response>
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

            // El vendedor es el llamante. Un VendorId en el cuerpo se
            // descarta: registrar producto a nombre de otro corromperia el split
            // de facturacion y no se podria corregir despues.
            var result = await _mediator.Send(command with { VendorId = userId.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Agrega una nueva variante (SKU) a un producto existente del vendedor.
        /// </summary>
        /// <remarks>
        /// Permite al vendedor crear variantes con precio propio sobre un producto ya
        /// creado, sin tener que recrear la ficha. El VariantId resultante es la clave
        /// con la que se abastece inventario.
        /// </remarks>
        /// <param name="productId">Identificador del producto.</param>
        /// <param name="request">Datos del SKU, atributos y precio opcional.</param>
        /// <response code="200">Variante creada. Retorna el variantId.</response>
        /// <response code="400">Error de validación.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Producto no encontrado o ajeno.</response>
        [HttpPost("products/{productId}/variants")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddProductVariant(Guid productId, [FromBody] AddProductVariantRequest request)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var command = new AddProductVariantCommand(
                productId,
                userId.Value,
                request.Sku,
                request.Attributes ?? new List<VariantAttributeDto>(),
                request.PriceAmount);

            var result = await _mediator.Send(command);
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        /// <summary>
        /// Reactiva un producto suspendido devolviéndolo al estado Published.
        /// </summary>
        /// <remarks>
        /// Un producto recién creado ya nace Published (auto-publicación, CA): este endpoint
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
        /// Suspende un producto (camino de entrada al estado Suspended).
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
        /// Actualiza los datos básicos de un producto del catálogo del vendedor.
        /// </summary>
        /// <remarks>
        /// Permite al vendedor editar nombre, descripción, precio base, imagen y categoría
        /// de un producto propio. El VendorId lo fija el token; no se puede reasignar.
        /// </remarks>
        /// <param name="productId">Identificador del producto a actualizar.</param>
        /// <param name="command">Datos actualizados del producto.</param>
        /// <response code="200">Producto actualizado exitosamente.</response>
        /// <response code="400">Error de validación (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="403">El llamante no es el vendedor del producto.</response>
        /// <response code="404">Producto no encontrado.</response>
        [HttpPut("products/{productId}")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateProduct(Guid productId, [FromBody] UpdateProductCommand command)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(command with { ProductId = productId, CallerId = userId.Value });
            if (result.IsFailure) return result.ToProblem();
            return Ok();
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
        /// Obtiene los productos vistos recientemente por el usuario autenticado.
        /// </summary>
        /// <remarks>
        /// Devuelve hasta 20 productos ordenados por última visualización (más reciente primero).
        /// Solo productos en estado Published que existan actualmente en el catálogo.
        /// </remarks>
        /// <param name="maxItems">Máximo de productos a devolver (1..50, por defecto 20).</param>
        /// <response code="200">Lista de productos vistos recientemente.</response>
        /// <response code="401">Token ausente o inválido.</response>
        [HttpGet("products/recently-viewed")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRecentlyViewed([FromQuery] int maxItems = 20)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            maxItems = Math.Clamp(maxItems, 1, 50);

            var result = await _mediator.Send(new GetRecentlyViewedQuery(userId.Value, maxItems));
            return Ok(result.Value);
        }

        /// <summary>
        /// Registra la visualización de un producto por el usuario autenticado.
        /// </summary>
        /// <remarks>
        /// Actualiza o crea el registro de "vistos recientemente" para el par (UserId, ProductId).
        /// El producto debe existir y estar en estado Published.
        /// </remarks>
        /// <param name="productId">Identificador único (Guid) del producto visualizado.</param>
        /// <response code="204">Visualización registrada.</response>
        /// <response code="401">Token ausente o inválido.</response>
        /// <response code="404">Producto no encontrado o no publicado.</response>
        [HttpPost("products/{productId}/track-view")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> TrackProductView(Guid productId)
        {
            var userId = _currentUser.UserId;
            if (userId is null) return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });

            var result = await _mediator.Send(new TrackProductViewCommand(userId.Value, productId));
            if (result.IsFailure) return result.ToProblem();

            return NoContent();
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
