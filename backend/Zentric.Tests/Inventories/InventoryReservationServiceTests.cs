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
using Zentric.Domain.Products.Enums;
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
            public Task<IReadOnlyList<Inventory>> GetListAsync(Guid? vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Inventory>>(new List<Inventory>());

            public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;

            public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;

            public Task<Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(_inventories.First(i => i.Id == id));

            public Task SaveAdjustmentAsync(Inventory inventory, StockAdjustmentRecord record, CancellationToken cancellationToken = default)
            {
                // El agregado ya trae el ajuste aplicado; el fake solo sustituye
                // la fila, como hace la persistencia real con UpdateAsync.
                var index = _inventories.FindIndex(i => i.Id == inventory.Id);
                if (index >= 0)
                {
                    _inventories[index] = inventory;
                }

                return Task.CompletedTask;
            }

            /// <summary>
            /// Ids de existencias donde la "base" rechaza la reserva (simula otra
            /// peticion que se adelanto): el UPDATE condicional afectaria cero filas.
            /// </summary>
            public HashSet<Guid> RejectReserves { get; } = new();

            /// <summary>
            /// UPDATE condicional atomico (ADR-0025): solo COMPRueba, sin mutar. La
            /// mutacion observable la aplica el servicio con ReserveStock sobre la
            /// misma copia (en produccion la muta el SQL y la copia en memoria es un
            /// objeto aparte desprendido). Si la "base" rechaza, devuelve false.
            /// </summary>
            public Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            {
                if (RejectReserves.Contains(inventoryId))
                {
                    return Task.FromResult(false);
                }

                var inventory = _inventories.FirstOrDefault(i => i.Id == inventoryId);
                return Task.FromResult(inventory is not null && inventory.AvailableQuantity >= quantity);
            }

            /// <summary>
            /// Compensacion de ADR-0001: aqui SI hay que mutar la fila, porque el
            /// servicio no toca la copia al fallar — solo lanza. Es el equivalente
            /// observable del UPDATE inverso de la persistencia real.
            /// </summary>
            public Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            {
                var inventory = _inventories.FirstOrDefault(i => i.Id == inventoryId);
                if (inventory is not null && inventory.ReservedQuantity >= quantity)
                {
                    inventory.ReturnToAvailable(quantity);
                }

                return Task.CompletedTask;
            }

        }

        /// <summary>Fake en memoria: el servicio solo necesita el tipo del producto.</summary>
        private sealed class FakeProductRepository : Zentric.Domain.Products.Ports.IProductRepository
        {
            private readonly Dictionary<Guid, Zentric.Domain.Products.Product> _byVariant = new();

            public void Register(Guid variantId, Zentric.Domain.Products.Enums.ProductType type)
            {
                // Un producto Physical necesita al menos una variante (CAT-03 / ADR-0003).
                var variants = type == Zentric.Domain.Products.Enums.ProductType.Physical
                    ? new List<(string, IEnumerable<VariantAttribute>)> { ("SKU", new List<VariantAttribute> { new VariantAttribute("Color", "Rojo") }) }
                    : null;
                _byVariant[variantId] = new Zentric.Domain.Products.Product("P", "D", new Money(1, "COP"), Guid.NewGuid(), type, variants);
            }

            public Task<Zentric.Domain.Products.Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(_byVariant.TryGetValue(variantId, out var p) ? p : null);

            public Task<Zentric.Domain.Products.Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<Zentric.Domain.Products.Product?>(null);

            public Task<IReadOnlyList<Zentric.Domain.Products.Product>> GetAllAsync(Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Zentric.Domain.Products.Product>>(new List<Zentric.Domain.Products.Product>());

            public Task<(IReadOnlyList<Zentric.Domain.Products.Product> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
                => Task.FromResult<(IReadOnlyList<Zentric.Domain.Products.Product>, int)>((new List<Zentric.Domain.Products.Product>(), 0));

            public Task AddAsync(Zentric.Domain.Products.Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
            public Task UpdateAsync(Zentric.Domain.Products.Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
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

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Physical);
            var service = new InventoryReservationService(repository, productRepository);
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

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Physical);
            var service = new InventoryReservationService(repository, productRepository);
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

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Physical);
            var service = new InventoryReservationService(repository, productRepository);
            var order = OrderWith(variantId, 10);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ReserveForOrderAsync(order));
        }

        /// <summary>
        /// CAT-02 / H-16: un item Digital no reserva stock ni falla aunque no haya
        /// existencias (los digitales no pasan por almacen).
        /// </summary>
        [Fact]
        public async Task ReserveForOrderAsync_DigitalItem_SkipsInventory()
        {
            var variantId = Guid.NewGuid();
            var repository = new FakeInventoryRepository(); // sin existencias
            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Digital);

            var service = new InventoryReservationService(repository, productRepository);
            var order = OrderWith(variantId, 1);

            var exception = await Record.ExceptionAsync(() => service.ReserveForOrderAsync(order));

            Assert.Null(exception);
            Assert.Equal(0, await repository.GetTotalAvailableStockAsync(variantId));
        }

        /// <summary>
        /// ADR-0001 + ADR-0025: si la SEGUNDA linea del pedido no encuentra stock,
        /// la reserva ya confirmada de la primera se libera antes de lanzar. La
        /// reserva escribe de inmediato en la base, asi que sin esta compensacion
        /// el fallo dejaria un parcial confirmado para un pedido que nunca existio.
        /// </summary>
        [Fact]
        public async Task ReserveForOrderAsync_WhenSecondLineFails_ReleasesTheFirstLineReservation()
        {
            var variantA = Guid.NewGuid();
            var variantB = Guid.NewGuid();

            var repository = new FakeInventoryRepository();
            var warehouseA = Stock(variantA, Guid.NewGuid(), 10);
            var warehouseB = Stock(variantB, Guid.NewGuid(), 3);
            repository.Add(warehouseA);
            repository.Add(warehouseB);

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantA, Zentric.Domain.Products.Enums.ProductType.Physical);
            productRepository.Register(variantB, Zentric.Domain.Products.Enums.ProductType.Physical);

            var service = new InventoryReservationService(repository, productRepository);
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(variantA, Guid.NewGuid(), 4, new Money(1000m, "COP"));
            order.AddItem(variantB, Guid.NewGuid(), 10, new Money(1000m, "COP"));

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ReserveForOrderAsync(order));

            // La linea A quedo liberada: nada de parciales confirmados.
            Assert.Equal(10, warehouseA.AvailableQuantity);
            Assert.Equal(0, warehouseA.ReservedQuantity);
            // La linea B nunca llego a reservar de todas formas.
            Assert.Equal(3, warehouseB.AvailableQuantity);
            Assert.Equal(0, warehouseB.ReservedQuantity);
        }

        /// <summary>
        /// ADR-0025: si la "base" rechaza el UPDATE condicional de la bodega mayor
        /// (otra peticion se llevo el stock entre la lectura y la escritura), el
        /// servicio pasa a la siguiente bodega en vez de confiar en la copia en
        /// memoria.
        /// </summary>
        [Fact]
        public async Task ReserveForOrderAsync_WhenAtomicUpdateIsRejected_MovesToTheNextWarehouse()
        {
            var variantId = Guid.NewGuid();
            var bigWarehouse = Guid.NewGuid();
            var smallWarehouse = Guid.NewGuid();

            var repository = new FakeInventoryRepository();
            var big = Stock(variantId, bigWarehouse, 50);
            var small = Stock(variantId, smallWarehouse, 10);
            repository.Add(small);
            repository.Add(big);
            // La "base" rechaza la reserva en la bodega mayor: otro hilo la vacio
            // despues de que el servicio leyo la copia con 50 unidades.
            repository.RejectReserves.Add(big.Id);

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Physical);
            var service = new InventoryReservationService(repository, productRepository);
            var order = OrderWith(variantId, 8);

            await service.ReserveForOrderAsync(order);

            // La bodega mayor quedo intacta (el UPDATE fue rechazado, no confiamos en la copia).
            Assert.Equal(50, big.AvailableQuantity);
            Assert.Equal(0, big.ReservedQuantity);
            // La reserva se completo con la siguiente bodega de la lista.
            Assert.Equal(2, small.AvailableQuantity);
            Assert.Equal(8, small.ReservedQuantity);
        }

        /// <summary>
        /// ADR-0025: si TODAS las bodegas son rechazadas por la base, el servicio
        /// lanza y no deja ni un parcial — ni siquiera de bodegas cuya copia en
        /// memoria decia tener stock.
        /// </summary>
        [Fact]
        public async Task ReserveForOrderAsync_WhenEveryUpdateIsRejected_ThrowsWithoutReserving()
        {
            var variantId = Guid.NewGuid();
            var repository = new FakeInventoryRepository();
            var warehouse = Stock(variantId, Guid.NewGuid(), 50);
            repository.Add(warehouse);
            repository.RejectReserves.Add(warehouse.Id);

            var productRepository = new FakeProductRepository();
            productRepository.Register(variantId, Zentric.Domain.Products.Enums.ProductType.Physical);
            var service = new InventoryReservationService(repository, productRepository);
            var order = OrderWith(variantId, 5);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ReserveForOrderAsync(order));

            Assert.Equal(50, warehouse.AvailableQuantity);
            Assert.Equal(0, warehouse.ReservedQuantity);
        }
    }
}