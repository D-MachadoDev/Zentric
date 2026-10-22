using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Queries
{
    public record ProductVariantDto(Guid Id, string Sku, bool CanBeSold, int AvailableStock = 0);

    public record ProductDto(
        Guid Id,
        string Name,
        string Description,
        decimal Price,
        string Currency,
        Guid VendorId,
        string Type,
        string Status,
        IReadOnlyList<ProductVariantDto> Variants,
        DateTime CreatedAt,
        string? ImageUrl = null,
        string? Category = null);

    /// <summary>
    /// Visibilidad del catalogo (Q-27, dictamen Q22=B).
    ///
    /// ZENTRIC.md:101: "Publicacion: los productos se hacen visibles en el catalogo
    /// publico", de modo que el listado solo refleja <c>Published</c>. La unica
    /// excepcion es quien pide su propio <c>VendorId</c>: si tambien se le ocultaran
    /// sus productos, suspender seria un callejon sin salida porque <c>publish</c>
    /// (Q-25) exige encontrar antes el producto, y no existe listado de "mis
    /// productos".
    ///
    /// <c>null</c> significa "sin filtro de estado": la vista de gestion del dueno.
    /// </summary>
    internal static class CatalogVisibility
    {
        internal static ProductStatus? VisibleStatus(Guid? vendorId, Guid callerId)
            => vendorId.HasValue && vendorId.Value == callerId ? null : ProductStatus.Published;
    }

    public record GetProductsQuery(Guid? VendorId, Guid CallerId, string? Category = null) : IRequest<Result<IReadOnlyList<ProductDto>>>;

    public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, Result<IReadOnlyList<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository _inventoryRepository;

        public GetProductsQueryHandler(IProductRepository productRepository, IInventoryRepository inventoryRepository)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<IReadOnlyList<ProductDto>>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
        {
            var list = await _productRepository.GetAllAsync(
                request.VendorId,
                CatalogVisibility.VisibleStatus(request.VendorId, request.CallerId),
                request.Category,
                cancellationToken);

            var dtos = new List<ProductDto>();
            foreach (var p in list)
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants)
                {
                    var stock = await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken);
                    variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock));
                }

                dtos.Add(new ProductDto(
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price.Amount,
                    p.Price.Currency,
                    p.VendorId,
                    p.Type.ToString(),
                    p.Status.ToString(),
                    variantDtos,
                    p.CreatedAt,
                    p.ImageUrl,
                    p.Category
                ));
            }

            return Result<IReadOnlyList<ProductDto>>.Success(dtos);
        }
    }

    public record GetProductByIdQuery(Guid Id) : IRequest<Result<ProductDto>>;

    public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, Result<ProductDto>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository _inventoryRepository;

        public GetProductByIdQueryHandler(IProductRepository productRepository, IInventoryRepository inventoryRepository)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<ProductDto>> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
        {
            var p = await _productRepository.GetByIdAsync(request.Id, cancellationToken);
            if (p == null)
            {
                return Result<ProductDto>.NotFound("Product not found.");
            }

            var variantDtos = new List<ProductVariantDto>();
            foreach (var v in p.Variants)
            {
                var stock = _inventoryRepository != null
                    ? await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken)
                    : 0;
                variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock));
            }

            var dto = new ProductDto(
                p.Id,
                p.Name,
                p.Description,
                p.Price.Amount,
                p.Price.Currency,
                p.VendorId,
                p.Type.ToString(),
                p.Status.ToString(),
                variantDtos,
                p.CreatedAt,
                p.ImageUrl,
                p.Category
            );

            return Result<ProductDto>.Success(dto);
        }
    }

    /// <summary>
    /// Filtros opcionales del listado paginado del comprador (S3): busqueda por texto,
    /// orden y tipo. Concentra aqui la traduccion entre el contrato HTTP (cadenas) y los
    /// tipos del dominio, de modo que el repositorio no compare cadenas magicas y el
    /// validador use exactamente los mismos criterios.
    /// </summary>
    internal static class ProductPagedFilters
    {
        internal const string Relevance = "relevance";
        internal const string PriceAsc = "price-asc";
        internal const string PriceDesc = "price-desc";

        internal const string Physical = "Physical";
        internal const string Digital = "Digital";

        /// <summary>Valor de <c>sort</c> admitido (comparacion recortada e insensible a mayusculas).</summary>
        internal static bool IsSupportedSort(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return false;
            var value = raw.Trim();
            return value.Equals(Relevance, StringComparison.OrdinalIgnoreCase)
                || value.Equals(PriceAsc, StringComparison.OrdinalIgnoreCase)
                || value.Equals(PriceDesc, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Valor de <c>type</c> admitido. Se comparan los nombres exactos del contrato
        /// (Fisico/Digital tal como se serializa <see cref="ProductType"/>) y no con
        /// <c>Enum.TryParse</c>, que aceptaria numeros ("1") fuera del contrato.
        /// </summary>
        internal static bool IsSupportedType(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return false;
            var value = raw.Trim();
            return value.Equals(Physical, StringComparison.OrdinalIgnoreCase)
                || value.Equals(Digital, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Traduce el <c>sort</c> del contrato a su orden; ausente o desconocido cae a relevance.</summary>
        internal static ProductSort ParseSort(string? raw)
        {
            var value = raw?.Trim();
            if (string.Equals(value, PriceAsc, StringComparison.OrdinalIgnoreCase)) return ProductSort.PriceAsc;
            if (string.Equals(value, PriceDesc, StringComparison.OrdinalIgnoreCase)) return ProductSort.PriceDesc;
            return ProductSort.Relevance;
        }

        /// <summary>Traduce el <c>type</c> del contrato; ausente o desconocido no filtra.</summary>
        internal static ProductType? ParseType(string? raw)
        {
            var value = raw?.Trim();
            if (string.Equals(value, Physical, StringComparison.OrdinalIgnoreCase)) return ProductType.Physical;
            if (string.Equals(value, Digital, StringComparison.OrdinalIgnoreCase)) return ProductType.Digital;
            return null;
        }
    }

    /// <summary>
    /// Listado paginado del catalogo. Los parametros se acotan en <see cref="PageRequest"/>,
    /// de modo que un cliente no puede pedir la tabla completa de un golpe.
    ///
    /// Comparte con el listado sin paginar la regla de <see cref="CatalogVisibility"/>:
    /// el estado visible baja al repositorio porque el total se cuenta antes del
    /// <c>Skip/Take</c>.
    ///
    /// <c>Search</c>, <c>Sort</c> y <c>Type</c> son los filtros del comprador (S3); llegan
    /// como cadenas crudas del borde y los normaliza <see cref="ProductPagedFilters"/>.
    /// </summary>
    public record GetProductsPagedQuery(
        Guid? VendorId,
        Guid CallerId,
        int Page = 0,
        int Size = PageRequest.DefaultPageSize,
        string? Category = null,
        string? Search = null,
        string? Sort = null,
        string? Type = null)
        : IRequest<Result<PagedResult<ProductDto>>>;

    public class GetProductsPagedQueryHandler : IRequestHandler<GetProductsPagedQuery, Result<PagedResult<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository? _inventoryRepository;

        public GetProductsPagedQueryHandler(IProductRepository productRepository, IInventoryRepository? inventoryRepository = null)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<PagedResult<ProductDto>>> Handle(
            GetProductsPagedQuery request, CancellationToken cancellationToken)
        {
            var page = new PageRequest(request.Page, request.Size);

            var status = CatalogVisibility.VisibleStatus(request.VendorId, request.CallerId);
            var search = string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim();
            var sort = ProductPagedFilters.ParseSort(request.Sort);
            var type = ProductPagedFilters.ParseType(request.Type);

            var (products, total) = await GetPageAsync(request, status, page, search, sort, type, cancellationToken);

            var dtos = new List<ProductDto>();
            foreach (var p in products)
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants ?? Enumerable.Empty<ProductVariant>())
                {
                    var stock = await _inventoryRepository!.GetTotalAvailableStockAsync(v.Id, cancellationToken);
                    variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock));
                }

                dtos.Add(new ProductDto(
                    p.Id, p.Name, p.Description, p.Price.Amount, p.Price.Currency, p.VendorId,
                    p.Type.ToString(), p.Status.ToString(), variantDtos,
                    p.CreatedAt,
                    p.ImageUrl,
                    p.Category
                ));
            }

            return Result<PagedResult<ProductDto>>.Success(
                new PagedResult<ProductDto>(dtos, page.Page, page.Size, total));
        }

        /// <summary>
        /// Baja al repositorio con la pagina y los filtros ya normalizados. Sin filtros
        /// nuevos (S3) usa el overload categorico de siempre, que es el contrato que ya
        /// consumen los dobles de prueba; con busqueda, orden no-relevancia o tipo usa el
        /// overload extendido. Ambas rutas comparten la regla de visibilidad y el conteo
        /// previo al Skip/Take.
        /// </summary>
        private Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPageAsync(
            GetProductsPagedQuery request,
            ProductStatus? status,
            PageRequest page,
            string? search,
            ProductSort sort,
            ProductType? type,
            CancellationToken cancellationToken)
            => search is null && sort == ProductSort.Relevance && type is null
                ? _productRepository.GetPagedAsync(
                    request.VendorId, status, page.Skip, page.Take, request.Category, cancellationToken)
                : _productRepository.GetPagedAsync(
                    request.VendorId, status, page.Skip, page.Take, request.Category, search, sort, type, cancellationToken);
    }

    // =========================================================================
    // NUEVAS QUERIES PARA CATEGORÍAS DINÁMICAS Y HERO MOSAICO
    // =========================================================================

    /// <summary>
    /// Obtiene las categorías con conteo de productos publicados.
    /// Solo devuelve categorías que tienen al menos 1 producto publicado.
    /// </summary>
    public record GetCategoriesQuery() : IRequest<Result<IReadOnlyList<CategoryDto>>>;

    public record CategoryDto(string Id, string Name, int ProductCount);

    public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, Result<IReadOnlyList<CategoryDto>>>
    {
        private readonly IProductRepository _productRepository;

        public GetCategoriesQueryHandler(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<Result<IReadOnlyList<CategoryDto>>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
        {
            var domainCategories = await _productRepository.GetCategoriesWithCountAsync(cancellationToken);
            var appCategories = domainCategories.Select(c => new CategoryDto(c.Id, c.Name, c.ProductCount)).ToList();
            return Result<IReadOnlyList<CategoryDto>>.Success(appCategories);
        }
    }

    /// <summary>
    /// Obtiene una muestra aleatoria de productos publicados para el hero/mosaico.
    /// </summary>
    public record GetHeroProductsQuery(int Count = 6) : IRequest<Result<IReadOnlyList<ProductDto>>>;

    public class GetHeroProductsQueryHandler : IRequestHandler<GetHeroProductsQuery, Result<IReadOnlyList<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository? _inventoryRepository;

        public GetHeroProductsQueryHandler(IProductRepository productRepository, IInventoryRepository? inventoryRepository = null)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<IReadOnlyList<ProductDto>>> Handle(GetHeroProductsQuery request, CancellationToken cancellationToken)
        {
            var products = await _productRepository.GetHeroProductsAsync(request.Count, cancellationToken);

            var dtos = new List<ProductDto>();
            foreach (var p in products)
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants ?? Enumerable.Empty<ProductVariant>())
                {
                    var stock = await _inventoryRepository!.GetTotalAvailableStockAsync(v.Id, cancellationToken);
                    variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock));
                }

                dtos.Add(new ProductDto(
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price.Amount,
                    p.Price.Currency,
                    p.VendorId,
                    p.Type.ToString(),
                    p.Status.ToString(),
                    variantDtos,
                    p.CreatedAt,
                    p.ImageUrl,
                    p.Category
                ));
            }

            return Result<IReadOnlyList<ProductDto>>.Success(dtos);
        }
    }
}
