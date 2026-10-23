using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Tests.Application.Catalog;

namespace Zentric.Tests.Application.Catalog
{
    /// <summary>
    /// Suspender un producto: criterios de aceptacion (camino de entrada a Suspended).
    /// </summary>
    public class SuspendProductCommandHandlerTests
    {
        [Fact]
        public async Task Handle_UnknownProduct_ReturnsNotFound()
        {
            var handler = new SuspendProductCommandHandler(new FakeProductRepository(), new FakeUnitOfWork());

            var result = await handler.Handle(new SuspendProductCommand(Guid.NewGuid()), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact]
        public async Task Handle_PublishedProduct_SuspendsAndSaves()
        {
            var repo = new FakeProductRepository();
            var uow = new FakeUnitOfWork();
            var product = new Product(
                name: "E-book",
                description: "Digital book",
                price: new Money(50m, "COP"),
                vendorId: Guid.NewGuid(),
                type: ProductType.Digital,
                variants: null);
            repo.Products.Add(product);
            var handler = new SuspendProductCommandHandler(repo, uow);

            var result = await handler.Handle(new SuspendProductCommand(product.Id), CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(ProductStatus.Suspended, product.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_AlreadySuspended_ReturnsValidationFailure()
        {
            var repo = new FakeProductRepository();
            var product = new Product(
                name: "E-book",
                description: "Digital book",
                price: new Money(50m, "COP"),
                vendorId: Guid.NewGuid(),
                type: ProductType.Digital,
                variants: null);
            product.Suspend();
            repo.Products.Add(product);
            var handler = new SuspendProductCommandHandler(repo, new FakeUnitOfWork());

            var result = await handler.Handle(new SuspendProductCommand(product.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.Validation, result.ErrorKind);
            Assert.Contains("already suspended", result.Error);
        }

        [Fact]
        public async Task Handle_DeletedProduct_ReturnsValidationFailure()
        {
            var repo = new FakeProductRepository();
            var product = new Product(
                name: "E-book",
                description: "Digital book",
                price: new Money(50m, "COP"),
                vendorId: Guid.NewGuid(),
                type: ProductType.Digital,
                variants: null);
            product.Delete();
            repo.Products.Add(product);
            var handler = new SuspendProductCommandHandler(repo, new FakeUnitOfWork());

            var result = await handler.Handle(new SuspendProductCommand(product.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("deleted", result.Error);
        }
    }
}