using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Queries;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;

namespace Zentric.Tests.Application.Catalog
{
    public class FakeSellerProfileRepository : ISellerProfileRepository
    {
        public List<SellerProfile> Profiles { get; } = new();

        public Task<SellerProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(Profiles.FirstOrDefault(p => p.UserId == userId));

        public Task<SellerProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Profiles.FirstOrDefault(p => p.Id == id));

        public Task<IReadOnlyList<SellerProfile>> GetVerifiedSellersAsync(int limit = 10, CancellationToken cancellationToken = default)
        {
            var verified = Profiles.Where(p => p.IsVerified).Take(limit).ToList();
            return Task.FromResult<IReadOnlyList<SellerProfile>>(verified);
        }

        public Task AddAsync(SellerProfile profile, CancellationToken cancellationToken = default)
        {
            Profiles.Add(profile);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(SellerProfile profile, CancellationToken cancellationToken = default)
        {
            var index = Profiles.FindIndex(p => p.Id == profile.Id);
            if (index >= 0) Profiles[index] = profile;
            return Task.CompletedTask;
        }
    }

    public class FakeInventoryRepoForCatalogHome : IInventoryRepository
    {
        public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult(10);

        public Task<IReadOnlyList<Zentric.Domain.Inventories.Inventory>> GetListAsync(Guid? vendorId, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Zentric.Domain.Inventories.Inventory>>(new List<Zentric.Domain.Inventories.Inventory>());
        public Task AddAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<Zentric.Domain.Inventories.Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);
        public Task<IEnumerable<Zentric.Domain.Inventories.Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default) => Task.FromResult<IEnumerable<Zentric.Domain.Inventories.Inventory>>(new List<Zentric.Domain.Inventories.Inventory>());
        public Task<Zentric.Domain.Inventories.Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default) => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);
        public Task UpdateAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<Zentric.Domain.Inventories.Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task SaveAdjustmentAsync(Zentric.Domain.Inventories.Inventory inventory, Zentric.Domain.Inventories.StockAdjustmentRecord record, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    public class GetCatalogHomeQueryHandlerTests
    {
        [Fact]
        public async Task Handle_ReturnsBannersOfficialStoresAndCategories()
        {
            var sellerRepo = new FakeSellerProfileRepository();
            var productRepo = new FakeProductRepository();
            var inventoryRepo = new FakeInventoryRepoForCatalogHome();

            var verifiedSeller = new SellerProfile(Guid.NewGuid(), "Sony Official", "https://r2.zentric.com/sony.png", isVerified: true);
            var unverifiedSeller = new SellerProfile(Guid.NewGuid(), "Random Seller", null, isVerified: false);
            await sellerRepo.AddAsync(verifiedSeller);
            await sellerRepo.AddAsync(unverifiedSeller);

            var product = new Product("Camara Alpha", "Sensor Full Frame", new Money(1500000m, "COP"), verifiedSeller.UserId, ProductType.Digital, category: "Fotografía");
            product.ApplyReview(5);
            await productRepo.AddAsync(product);

            var handler = new GetCatalogHomeQueryHandler(sellerRepo, productRepo, inventoryRepo);
            var result = await handler.Handle(new GetCatalogHomeQuery(), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var homeData = result.Value;

            // Banners
            Assert.NotEmpty(homeData.Banners);

            // Official stores
            Assert.Single(homeData.OfficialStores);
            Assert.Equal("Sony Official", homeData.OfficialStores[0].StoreName);
            Assert.True(homeData.OfficialStores[0].IsVerified);

            // Featured products
            Assert.Single(homeData.FeaturedProducts);
            Assert.Equal("Camara Alpha", homeData.FeaturedProducts[0].Name);
            Assert.Equal(5.00m, homeData.FeaturedProducts[0].AverageRating);
            Assert.Equal(1, homeData.FeaturedProducts[0].ReviewsCount);

            // Categories
            Assert.Contains(homeData.Categories, c => c.Name == "Fotografía");
        }
    }
}
