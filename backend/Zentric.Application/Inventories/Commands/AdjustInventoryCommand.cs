using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Inventories.Commands
{
    /// <summary>
    /// Ajusta el inventario fisico por conteo (ADR-0021).
    /// Solo Administrador y Supervisor (politica InventoryAdjust).
    /// El conteo fisico SOLO puede reducir el disponible (no inventar stock).
    /// </summary>
    /// <param name="InventoryId">Identificador del inventario (clave VariantId + WarehouseId).</param>
    /// <param name="CountedQuantity">Cantidad fisica contada (debe ser <= AvailableQuantity).</param>
    /// <param name="Reason">Motivo del ajuste (ej. "conteo fisico mensual", "deteccion discrepancia").</param>
    /// <param name="CallerId">Identificador del usuario que realiza el conteo (del token).</param>
    /// <param name="CallerRole">Rol del usuario que realiza el conteo.</param>
    public record AdjustInventoryCommand(
        Guid InventoryId,
        int CountedQuantity,
        string Reason,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<AdjustInventoryResult>>;

    /// <summary>
    /// Resultado del ajuste fisico.
    /// </summary>
    public sealed record AdjustInventoryResult(
        Guid AdjustmentId,
        Guid InventoryId,
        int PreviousAvailableQuantity,
        int NewAvailableQuantity,
        int AdjustedQuantity,
        string Reason,
        DateTime CountedAt);

    public class AdjustInventoryCommandHandler : IRequestHandler<AdjustInventoryCommand, Result<AdjustInventoryResult>>
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUnitOfWork _unitOfWork;

        public AdjustInventoryCommandHandler(
            IInventoryRepository inventoryRepository,
            IUnitOfWork unitOfWork)
        {
            _inventoryRepository = inventoryRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<AdjustInventoryResult>> Handle(AdjustInventoryCommand request, CancellationToken cancellationToken)
        {
            var inventory = await _inventoryRepository.GetByIdAsync(request.InventoryId, cancellationToken);
            if (inventory == null)
            {
                return Result<AdjustInventoryResult>.NotFound("Inventory not found.");
            }

            var previousAvailable = inventory.AvailableQuantity;

            // Idempotencia: mismo conteo + mismo motivo en ventana de 5 minutos
            if (inventory.AdjustmentHistory.Any(a =>
                a.PhysicalQuantity == request.CountedQuantity &&
                a.Reason == request.Reason &&
                a.CountedAt > DateTime.UtcNow.AddMinutes(-5)))
            {
                var existing = inventory.AdjustmentHistory
                    .Where(a => a.PhysicalQuantity == request.CountedQuantity &&
                                a.Reason == request.Reason &&
                                a.CountedAt > DateTime.UtcNow.AddMinutes(-5))
                    .OrderByDescending(a => a.CountedAt)
                    .First();

                // Generar Guid determinista para idempotencia (hash de propiedades clave)
                var deterministicId = DeterministicGuid(existing.SystemQuantity, existing.PhysicalQuantity, existing.CountedBy, existing.Reason, existing.CountedAt);

                return Result<AdjustInventoryResult>.Success(new AdjustInventoryResult(
                    deterministicId,
                    request.InventoryId,
                    existing.SystemQuantity,
                    existing.PhysicalQuantity,
                    existing.SystemQuantity - existing.PhysicalQuantity,
                    existing.Reason,
                    existing.CountedAt));
            }

            try
            {
                inventory.ApplyPhysicalCount(request.CountedQuantity, request.CallerId, request.Reason);
            }
            catch (InvalidOperationException ex)
            {
                return Result<AdjustInventoryResult>.Failure(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return Result<AdjustInventoryResult>.Failure(ex.Message);
            }

            await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Si no hubo ajuste (cantidad igual), no hay registro en el historial
            var latestAdjustment = inventory.AdjustmentHistory
                .OrderByDescending(a => a.CountedAt)
                .FirstOrDefault();

            if (latestAdjustment == null)
            {
                // Sin ajuste real: la cantidad ya era correcta
                return Result<AdjustInventoryResult>.Success(new AdjustInventoryResult(
                    DeterministicGuid(previousAvailable, previousAvailable, request.CallerId, request.Reason, DateTime.UtcNow),
                    request.InventoryId,
                    previousAvailable,
                    previousAvailable,
                    0,
                    request.Reason,
                    DateTime.UtcNow));
            }

            return Result<AdjustInventoryResult>.Success(new AdjustInventoryResult(
                DeterministicGuid(latestAdjustment.SystemQuantity, latestAdjustment.PhysicalQuantity, latestAdjustment.CountedBy, latestAdjustment.Reason, latestAdjustment.CountedAt),
                request.InventoryId,
                previousAvailable,
                latestAdjustment.PhysicalQuantity,
                latestAdjustment.SystemQuantity - latestAdjustment.PhysicalQuantity,
                latestAdjustment.Reason,
                latestAdjustment.CountedAt));
        }

        /// <summary>
        /// Genera un Guid determinista a partir de las propiedades del ajuste.
        /// Garantiza que las mismas propiedades produzcan el mismo Guid (idempotencia).
        /// </summary>
        private static Guid DeterministicGuid(int systemQty, int physicalQty, Guid countedBy, string reason, DateTime countedAt)
        {
            var input = $"{systemQty}|{physicalQty}|{countedBy}|{reason}|{countedAt:O}";
            var hash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input));
            var bytes = new byte[16];
            Array.Copy(hash, bytes, 16);
            // Version 4 (random) variant bits: set version to 4
            bytes[6] = (byte)((bytes[6] & 0x0F) | 0x40);
            // Variant bits: RFC 4122
            bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
            return new Guid(bytes);
        }
    }
}