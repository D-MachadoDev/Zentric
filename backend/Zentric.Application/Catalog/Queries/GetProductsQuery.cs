using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
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
        string? ImageUrl = null);

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

    public record GetProductsQuery(Guid? VendorId, Guid CallerId) : IRequest<Result<IReadOnlyList<ProductDto>>>;

    public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, Result<IReadOnlyList<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository? _inventoryRepository;

        public GetProductsQueryHandler(IProductRepository productRepository, IInventoryRepository? inventoryRepository = null)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<IReadOnlyList<ProductDto>>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
        {
            var list = await _productRepository.GetAllAsync(
                request.VendorId,
                CatalogVisibility.VisibleStatus(request.VendorId, request.CallerId),
                cancellationToken);

            var dtos = new List<ProductDto>();
            foreach (var p in list)
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants)
                {
                    var stock = _inventoryRepository != null
                        ? await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken)
                        : 0;
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
                    p.ImageUrl
                ));
            }

            return Result<IReadOnlyList<ProductDto>>.Success(dtos);
        }
    }

    public record GetProductByIdQuery(Guid Id) : IRequest<Result<ProductDto>>;

    public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, Result<ProductDto>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository? _inventoryRepository;

        public GetProductByIdQueryHandler(IProductRepository productRepository, IInventoryRepository? inventoryRepository = null)
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
                p.ImageUrl
            );

            return Result<ProductDto>.Success(dto);
        }
    }

    /// <summary>
    /// Listado paginado del catalogo. Los parametros se acotan en <see cref="PageRequest"/>,
    /// de modo que un cliente no puede pedir la tabla completa de un golpe.
    ///
    /// Comparte con el listado sin paginar la regla de <see cref="CatalogVisibility"/>:
    /// el estado visible baja al repositorio porque el total se cuenta antes del
    /// <c>Skip/Take</c>.
    /// </summary>
    public record GetProductsPagedQuery(Guid? VendorId, Guid CallerId, int Page = 0, int Size = PageRequest.DefaultPageSize)
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

            var (products, total) = await _productRepository.GetPagedAsync(
                request.VendorId,
                CatalogVisibility.VisibleStatus(request.VendorId, request.CallerId),
                page.Skip, page.Take, cancellationToken);

            var dtos = new List<ProductDto>();
            foreach (var p in products)
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants)
                {
                    var stock = _inventoryRepository != null
                        ? await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken)
                        : 0;
                    variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock));
                }

                dtos.Add(new ProductDto(
                    p.Id, p.Name, p.Description, p.Price.Amount, p.Price.Currency, p.VendorId,
                    p.Type.ToString(), p.Status.ToString(), variantDtos,
                    p.CreatedAt,
                    p.ImageUrl
                ));
            }

            return Result<PagedResult<ProductDto>>.Success(
                new PagedResult<ProductDto>(dtos, page.Page, page.Size, total));
        }
    }
}
