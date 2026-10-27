using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Inventories.Commands
{
    /// <summary>
    /// Eliminacion logica (soft delete) de un registro de inventario.
    /// Solo se permite cuando no quedan existencias fisicas (available/reserved/used/damaged = 0).
    /// El Vendedor solo puede eliminar registros de SUS productos; el Operador Logistico
    /// puede hacerlo sobre cualquier registro (recepcion en bodega es su rol).
    /// </summary>
    public record DeleteInventoryCommand(
        Guid InventoryId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result>;

    public class DeleteInventoryCommandHandler : IRequestHandler<DeleteInventoryCommand, Result>
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IProductRepository _productRepository;
        private readonly IWarehouseRepository _warehouseRepository;

        public DeleteInventoryCommandHandler(
            IInventoryRepository inventoryRepository,
            IUnitOfWork unitOfWork,
            IProductRepository productRepository,
            IWarehouseRepository warehouseRepository)
        {
            _inventoryRepository = inventoryRepository;
            _unitOfWork = unitOfWork;
            _productRepository = productRepository;
            _warehouseRepository = warehouseRepository;
        }

        public async Task<Result> Handle(DeleteInventoryCommand request, CancellationToken cancellationToken)
        {
            var inventory = await _inventoryRepository.GetByIdAsync(request.InventoryId, cancellationToken);
            if (inventory is null)
            {
                return Result.NotFound($"Inventory {request.InventoryId} not found.");
            }

            if (request.CallerRole == UserRole.Seller)
            {
                var product = await _productRepository.GetByVariantIdAsync(inventory.VariantId, cancellationToken);
                if (product is null || product.VendorId != request.CallerId)
                {
                    return Result.NotFound($"Inventory {request.InventoryId} not found.");
                }
            }

            if (request.CallerRole == UserRole.Administrator)
            {
                // El Administrador gestiona la bodega central de Zentric. La bodega
                // de un vendedor es del vendedor: poder leerla no le da la llave.
                var warehouse = await _warehouseRepository.GetByIdAsync(inventory.WarehouseId, cancellationToken);
                if (warehouse is null || warehouse.Type != WarehouseType.Marketplace)
                {
                    return Result.Failure("El administrador solo puede administrar inventario de bodegas de Zentric.");
                }
            }

            try
            {
                inventory.MarkAsDeleted();
                await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result.Success();
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result.Failure(ex.Message);
            }
        }
    }
}