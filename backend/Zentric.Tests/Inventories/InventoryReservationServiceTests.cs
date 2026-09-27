using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Inventories.Services;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Products.ValueObjects;
using Xunit;

namespace Zentric.Tests.Inventories
{
    /// <summary>
    /// Pruebas de la reserva de stock (V-02: se reserva desde la bodega con
    /// MAS stock disponible).
    /// </summary>
    public class InventoryReservationServiceTests
    {
        /// <summary>Fake en memoria: devuelve los inventarios en el orden entregado.</summary>
        private sealed class FakeInventoryRepository : IInventoryRepository
        {
            private readonly List<Inventory> _inventories = new();

            public void Add(Inventory inventory) => _inventories.Add(inventory);

            public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult<IEnumerable<Inventory>>(_inventories.Where(i => i.VariantId == variantId));

            public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(_inventories.FirstOrDefault(i => i.Id == id));

            public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
                => Task.FromResult(_inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));

            public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(_inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));

            public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;

            public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
        }

        private static Inventory Stock(Guid variantId, Guid warehouseId, int available)
            => new(variantId, warehouseId, available, 0, 0);

        private static CustomerOrder OrderWith(Guid variantId, int quantity, string currency = "COP")
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(variantId, Guid.NewGuid(), quantity, new Money(1000m, currency));
            return order;
        }

        [Fact]
        public async Task ReserveForOrderAsync_TakesStockFromWarehouseWithMostAvailable()
        {
            // V-02: la bodega con MAS stock debe abastecer la reserva primero.
            var variantId = Guid.NewGuid();
            var bigWarehouse = Guid.NewGuid();
            var smallWarehouse = Guid.NewGuid();

            var repository = new FakeInventoryRepository();
            var small = Stock(variantId, smallWarehouse, 5);
            var big = Stock(variantId, bigWarehouse, 50);
            // Se registran en orden de menor a mayor para probar que la ordenacion
            // del servicio (no la del repositorio) es la que manda.
            repository.Add(small);
            repository.Add(big);

            var service = new InventoryReservationService(repository);
            var order = OrderWith(variantId, 10);

            await service.ReserveForOrderAsync(order);

            // La bodega grande absorbio toda la reserva: 50 - 10 = 40 disponibles.
            Assert.Equal(40, big.AvailableQuantity);
            Assert.Equal(10, big.ReservedQuantity);
            // La bodega chica no se toco.
            Assert.Equal(5, small.AvailableQuantity);
            Assert.Equal(0, small.ReservedQuantity);
        }

        [Fact]
        public async Task ReserveForOrderAsync_SplitsAcrossWarehousesWhenLargestIsInsufficient()
        {
            // Se piden 8 unidades repartidas entre una bodega de 6 y otra de 4.
            // La de 6 (la mayor) se sirve primero y luego se completa con la de 4.
            var variantId = Guid.NewGuid();
            var bigWarehouse = Guid.NewGuid();
            var smallWarehouse = Guid.NewGuid();

            var repository = new FakeInventoryRepository();
            var big = Stock(variantId, bigWarehouse, 4);
            var small = Stock(variantId, smallWarehouse, 6);
            repository.Add(small);
            repository.Add(big);

            var service = new InventoryReservationService(repository);
            var order = OrderWith(variantId, 8);

            await service.ReserveForOrderAsync(order);

            // 6 - 6 = 0 en la bodega mayor.
            Assert.Equal(0, small.AvailableQuantity);
            Assert.Equal(6, small.ReservedQuantity);
            // 4 - 2 = 2 en la segunda.
            Assert.Equal(2, big.AvailableQuantity);
            Assert.Equal(2, big.ReservedQuantity);
        }

        [Fact]
        public async Task ReserveForOrderAsync_WhenInsufficientStock_Throws()
        {
            var variantId = Guid.NewGuid();
            var repository = new FakeInventoryRepository();
            repository.Add(Stock(variantId, Guid.NewGuid(), 3));

            var service = new InventoryReservationService(repository);
            var order = OrderWith(variantId, 10);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ReserveForOrderAsync(order));
        }
    }
}