using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Warehouses.Commands;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Tests.Application.Warehouses
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

    public class FakeWarehouseRepository : IWarehouseRepository
    {
        public List<Warehouse> Warehouses { get; } = new();

        public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            Warehouses.Add(warehouse);
            return Task.CompletedTask;
        }

        public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Warehouses.FirstOrDefault(w => w.Id == id));
        }

        public Task<IReadOnlyList<Warehouse>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
        {
            var res = vendorId.HasValue ? Warehouses.Where(w => w.VendorId == vendorId.Value).ToList() : Warehouses.ToList();
            return Task.FromResult<IReadOnlyList<Warehouse>>(res);
        }

        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    public class CreateWarehouseCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidMarketplaceWarehouse_Succeeds()
        {
            var repo = new FakeWarehouseRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateWarehouseCommandHandler(repo, uow);

            var command = new CreateWarehouseCommand(
                "Central Hub",
                "Calle 10 # 20-30",
                5000,
                WarehouseType.Marketplace,
                null
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Warehouses);
            Assert.Equal("Central Hub", repo.Warehouses[0].Name);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_MarketplaceWarehouseWithVendor_Fails()
        {
            var repo = new FakeWarehouseRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateWarehouseCommandHandler(repo, uow);

            var command = new CreateWarehouseCommand(
                "Central Hub",
                "Calle 10 # 20-30",
                5000,
                WarehouseType.Marketplace,
                Guid.NewGuid()
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
