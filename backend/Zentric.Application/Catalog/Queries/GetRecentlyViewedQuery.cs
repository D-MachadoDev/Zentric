using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Inventories.Ports;

namespace Zentric.Application.Catalog.Queries
{
    public record GetRecentlyViewedQuery(Guid CallerId, int MaxItems = 20) : IRequest<Result<IReadOnlyList<ProductDto>>>;

    public class GetRecentlyViewedQueryHandler : IRequestHandler<GetRecentlyViewedQuery, Result<IReadOnlyList<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUserRecentlyViewedRepository _recentlyViewedRepository;

        public GetRecentlyViewedQueryHandler(
            IProductRepository productRepository,
            IInventoryRepository inventoryRepository,
            IUserRecentlyViewedRepository recentlyViewedRepository)
        {
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
            _recentlyViewedRepository = recentlyViewedRepository;
        }

        public async Task<Result<IReadOnlyList<ProductDto>>> Handle(GetRecentlyViewedQuery request, CancellationToken cancellationToken)
        {
            var recentEntries = await _recentlyViewedRepository.GetByUserIdAsync(request.CallerId, request.MaxItems, cancellationToken);

            if (recentEntries.Count == 0)
            {
                return Result<IReadOnlyList<ProductDto>>.Success(Array.Empty<ProductDto>());
            }

            var productIds = recentEntries.Select(e => e.ProductId).ToList();
            var products = await _productRepository.GetAllAsync(vendorId: null, status: ProductStatus.Published, cancellationToken);
            var productMap = products.Where(p => productIds.Contains(p.Id)).ToDictionary(p => p.Id);

            var dtos = new List<ProductDto>();
            foreach (var entry in recentEntries)
            {
                if (productMap.TryGetValue(entry.ProductId, out var product))
                {
                    var variantDtos = new List<ProductVariantDto>();
                    foreach (var v in product.Variants)
                    {
                        var stock = await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken);
                        var attrs = v.Attributes?.Select(a => new ProductVariantAttributeDto(a.Name, a.Value)).ToList();
                        var effectivePrice = v.PriceAmount ?? product.Price.Amount;
                        variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock, attrs, effectivePrice));
                    }

                    dtos.Add(new ProductDto(
                        product.Id,
                        product.Name,
                        product.Description,
                        product.Price.Amount,
                        product.Price.Currency,
                        product.VendorId,
                        product.Type.ToString(),
                        product.Status.ToString(),
                        variantDtos,
                        product.CreatedAt,
                        product.ImageUrl,
                        product.Category));
                }
            }

            return Result<IReadOnlyList<ProductDto>>.Success(dtos);
        }
    }
}