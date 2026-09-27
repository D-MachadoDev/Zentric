using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Inventories.Commands;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;

namespace Zentric.Tests.Application.Inventories
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

    public class FakeInventoryRepository : IInventoryRepository
    {
        public List<Inventory> Inventories { get; } = new();

        public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            Inventories.Add(inventory);
            return Task.CompletedTask;
        }

        public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.FirstOrDefault(i => i.Id == id));
        }

        public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));
        }

        public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IEnumerable<Inventory>>(Inventories.Where(i => i.VariantId == variantId).ToList());
        }

        public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));
        }

        public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    public class AddStockCommandHandlerTests
    {
        [Fact]
        public async Task Handle_NewInventory_CreatesAndAddsStock()
        {
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var handler = new AddStockCommandHandler(repo, uow);

            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var command = new AddStockCommand(variantId, warehouseId, 50);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Inventories);
            Assert.Equal(50, repo.Inventories[0].AvailableQuantity);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_ExistingInventory_IncrementsStock()
        {
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var handler = new AddStockCommandHandler(repo, uow);

            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var existing = new Inventory(variantId, warehouseId, 20, 0, 0, 0);
            await repo.AddAsync(existing);

            var command = new AddStockCommand(variantId, warehouseId, 30);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Inventories);
            Assert.Equal(50, repo.Inventories[0].AvailableQuantity);
        }
    }
}
