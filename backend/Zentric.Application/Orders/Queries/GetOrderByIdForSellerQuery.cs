using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;

namespace Zentric.Application.Orders.Queries
{
    /// <summary>
    /// Vista del pedido para un vendedor participante (Q-21b, dictamen A).
    ///
    /// El vendedor ve el estado del pedido, SUS lineas y SU subtotal. No ve el
    /// total completo, ni el BuyerId, ni las lineas de otros vendedores: en un
    /// pedido multi-vendedor eso filtraria precios y volumenes de la
    /// competencia, que es justo lo que el dictamen descarto al elegir la
    /// "vista filtrada" (P2 de la ronda 2).
    /// </summary>
    public record SellerOrderViewDto(
        Guid Id,
        string Status,
        string Currency,
        IReadOnlyList<OrderItemDto> Items,
        decimal VendorSubtotal,
        DateTime CreatedAt);

    public record GetOrderByIdForSellerQuery(Guid OrderId, Guid VendorId) : IRequest<Result<SellerOrderViewDto>>;

    public class GetOrderByIdForSellerQueryHandler
        : IRequestHandler<GetOrderByIdForSellerQuery, Result<SellerOrderViewDto>>
    {
        private readonly ICustomerOrderRepository _orderRepository;

        public GetOrderByIdForSellerQueryHandler(ICustomerOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        public async Task<Result<SellerOrderViewDto>> Handle(
            GetOrderByIdForSellerQuery request, CancellationToken cancellationToken)
        {
            // El filtro por vendedor viaja a la consulta: un pedido donde el
            // llamante no participa devuelve null, igual que uno inexistente.
            var order = await _orderRepository.GetByIdForVendorAsync(
                request.OrderId, request.VendorId, cancellationToken);

            if (order == null)
            {
                // Mismo mensaje para "no existe" y "no participo": distinguirlos
                // permitiria enumerar pedidos ajenos probando GUIDs.
                return Result<SellerOrderViewDto>.NotFound("Order not found.");
            }

            var vendorItems = order.Items
                .Where(i => i.VendorId == request.VendorId)
                .Select(i => new OrderItemDto(
                    i.Id,
                    i.VariantId,
                    i.Quantity,
                    i.UnitPrice.Amount,
                    i.TotalPrice.Amount))
                .ToList();

            var dto = new SellerOrderViewDto(
                order.Id,
                order.Status.ToString(),
                order.TotalAmount.Currency,
                vendorItems,
                vendorItems.Sum(i => i.TotalPrice),
                order.CreatedAt);

            return Result<SellerOrderViewDto>.Success(dto);
        }
    }
}
