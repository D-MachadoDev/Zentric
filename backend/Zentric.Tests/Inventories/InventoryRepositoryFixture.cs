using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Models;
using Zentric.Infrastructure.Persistence.Repositories;

namespace Zentric.Tests.Inventories;

/// <summary>
/// Fixture que prepara un <see cref="ZentricDbContext"/> sobre la base de datos
/// en memoria de EF Core y un <see cref="InventoryRepository"/> apuntando a el.
/// </summary>
public sealed class InventoryRepositoryFixture : IDisposable
{
    public ZentricDbContext Context { get; }
    public InventoryRepository Repository { get; }
    public Guid AdminUserId { get; } = Guid.NewGuid();

    public InventoryRepositoryFixture()
    {
        // Proveedor in-memory: lo mismo que PostgreSQL en producción, pero sin
        // depender de contenedor ni de red. El proposito es probar el SQL que
        // EF Core genera y las operaciones de asignacion de la capa de infra.
        var options = new DbContextOptionsBuilder<ZentricDbContext>()
            .UseInMemoryDatabase($"inventory-repo-{Guid.NewGuid()}")
            .Options;

        Context = new ZentricDbContext(options);
        Repository = new InventoryRepository(Context);

        // Tablas vacias, asi sabemos exactamente que las pruebas insertan.
        Context.Database.EnsureDeleted();
        Context.Database.EnsureCreated();
    }

    public Inventory InventoryWithoutAdjustments()
    {
        var inventory = new Inventory(
            variantId: Guid.NewGuid(),
            warehouseId: Guid.NewGuid(),
            availableQuantity: 50,
            reservedQuantity: 8,
            damagedQuantity: 2,
            usedQuantity: 3);

        Context.Inventories.Add(InventoryMapper.ToDbModel(inventory));
        Context.SaveChanges();

        return inventory;
    }

    public Inventory InventoryWithAdjustments(Inventory inventory)
    {
        // Dos registros de ajuste, y la prueba de LoadWithHistoryAsync depende del
        // orden cronologico (CountedAt) y no del orden de insercion de la BD.
        var first = CreateAdjustment(inventory.Id, 50, 48, DateTime.UtcNow.AddDays(-1));
        var second = CreateAdjustment(inventory.Id, 50, 47, DateTime.UtcNow, reason: "Conteo físico marzo");

        Context.StockAdjustments.AddRange(first, second);
        Context.SaveChanges();

        return inventory;
    }

    private StockAdjustmentDbModel CreateAdjustment(
        Guid inventoryId,
        int systemQuantity,
        int physicalQuantity,
        DateTime countedAt,
        string reason = "Ajuste de conteo")
    {
        return new StockAdjustmentDbModel
        {
            Id = Guid.NewGuid(),
            InventoryId = inventoryId,
            SystemQuantity = systemQuantity,
            PhysicalQuantity = physicalQuantity,
            CountedBy = AdminUserId,
            Reason = reason,
            CountedAt = countedAt
        };
    }

    public void Dispose() => Context.Dispose();
}
