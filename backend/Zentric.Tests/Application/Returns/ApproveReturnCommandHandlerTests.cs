using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Application.Returns
{
    /// <summary>
    /// Productos en memoria. Q-21b: la aprobacion de una devolucion es del
    /// vendedor cuyo producto se devuelve, y eso se comprueba contra el
    /// VendorId del producto de la variante.
    /// </summary>
    public class FakeProductRepository : IProductRepository
    {
        public Dictionary<Guid, Product> ByVariant { get; } = new();

        public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult(ByVariant.TryGetValue(variantId, out var product) ? product : null);

        public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult<Product?>(null);

        public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
            => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult(((IReadOnlyList<Product>)Array.Empty<Product>(), 0));

        public Task AddAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
    public class ApproveReturnCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_ApprovesAndSaves()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var service = new ReturnsApprovalService();
            var products = new FakeProductRepository();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service, products);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returnReq.InspectByLogistics(true);
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, false, vendorId, UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            
            var savedReq = await repository.GetByIdAsync(returnReq.Id);
            Assert.NotNull(savedReq);
            Assert.Equal(ReturnStatus.Approved, savedReq.Status);
            Assert.True(savedReq.VendorApproved);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_InvalidCondition_ReturnsFailure()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var service = new ReturnsApprovalService();
            var products = new FakeProductRepository();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service, products);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            // Not inspected by logistics
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, false, vendorId, UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("inspected as good condition", result.Error);
        }

        [Fact]
        public async Task Handle_ForeignSeller_CannotApproveAnotherSellersReturn()
        {
            // Q-21b: antes, cualquier Seller aprobaba cualquier devolucion con solo
            // conocer su GUID, y la aprobacion dispara el reingreso del stock.
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var products = new FakeProductRepository();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, new ReturnsApprovalService(), products);

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), Guid.NewGuid(), ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returnReq.InspectByLogistics(true);
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, false, Guid.NewGuid(), UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Return request not found.", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }
    }
}
