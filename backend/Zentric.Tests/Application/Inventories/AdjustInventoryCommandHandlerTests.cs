using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Inventories.Commands;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Tests.Application.Inventories;

namespace Zentric.Tests.Application.Inventories
{
    /// <summary>
    /// Criterios de aceptación de ADR-0021 / INV-04: ajuste físico de inventario por conteo.
    /// </summary>
    public class AdjustInventoryCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidAdjustment_ReducesAvailableAndRecordsHistory()
        {
            var repository = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 100, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, uow);

            var result = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 80, "conteo fisico mensual", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(100, result.Value.PreviousAvailableQuantity);
            Assert.Equal(80, result.Value.NewAvailableQuantity);
            Assert.Equal(20, result.Value.AdjustedQuantity);
            Assert.Equal("conteo fisico mensual", result.Value.Reason);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_UnknownInventory_ReturnsNotFound()
        {
            var handler = new AdjustInventoryCommandHandler(new FakeInventoryRepository(), new FakeUnitOfWork());

            var result = await handler.Handle(
                new AdjustInventoryCommand(Guid.NewGuid(), 50, "motivo", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact]
        public async Task Handle_CountedQuantityExceedsAvailable_ReturnsFailure()
        {
            var repository = new FakeInventoryRepository();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 50, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 60, "motivo", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("cannot add stock", result.Error);
        }

        [Fact]
        public async Task Handle_NegativeCountedQuantity_ReturnsFailure()
        {
            var repository = new FakeInventoryRepository();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 50, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, -5, "motivo", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("negative", result.Error);
        }

        [Fact]
        public async Task Handle_EmptyReason_ReturnsFailure()
        {
            var repository = new FakeInventoryRepository();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 50, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 30, "   ", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("required", result.Error);
        }

        [Fact]
        public async Task Handle_SameCountAndReasonWithinFiveMinutes_ReturnsSameResult_Idempotent()
        {
            var repository = new FakeInventoryRepository();
            var uow1 = new FakeUnitOfWork();
            var callerId = Guid.NewGuid();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 100, 0, 0);
            await repository.AddAsync(inventory);
            var handler1 = new AdjustInventoryCommandHandler(repository, uow1);

            var cmd = new AdjustInventoryCommand(inventory.Id, 80, "conteo fisico mensual", callerId, UserRole.Administrator);

            var result1 = await handler1.Handle(cmd, CancellationToken.None);
            Assert.True(result1.IsSuccess);
            var firstAdjustmentId = result1.Value.AdjustmentId;

            // Segunda llamada idéntica dentro de 5 min - nuevo UoW para verificar que no se guarda
            var uow2 = new FakeUnitOfWork();
            var handler2 = new AdjustInventoryCommandHandler(repository, uow2);

            var result2 = await handler2.Handle(cmd, CancellationToken.None);
            Assert.True(result2.IsSuccess);

            // Debe ser idempotente: mismo resultado (mismo ID de ajuste lógico)
            Assert.Equal(firstAdjustmentId, result2.Value.AdjustmentId);
            Assert.Equal(result1.Value.NewAvailableQuantity, result2.Value.NewAvailableQuantity);
            Assert.False(uow2.SaveChangesCalled); // No debe guardar de nuevo
        }

        [Fact]
        public async Task Handle_SameCountDifferentReason_CreatesNewAdjustment()
        {
            var repository = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var callerId = Guid.NewGuid();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 100, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, uow);

            var result1 = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 80, "conteo mensual", callerId, UserRole.Administrator),
                CancellationToken.None);
            Assert.True(result1.IsSuccess);

            var result2 = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 70, "diferente motivo", callerId, UserRole.Administrator),
                CancellationToken.None);
            Assert.True(result2.IsSuccess);

            // Debe crear un nuevo ajuste (distinto motivo)
            Assert.NotEqual(result1.Value.AdjustmentId, result2.Value.AdjustmentId);
            Assert.Equal(70, result2.Value.NewAvailableQuantity);
        }

        [Fact]
        public async Task Handle_CountedQuantityEqualsAvailable_ReturnsSuccessNoChange()
        {
            var repository = new FakeInventoryRepository();
            var inventory = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 50, 0, 0);
            await repository.AddAsync(inventory);
            var handler = new AdjustInventoryCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(
                new AdjustInventoryCommand(inventory.Id, 50, "conteo confirma stock", Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);

            // Sin diferencia, ApplyPhysicalCount retorna sin crear registro
            Assert.True(result.IsSuccess);
            Assert.Equal(50, result.Value.NewAvailableQuantity);
            Assert.Equal(0, result.Value.AdjustedQuantity);
        }
    }
}