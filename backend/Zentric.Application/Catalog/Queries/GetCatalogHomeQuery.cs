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
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Catalog.Queries
{
    public record HomeBannerDto(
        Guid Id,
        string Title,
        string Subtitle,
        string ImageUrl,
        string LinkUrl,
        string ButtonText,
        string? Badge = null);

    public record OfficialStoreDto(
        Guid Id,
        Guid UserId,
        string StoreName,
        string? LogoUrl,
        bool IsVerified);

    public record CategorySummaryDto(
        string Name,
        string? ImageUrl,
        int ProductCount);

    public record CatalogHomeDto(
        IReadOnlyList<HomeBannerDto> Banners,
        IReadOnlyList<CategorySummaryDto> Categories,
        IReadOnlyList<OfficialStoreDto> OfficialStores,
        IReadOnlyList<ProductDto> FeaturedProducts);

    public record GetCatalogHomeQuery() : IRequest<Result<CatalogHomeDto>>;

    public class GetCatalogHomeQueryHandler : IRequestHandler<GetCatalogHomeQuery, Result<CatalogHomeDto>>
    {
        private readonly ISellerProfileRepository _sellerProfileRepository;
        private readonly IProductRepository _productRepository;
        private readonly IInventoryRepository _inventoryRepository;

        public GetCatalogHomeQueryHandler(
            ISellerProfileRepository sellerProfileRepository,
            IProductRepository productRepository,
            IInventoryRepository inventoryRepository)
        {
            _sellerProfileRepository = sellerProfileRepository;
            _productRepository = productRepository;
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<CatalogHomeDto>> Handle(GetCatalogHomeQuery request, CancellationToken cancellationToken)
        {
            // 1. Curated Hero Banners
            var banners = new List<HomeBannerDto>
            {
                new(
                    Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    "Auriculares Noise-Canceling",
                    "Experiencia auditiva de estudio sin cables",
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
                    "/catalog?category=Audio",
                    "Shop Now",
                    "NUEVO LANZAMIENTO"),
                new(
                    Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    "Temporada Pro Gaming",
                    "Monitores ultrarrápidos y periféricos mecánicos",
                    "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&q=80",
                    "/catalog?category=Computación",
                    "Explorar Setup",
                    "HASTA 30% OFF")
            };

            // 2. Official Stores (verified sellers)
            var verifiedSellers = await _sellerProfileRepository.GetVerifiedSellersAsync(12, cancellationToken);
            var officialStores = verifiedSellers.Select(s => new OfficialStoreDto(
                s.Id,
                s.UserId,
                s.StoreName,
                s.LogoUrl,
                s.IsVerified)).ToList();

            // 3. Featured / Best Seller Products
            var allProducts = await _productRepository.GetAllAsync(null, ProductStatus.Published, cancellationToken);
            var publishedProducts = allProducts.Where(p => p.CanBeSold).ToList();

            var featuredProductDtos = new List<ProductDto>();
            foreach (var p in publishedProducts.Take(12))
            {
                var variantDtos = new List<ProductVariantDto>();
                foreach (var v in p.Variants)
                {
                    var stock = await _inventoryRepository.GetTotalAvailableStockAsync(v.Id, cancellationToken);
                    var attrs = v.Attributes?.Select(a => new ProductVariantAttributeDto(a.Name, a.Value)).ToList();
                    var effectivePrice = v.PriceAmount ?? p.Price.Amount;
                    variantDtos.Add(new ProductVariantDto(v.Id, v.Sku, v.CanBeSold, stock, attrs, effectivePrice));
                }

                featuredProductDtos.Add(new ProductDto(
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
                    p.Category,
                    p.AverageRating,
                    p.ReviewsCount));
            }

            // 4. Categories with Product Count
            var categoryLookup = publishedProducts
                .Where(p => !string.IsNullOrWhiteSpace(p.Category))
                .GroupBy(p => p.Category!.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => (Count: g.Count(), SampleImage: g.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.ImageUrl))?.ImageUrl));

            var categories = categoryLookup.Select(kv => new CategorySummaryDto(
                kv.Key,
                kv.Value.SampleImage,
                kv.Value.Count)).OrderByDescending(c => c.ProductCount).ToList();

            return Result<CatalogHomeDto>.Success(new CatalogHomeDto(banners, categories, officialStores, featuredProductDtos));
        }
    }
}
