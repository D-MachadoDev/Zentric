using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;

namespace Zentric.Tests.Application.Catalog
{
    public class PublishProductCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_PublishesProductAndSaves()
        {
            var repository = new FakeProductRepository();
            var unitOfWork = new FakeUnitOfWork();

            var product = new Product(
                name: "Camiseta",
                description: "Camiseta de algodón",
                price: new Zentric.Domain.Products.ValueObjects.Money(50m, "COP"),
                vendorId: Guid.NewGuid(),
                type: ProductType.Digital,
                variants: null
            );

            // Temporarily suspend it to be able to test publishing (it starts Published initially by default)
            product.Suspend();
            repository.Products.Add(product);

            var handler = new PublishProductCommandHandler(repository, unitOfWork);
            var command = new PublishProductCommand(product.Id);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            var updatedProduct = await repository.GetByIdAsync(product.Id);
            Assert.Equal(ProductStatus.Published, updatedProduct!.Status);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_ProductNotFound_ReturnsFailure()
        {
            var repository = new FakeProductRepository();
            var unitOfWork = new FakeUnitOfWork();
            var handler = new PublishProductCommandHandler(repository, unitOfWork);
            var command = new PublishProductCommand(Guid.NewGuid());

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal("Product not found.", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        /// <summary>
        /// El XML doc de <c>CatalogController.PublishProduct</c> promete 400
        /// para "ya publicado". Sin
        /// el capturador del handler, la guarda del agregado subia al middleware
        /// global y respondia 500: un contrato roto que ningun test cubria.
        /// </summary>
        [Fact]
        public async Task Handle_ProductAlreadyPublished_ReturnsValidationFailure()
        {
            var repository = new FakeProductRepository();
            var unitOfWork = new FakeUnitOfWork();

            // Un producto recien creado ya nace Published (CAT-01).
            var product = new Product(
                name: "Camiseta",
                description: "Camiseta de algodon",
                price: new Zentric.Domain.Products.ValueObjects.Money(50m, "COP"),
                vendorId: Guid.NewGuid(),
                type: ProductType.Digital,
                variants: null
            );
            repository.Products.Add(product);

            var handler = new PublishProductCommandHandler(repository, unitOfWork);

            var result = await handler.Handle(new PublishProductCommand(product.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.Validation, result.ErrorKind);
            Assert.Contains("already published", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }
    }
}
