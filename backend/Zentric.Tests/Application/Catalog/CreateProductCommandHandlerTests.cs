using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;

namespace Zentric.Tests.Application.Catalog
{
    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeProductRepository : IProductRepository
    {
        public List<Product> Products { get; } = new();

        public Task AddAsync(Product product, CancellationToken cancellationToken = default)
        {
            Products.Add(product);
            return Task.CompletedTask;
        }

        public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Products.FirstOrDefault(p => p.Id == id));
        }

        public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Products.FirstOrDefault(p => p.Variants.Any(v => v.Id == variantId)));
        }

        public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
        {
            var res = vendorId.HasValue ? Products.Where(p => p.VendorId == vendorId.Value).ToList() : Products.ToList();
            return Task.FromResult<IReadOnlyList<Product>>(res);
        }

        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
        {
            var existing = Products.FirstOrDefault(p => p.Id == product.Id);
            if (existing != null)
            {
                Products.Remove(existing);
                Products.Add(product);
            }
            return Task.CompletedTask;
        }
    }

    public class CreateProductCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_CreatesProductAndSaves()
        {
            var repository = new FakeProductRepository();
            var unitOfWork = new FakeUnitOfWork();
            var handler = new CreateProductCommandHandler(repository, unitOfWork);

            var command = new CreateProductCommand(
                Name: "Test Product",
                Description: "A great product",
                PriceAmount: 100m,
                PriceCurrency: "USD",
                VendorId: Guid.NewGuid(),
                Type: ProductType.Physical,
                Variants: new List<CreateProductVariantDto>
                {
                    new CreateProductVariantDto("SKU-001", new List<VariantAttributeDto>
                    {
                        new VariantAttributeDto("Color", "Red")
                    })
                }
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.NotEqual(Guid.Empty, result.Value);
            
            var savedProduct = repository.Products.SingleOrDefault(p => p.Id == result.Value);
            Assert.NotNull(savedProduct);
            Assert.Equal("Test Product", savedProduct.Name);
            Assert.True(unitOfWork.SaveChangesCalled);
        }
    }
}
