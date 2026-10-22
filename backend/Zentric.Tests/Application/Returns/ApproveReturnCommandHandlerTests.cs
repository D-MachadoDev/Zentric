using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

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

        public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
            => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult(((IReadOnlyList<Product>)Array.Empty<Product>(), 0));

        public Task<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>>(Array.Empty<Zentric.Domain.Products.Ports.CategoryDto>());

        public Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Product>>(Array.Empty<Product>());

        public Task AddAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
    /// <summary>
    /// Bodegas en memoria: ADR-0018 exige que el lugar de recepcion se compruebe
    /// contra datos del servidor, no contra lo que declare el cliente.
    /// </summary>
    public class FakeWarehouseRepositoryForReturns : IWarehouseRepository
    {
        public List<Warehouse> Warehouses { get; } = new();

        public void Add(Warehouse warehouse) => Warehouses.Add(warehouse);

        public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Warehouses.FirstOrDefault(w => w.Id == id));

        public Task<IReadOnlyList<Warehouse>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Warehouse>>(new List<Warehouse>());

        public Task<(IReadOnlyList<Warehouse> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult<(IReadOnlyList<Warehouse>, int)>((new List<Warehouse>(), 0));

        public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default) => Task.CompletedTask;
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
            var warehouses = new FakeWarehouseRepositoryForReturns();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service, products, warehouses);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returnReq.InspectByLogistics(true);
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, vendorId, UserRole.Seller);

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
            var warehouses = new FakeWarehouseRepositoryForReturns();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service, products, warehouses);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            // Not inspected by logistics
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, vendorId, UserRole.Seller);

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
            var warehouses = new FakeWarehouseRepositoryForReturns();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, new ReturnsApprovalService(), products, warehouses);

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), Guid.NewGuid(), ProductType.Digital, null);
            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returnReq.InspectByLogistics(true);
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, Guid.NewGuid(), UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Return request not found.", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        /// <summary>
        /// ADR-0018: la devolucion sin inspeccion se aprueba SOLO si se recibe en una
        /// bodega del propio vendedor (quien recibe responde por la mercancia). El
        /// cliente ya no manda el flag: lo deduce el servidor.
        /// </summary>
        [Fact]
        public async Task Handle_NotInspected_ApprovedWhenReceptionIsTheVendorsOwnWarehouse()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var products = new FakeProductRepository();
            var warehouses = new FakeWarehouseRepositoryForReturns();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, new ReturnsApprovalService(), products, warehouses);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);

            var ownWarehouse = new Warehouse("Bodega propia", "Bogota", 10, WarehouseType.Vendor, vendorId);
            warehouses.Add(ownWarehouse);

            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, ownWarehouse.Id, 1, ProductType.Physical);
            await repository.AddAsync(returnReq);

            var result = await handler.Handle(new ApproveReturnCommand(returnReq.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            var saved = await repository.GetByIdAsync(returnReq.Id);
            Assert.Equal(ReturnStatus.Approved, saved!.Status);
        }

        /// <summary>
        /// Y al reves: una devolucion sin inspeccion que se recibe en OTRA bodega (la
        /// de Zentric o la de otro vendedor) no se puede aprobar sola. Antes el
        /// cliente mandaba isSameWarehouseAndVendor=true y esquivaba la inspeccion.
        /// </summary>
        [Fact]
        public async Task Handle_NotInspected_FailsWhenReceptionIsNotTheVendorsWarehouse()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var products = new FakeProductRepository();
            var warehouses = new FakeWarehouseRepositoryForReturns();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, new ReturnsApprovalService(), products, warehouses);

            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);

            var hub = new Warehouse("Hub Zentric", "Bogota", 50, WarehouseType.Marketplace, null);
            warehouses.Add(hub);

            var returnReq = new ReturnRequest(Guid.NewGuid(), variantId, hub.Id, 1, ProductType.Physical);
            await repository.AddAsync(returnReq);

            var result = await handler.Handle(new ApproveReturnCommand(returnReq.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("inspected as good condition", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }
    }

    public class FakeReturnRequestRepository : IReturnRequestRepository
    {
        public List<ReturnRequest> Requests { get; } = new();
            public Task<IReadOnlyList<ReturnRequest>> GetListAsync(
                Guid? buyerId, Guid? vendorId, ReturnStatus? status, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<ReturnRequest>>(new List<ReturnRequest>());

        public Task<IReadOnlyList<ReturnRequest>> GetByOrderIdAsync(Guid customerOrderId, CancellationToken cancellationToken = default)
        {
            var result = Requests.Where(r => r.CustomerOrderId == customerOrderId).ToList();
            return Task.FromResult<IReadOnlyList<ReturnRequest>>(result);
        }

        public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            Requests.Add(request);
            return Task.CompletedTask;
        }

        public Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Requests.FirstOrDefault(r => r.Id == id));
        }

        public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            var existing = Requests.FirstOrDefault(r => r.Id == request.Id);
            if (existing != null)
            {
                Requests.Remove(existing);
                Requests.Add(request);
            }
            return Task.CompletedTask;
        }
    }

    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }
}
