using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Services;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Cancela un despacho por quiebre de stock fantasma (ADR-0014):
    /// el quiebre lo reporta Vendedor u Operador. Un Vendedor solo cancela su
    /// propio despacho (el ajeno responde 404); el Operador no exige
    /// comprobacion de propiedad (rol transversal).
    /// </summary>
    public record CancelFulfillmentOrderDueToNoStockCommand(
        Guid FulfillmentOrderId,
        Guid VariantId,
        Guid WarehouseId,
        int QuantityToCancel,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;

    public class CancelFulfillmentOrderDueToNoStockCommandHandler : IRequestHandler<CancelFulfillmentOrderDueToNoStockCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;
        private readonly OrderFulfillmentProgressSynchronizer _progressSynchronizer;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CancelFulfillmentOrderDueToNoStockCommandHandler(IFulfillmentOrderRepository fulfillmentRepository, ICustomerOrderRepository customerOrderRepository, OrderFulfillmentProgressSynchronizer progressSynchronizer, IInventoryRepository inventoryRepository, IReturnRequestRepository returnRepository, IUserRepository userRepository, IUnitOfWork unitOfWork)
        {
            _fulfillmentRepository = fulfillmentRepository;
            _customerOrderRepository = customerOrderRepository;
            _progressSynchronizer = progressSynchronizer;
            _inventoryRepository = inventoryRepository;
            _returnRepository = returnRepository;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(CancelFulfillmentOrderDueToNoStockCommand request, CancellationToken cancellationToken)
        {
            var order = await _fulfillmentRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (order == null) return Result<bool>.NotFound("Fulfillment order not found.");

            // El vendedor no cancela el despacho de otro (politica
            // solo-Seller). El mensaje es el de "no existe".
            if (request.CallerRole == UserRole.Seller && order.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound("Fulfillment order not found.");
            }

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

                // 4. Incrementar tasa de stock fantasma del vendedor (ADR-0021, INV-05)
                var vendor = await _userRepository.GetByIdAsync(order.VendorId);
                if (vendor != null)
                {
                    vendor.IncrementStockFantasmaRate();
                    await _userRepository.UpdateAsync(vendor);
                }

                await _fulfillmentRepository.UpdateAsync(order, cancellationToken);
                await SynchronizeMasterOrderAsync(order, cancellationToken);

                // Sin guardar, la cancelacion por quiebre y la devolucion obligatoria se pierden.
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// EXC-01: cancelar un despacho por quiebre de stock lo deja en
        /// Cancelled, un estado del que nunca saldra. Sin esta sincronizacion, el pedido
        /// maestro se quedaria en Paid para siempre en cuanto un solo producto se perdiera,
        /// aunque el resto se entregara. El servicio de dominio excluye los cancelados del
        /// minimo comun; aqui solo hay que avisarle del cambio.
        /// </summary>
        private async Task SynchronizeMasterOrderAsync(FulfillmentOrder changed, CancellationToken cancellationToken)
        {
            var masterOrder = await _customerOrderRepository.GetByIdAsync(changed.CustomerOrderId, cancellationToken);
            if (masterOrder == null)
            {
                return;
            }

            var statusBeforeSync = masterOrder.Status;

            var siblings = await _fulfillmentRepository.GetByCustomerOrderIdAsync(
                changed.CustomerOrderId, cancellationToken);

            // El despacho cancelado no esta persistido todavia, asi que la consulta
            // devuelve su estado anterior: se sustituye por el de memoria.
            var statuses = siblings
                .Where(f => f.Id != changed.Id)
                .Select(f => f.Status)
                .Append(changed.Status)
                .ToList();

            _progressSynchronizer.Synchronize(masterOrder, statuses);

            if (masterOrder.Status != statusBeforeSync)
            {
                await _customerOrderRepository.UpdateAsync(masterOrder, cancellationToken);
            }
        }
    }
}