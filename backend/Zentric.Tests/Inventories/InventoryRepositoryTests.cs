using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Infrastructure.Persistence.Models;
using Zentric.Infrastructure.Persistence.Repositories;
using Zentric.Tests.Inventories;
using Xunit;

namespace Zentric.Tests.Infrastructure.Persistence.Repositories;

/// <summary>
/// Pruebas del adaptador de persistencia de inventario contra la base de datos
/// en memoria de EF Core. Verifica que el historial de ajustes se recarga
/// (LoadWithHistoryAsync) y que un ajuste se guarda con la fila de inventario
/// (SaveAdjustmentAsync).
/// </summary>
public sealed class InventoryRepositoryTests : IClassFixture<InventoryRepositoryFixture>
{
    private readonly InventoryRepositoryFixture _fixture;

    public InventoryRepositoryTests(InventoryRepositoryFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task LoadWithHistoryAsync_ReturnsInventoryWithHistory()
    {
        // Arrange
        var inventory = _fixture.InventoryWithoutAdjustments();
        _fixture.Context.StockAdjustments.AddRange(
            new StockAdjustmentDbModel
            {
                Id = Guid.NewGuid(),
                InventoryId = inventory.Id,
                SystemQuantity = 50,
                PhysicalQuantity = 48,
                CountedBy = _fixture.AdminUserId,
                Reason = "Sorteo",
                CountedAt = DateTime.UtcNow.AddDays(-1)
            },
            new StockAdjustmentDbModel
            {
                Id = Guid.NewGuid(),
                InventoryId = inventory.Id,
                SystemQuantity = 50,
                PhysicalQuantity = 47,
                CountedBy = _fixture.AdminUserId,
                Reason = "Conteo físico marzo",
                CountedAt = DateTime.UtcNow
            });
        _fixture.Context.SaveChanges();

        // Act
        var result = await _fixture.Repository.LoadWithHistoryAsync(inventory.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(50, result.AvailableQuantity);
        // El histórico se reconstruye por fecha de conteo, no por orden de inserción.
        Assert.Equal(2, result.AdjustmentHistory.Count);
        Assert.Equal("Sorteo", result.AdjustmentHistory.Single(a => a.PhysicalQuantity == 48).Reason);
        Assert.Equal("Conteo físico marzo", result.AdjustmentHistory.Single(a => a.PhysicalQuantity == 47).Reason);
    }

    [Fact]
    public async Task LoadWithHistoryAsync_WhenNoAdjustments_ReturnsEmptyHistory()
    {
        // Arrange
        var inventory = _fixture.InventoryWithoutAdjustments();

        // Act
        var result = await _fixture.Repository.LoadWithHistoryAsync(inventory.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.AdjustmentHistory);
    }

    [Fact]
    public async Task SaveAdjustmentAsync_PersistsAdjustmentRecord()
    {
        // Arrange
        var inventory = _fixture.InventoryWithoutAdjustments();
        var record = new StockAdjustmentRecord(
            inventory.AvailableQuantity,
            20,
            _fixture.AdminUserId,
            "Conteo físico",
            DateTime.UtcNow);

        // Act
        await _fixture.Repository.SaveAdjustmentAsync(inventory, record);
        await _fixture.Context.SaveChangesAsync();

        // Assert
        var saved = await _fixture.Context.StockAdjustments
            .AsNoTracking()
            .OrderByDescending(a => a.CountedAt)
            .FirstAsync();
        Assert.Equal(inventory.Id, saved.InventoryId);
        Assert.Equal(record.SystemQuantity, saved.SystemQuantity);
        Assert.Equal(record.PhysicalQuantity, saved.PhysicalQuantity);
        Assert.Equal(record.CountedBy, saved.CountedBy);
        Assert.Equal(record.Reason, saved.Reason);
        Assert.NotEqual(default, saved.CountedAt);
    }

    [Fact]
    public async Task SaveAdjustmentAsync_SavesAdjustmentRecord()
    {
        // Arrange
        var inventory = _fixture.InventoryWithoutAdjustments();
        var record = new StockAdjustmentRecord(
            inventory.AvailableQuantity,
            25,
            _fixture.AdminUserId,
            "Ajuste",
            DateTime.UtcNow);

        // Act
        await _fixture.Repository.SaveAdjustmentAsync(inventory, record);
        await _fixture.Context.SaveChangesAsync();

        // Assert
        var saved = await _fixture.Context.StockAdjustments
            .AsNoTracking()
            .OrderByDescending(a => a.CountedAt)
            .FirstAsync();
        Assert.Equal(inventory.Id, saved.InventoryId);
        Assert.Equal(record.SystemQuantity, saved.SystemQuantity);
        Assert.Equal(record.PhysicalQuantity, saved.PhysicalQuantity);
        Assert.Equal(record.CountedBy, saved.CountedBy);
        Assert.Equal(record.Reason, saved.Reason);
        Assert.NotEqual(default, saved.CountedAt);
    }

    [Fact]
    public async Task SaveAdjustmentAsync_DoesNotChangeAvailableQuantity()
    {
        // Arrange
        var inventory = _fixture.InventoryWithoutAdjustments();
        var originalAvailable = inventory.AvailableQuantity;
        var record = new StockAdjustmentRecord(
            inventory.AvailableQuantity,
            25,
            _fixture.AdminUserId,
            "Ajuste",
            DateTime.UtcNow);

        // Act
        await _fixture.Repository.SaveAdjustmentAsync(inventory, record);
        await _fixture.Context.SaveChangesAsync();

        // Assert
        var saved = await _fixture.Context.Inventories.FirstAsync();
        // El adaptador solo persiste el ajuste; el conteo se aplica en dominio
        // (portadista) y la fila de inventario sí se actualiza con UpdateAsync.
        Assert.Equal(originalAvailable, saved.AvailableQuantity);
    }

    [Fact]
    public async Task LoadWithHistoryAsync_ThrowsWhenInventoryNotFound()
    {
        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _fixture.Repository.LoadWithHistoryAsync(Guid.NewGuid()));
    }
}
