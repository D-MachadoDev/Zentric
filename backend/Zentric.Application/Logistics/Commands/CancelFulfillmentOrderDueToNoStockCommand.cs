using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;

namespace Zentric.Application.Logistics.Commands
{
    public record CancelFulfillmentOrderDueToNoStockCommand(Guid FulfillmentOrderId, Guid VariantId, Guid WarehouseId, int QuantityToCancel) : IRequest<Result<bool>>;

    public class CancelFulfillmentOrderDueToNoStockCommandHandler : IRequestHandler<CancelFulfillmentOrderDueToNoStockCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CancelFulfillmentOrderDueToNoStockCommandHandler(IFulfillmentOrderRepository fulfillmentRepository, IInventoryRepository inventoryRepository, IReturnRequestRepository returnRepository, IUnitOfWork unitOfWork)
        {
            _fulfillmentRepository = fulfillmentRepository;
            _inventoryRepository = inventoryRepository;
            _returnRepository = returnRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(CancelFulfillmentOrderDueToNoStockCommand request, CancellationToken cancellationToken)
        {
            var order = await _fulfillmentRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (order == null) return Result<bool>.Failure("Fulfillment order not found.");

            try
            {
                // 1. Cancelar la orden de logística
                order.CancelDueToNoStock();
                
                // 2. Reconciliar el inventario fantasma
                var inventory = await _inventoryRepository.GetByVariantAndWarehouseAsync(request.VariantId, request.WarehouseId, cancellationToken);
                if (inventory != null)
                {
                    inventory.ReconcileGhostStock(request.QuantityToCancel);
                    await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                }

                // 3. Detonar el proceso de devolución obligatoria
                // Asumimos Physical porque es un quiebre de stock en bodega.
                var returnReq = new ReturnRequest(order.CustomerOrderId, request.VariantId, request.WarehouseId, request.QuantityToCancel, ProductType.Physical);
                await _returnRepository.AddAsync(returnReq, cancellationToken);

                await _fulfillmentRepository.UpdateAsync(order, cancellationToken);

                // Sin guardar, la cancelacion por quiebre y la devolucion obligatoria se pierden.
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
