using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Inventories.Commands
{
    /// <summary>
    /// Ingreso de stock. Q-21b: el Vendedor solo ingresa stock de SUS productos
    /// (variante cuyo producto es suyo) y solo en SUS bodegas; el Operador puede
    /// hacerlo en cualquiera de las dos, porque la recepcion en bodega es su rol.
    /// </summary>
    public record AddStockCommand(
        Guid VariantId,
        Guid WarehouseId,
        int Quantity,
        Guid CallerId,
        UserRole CallerRole
    ) : IRequest<Result<Guid>>;

    public class AddStockCommandHandler : IRequestHandler<AddStockCommand, Result<Guid>>
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IProductRepository _productRepository;
        private readonly IWarehouseRepository _warehouseRepository;

        public AddStockCommandHandler(
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

        public async Task<Result<Guid>> Handle(AddStockCommand request, CancellationToken cancellationToken)
        {
            // Q-21b: el vendedor no puede mover el stock de otro ni entrar stock en
            // bodegas ajenas. Los mensajes son los de "no existe" para no confirmar
            // que ese producto o esa bodega existen y son de otro.
            if (request.CallerRole == UserRole.Seller)
            {
                var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
                if (product == null || product.VendorId != request.CallerId)
                {
                    return Result<Guid>.NotFound($"Variant {request.VariantId} not found.");
                }

                var warehouse = await _warehouseRepository.GetByIdAsync(request.WarehouseId, cancellationToken);
                if (warehouse == null || warehouse.VendorId != request.CallerId)
                {
                    return Result<Guid>.NotFound($"Warehouse {request.WarehouseId} not found.");
                }
            }

            try
            {
                var inventory = await _inventoryRepository.GetByVariantAndWarehouseAsync(
                    request.VariantId,
                    request.WarehouseId,
                    cancellationToken);

                if (inventory != null)
                {
                    inventory.AddStock(request.Quantity);
                    await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                }
                else
                {
                    inventory = new Inventory(
                        request.VariantId,
                        request.WarehouseId,
                        request.Quantity,
                        0,
                        0,
                        0);
                    await _inventoryRepository.AddAsync(inventory, cancellationToken);
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result<Guid>.Success(inventory.Id);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
