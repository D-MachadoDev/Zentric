using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Cancela voluntariamente una orden propia en estado Cart o PendingPayment y libera
    /// inmediatamente cualquier stock reservado para que el comprador no deba esperar los
    /// 15 minutos del temporizador.
    /// </summary>
    public record CancelOrderCommand(Guid OrderId, Guid BuyerId) : IRequest<Result>;

    public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand, Result>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CancelOrderCommandHandler(
            ICustomerOrderRepository orderRepository,
            IInventoryRepository inventoryRepository,
            IUnitOfWork unitOfWork)
        {
            _orderRepository = orderRepository;
            _inventoryRepository = inventoryRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(CancelOrderCommand request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result.NotFound("Order not found.");
            }

            if (order.Status != OrderStatus.Cart && order.Status != OrderStatus.PendingPayment)
            {
                return Result.Failure("Only an order in Cart or PendingPayment status can be cancelled by the buyer.");
            }

            try
            {
                if (order.Status == OrderStatus.PendingPayment)
                {
                    foreach (var item in order.Items)
                    {
                        var inventories = await _inventoryRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                        var reservedInventories = inventories
                            .Where(i => i.ReservedQuantity > 0)
                            .OrderByDescending(i => i.ReservedQuantity)
                            .ToList();

                        int remainingToReturn = item.Quantity;
                        foreach (var inventory in reservedInventories)
                        {
                            if (remainingToReturn <= 0) break;

                            var toReturn = Math.Min(inventory.ReservedQuantity, remainingToReturn);
                            if (toReturn > 0)
                            {
                                inventory.ReturnToAvailable(toReturn);
                                await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                                remainingToReturn -= toReturn;
                            }
                        }
                    }
                }

                order.CancelByBuyer();
                await _orderRepository.UpdateAsync(order, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result.Success();
            }
            catch (InvalidOperationException ex)
            {
                return Result.Failure(ex.Message);
            }
        }
    }
}
