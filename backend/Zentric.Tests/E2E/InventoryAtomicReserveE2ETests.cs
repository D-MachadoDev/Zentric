using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Zentric.Domain.Inventories.Ports;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// INV-01 / ADR-0025: la garantia de no-negatividad vive en un UPDATE condicional
    /// sobre PostgreSQL real, no en un almacen en memoria.
    ///
    /// El proveedor in-memory no serializa dos escrituras simultaneas sobre la misma
    /// fila, asi que una prueba ahi no probaria nada: el defecto que cierra este ADR
    /// (dos peticiones que descuentan de la misma copia) solo existe con conexiones
    /// reales separadas. Por eso la prueba corre contra el contenedor efimero de la
    /// coleccion E2E (ADR-0016), con un hilo por alcance de DI y por tanto una
    /// conexion a la base por hilo.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class InventoryAtomicReserveE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public InventoryAtomicReserveE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// Siembra una fila de existencias sin producto ni bodega detras: la tabla
        /// Inventories no tiene claves foraneas (solo PK), asi que basta la fila.
        /// Se borra al terminar para no dejar rastro en la base compartida.
        /// </summary>
        private async Task<Guid> SeedInventoryAsync(int available)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();

            var row = new InventoryDbModel
            {
                Id = Guid.NewGuid(),
                VariantId = Guid.NewGuid(),
                WarehouseId = Guid.NewGuid(),
                AvailableQuantity = available,
                ReservedQuantity = 0,
                DamagedQuantity = 0,
                UsedQuantity = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            db.Inventories.Add(row);
            await db.SaveChangesAsync();
            return row.Id;
        }

        /// <summary>
        /// Reserva con su PROPIO alcance de DI: cada llamada es una conexion distinta
        /// a la base, que es lo que convierte la llamada en una carrera de verdad.
        /// </summary>
        private async Task<bool> TryReserveAsync(Guid inventoryId, int quantity)
        {
            using var scope = _factory.Services.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IInventoryRepository>();
            return await repository.TryReserveStockAsync(inventoryId, quantity);
        }

        private async Task<(int Available, int Reserved)> ReadRowAsync(Guid inventoryId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();
            var row = await db.Inventories.AsNoTracking().SingleAsync(i => i.Id == inventoryId);
            return (row.AvailableQuantity, row.ReservedQuantity);
        }

        private async Task DeleteRowAsync(Guid inventoryId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();
            await db.Inventories
                .Where(i => i.Id == inventoryId)
                .ExecuteDeleteAsync();
        }

        /// <summary>
        /// Con UNA unidad y dos hilos luchando por ella, exactamente uno gana y la
        /// fila acaba en 0 — jamas en -1. Es el caso que el ADR describe con dos
        /// compradores: sin el WHERE condicional, los dos descuentan de la misma
        /// lectura y la fila queda en un valor que nunca existio.
        /// </summary>
        [Fact]
        public async Task ReservaAtomica_DosHilosConUnaUnidad_SoloUnoGana_YLaFilaNoPasaDeCero()
        {
            var inventoryId = await SeedInventoryAsync(available: 1);

            try
            {
                var start = new TaskCompletionSource();
                var racers = Enumerable.Range(0, 2).Select(async _ =>
                {
                    await start.Task;
                    return await TryReserveAsync(inventoryId, 1);
                }).ToArray();

                start.SetResult();
                var results = await Task.WhenAll(racers);

                Assert.Equal(1, results.Count(won => won));

                var (available, reserved) = await ReadRowAsync(inventoryId);
                Assert.True(available >= 0, $"AvailableQuantity quedo en {available}, violando INV-01.");
                Assert.Equal(0, available);
                Assert.Equal(1, reserved);
            }
            finally
            {
                await DeleteRowAsync(inventoryId);
            }
        }

        /// <summary>
        /// Diez hilos por CINCO unidades: exactamente cinco reservas pueden ganar.
        /// Si el condicion del UPDATE no estuviera en la clausula WHERE, las diez
        /// leerian "quedan 5" y la fila terminaria en -5.
        /// </summary>
        [Fact]
        public async Task ReservaAtomica_DiezHilosConCincoUnidades_ExactamenteCincoGanan()
        {
            const int stock = 5;
            var inventoryId = await SeedInventoryAsync(stock);

            try
            {
                var start = new TaskCompletionSource();
                var racers = Enumerable.Range(0, 10).Select(async _ =>
                {
                    await start.Task;
                    return await TryReserveAsync(inventoryId, 1);
                }).ToArray();

                start.SetResult();
                var results = await Task.WhenAll(racers);

                Assert.Equal(stock, results.Count(won => won));

                var (available, reserved) = await ReadRowAsync(inventoryId);
                Assert.True(available >= 0, $"AvailableQuantity quedo en {available}, violando INV-01.");
                Assert.Equal(0, available);
                Assert.Equal(stock, reserved);
            }
            finally
            {
                await DeleteRowAsync(inventoryId);
            }
        }

        /// <summary>
        /// La liberacion (compensacion de ADR-0001) es el espejo atomico de la
        /// reserva: solo resta reservado si la fila aun lo tiene, y repone el
        /// disponible exactamente lo que retiro.
        /// </summary>
        [Fact]
        public async Task LiberarReservaAtomica_RestauraElDisponible()
        {
            var inventoryId = await SeedInventoryAsync(available: 3);

            try
            {
                Assert.True(await TryReserveAsync(inventoryId, 2));

                using (var scope = _factory.Services.CreateScope())
                {
                    var repository = scope.ServiceProvider.GetRequiredService<IInventoryRepository>();
                    await repository.ReleaseReservedStockAsync(inventoryId, 2);
                }

                var (available, reserved) = await ReadRowAsync(inventoryId);
                Assert.Equal(3, available);
                Assert.Equal(0, reserved);
            }
            finally
            {
                await DeleteRowAsync(inventoryId);
            }
        }

        /// <summary>
        /// Reservar por encima de lo disponible devuelve false sin tocar la fila:
        /// cero filas afectadas es el rechazo, no un error.
        /// </summary>
        [Fact]
        public async Task ReservaAtomica_PorEncimaDeLoDisponible_RechazaSinTocarLaFila()
        {
            var inventoryId = await SeedInventoryAsync(available: 2);

            try
            {
                Assert.False(await TryReserveAsync(inventoryId, 3));

                var (available, reserved) = await ReadRowAsync(inventoryId);
                Assert.Equal(2, available);
                Assert.Equal(0, reserved);
            }
            finally
            {
                await DeleteRowAsync(inventoryId);
            }
        }
    }
}