using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Enums;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Handler para remover una línea del carrito.
    ///
    /// P2: El carrito vacío permanece en estado Cart (navegable).
    /// P3: No se emite evento de dominio al remover ítem.
    /// </summary>
    public class RemoveOrderItemCommandHandler : IRequestHandler<RemoveOrderItemCommand, Result>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveOrderItemCommandHandler(
            ICustomerOrderRepository orderRepository,
            IUnitOfWork unitOfWork)
        {
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(RemoveOrderItemCommand request, CancellationToken cancellationToken)
        {
            // El pedido se carga con el filtro por comprador; un carrito
            // ajeno se trata igual que uno inexistente.
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);

            if (order == null)
            {
                return Result.NotFound("Order not found.");
            }

            if (order.Status != OrderStatus.Cart)
            {
                return Result.Failure("Items can only be removed while the order is in the Cart status.");
            }

            try
            {
                order.RemoveItem(request.VariantId);
            }
            catch (InvalidOperationException ex)
            {
                return Result.Failure(ex.Message);
            }

            await _orderRepository.UpdateAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}