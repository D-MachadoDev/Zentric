using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Orders.Queries
{
    /// <summary>
    /// Fila del listado de pedidos.
    ///
    /// Reutiliza <see cref="OrderItemDto"/> del detalle a proposito: el mismo dato no debe tener
    /// dos formas segun de que pantalla venga, porque el frontend acabaria pidiendo una conversion.
    ///
    /// Deliberadamente NO lleva el total completo ni el BuyerId para el Vendedor: son los datos
    /// que el dictamen de Q-21b decidio no exponer. En su lugar el <c>TotalAmount</c> que llega es
    /// el SUBTOTAL de sus lineas, calculado en el handler.
    /// </summary>
    public record OrderListItemDto(
        Guid Id,
        string Status,
        string Currency,
        decimal TotalAmount,
        IReadOnlyList<OrderItemDto> Items,
        int ItemCount,
        Guid? BuyerId,
        DateTime CreatedAt);

    /// <summary>
    /// Listado de pedidos.
    ///
    /// Que el filtro se decida aqui y no en el endpoint es lo que mantiene la regla: el
    /// repositorio recibe identificadores ya resueltos, nunca el rol. Si el filtro viviera en el
    /// repositorio, bastaria un endpoint nuevo que lo olvidara para abrir una via de fuga.
    /// </summary>
    public record GetOrdersQuery(Guid CallerId, UserRole CallerRole, OrderStatus? Status) : IRequest<Result<IReadOnlyList<OrderListItemDto>>>;

    public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, Result<IReadOnlyList<OrderListItemDto>>>
    {
        private readonly ICustomerOrderRepository _orderRepository;

        public GetOrdersQueryHandler(ICustomerOrderRepository orderRepository) => _orderRepository = orderRepository;

        public async Task<Result<IReadOnlyList<OrderListItemDto>>> Handle(
            GetOrdersQuery request, CancellationToken cancellationToken)
        {
            Guid? buyerId = null;
            Guid? vendorId = null;

            switch (request.CallerRole)
            {
                case UserRole.Buyer:
                    buyerId = request.CallerId;
                    break;

                case UserRole.Seller:
                    vendorId = request.CallerId;
                    break;

                // Administrator, LogisticsOperator y Supervisor: sin filtro de dueno. Es
                // deliberado y es la reparacion de un 404 que antes hacia imposible el trabajo
                // operativo: nadie con rol operativo podia ver la cola de despachos.
                default:
                    break;
            }

            var orders = await _orderRepository.GetListAsync(buyerId, vendorId, request.Status, cancellationToken);

            var items = orders
                .Select(order =>
                {
                    // El Vendedor solo ve SUS lineas en el listado, igual que en el detalle: el
                    // mismo criterio en los dos, o el listado le(filter)aria informacion que al
                    // abrir el pedido se le negaria.
                    var visible = request.CallerRole == UserRole.Seller
                        ? order.Items.Where(i => i.VendorId == request.CallerId).ToList()
                        : order.Items.ToList();

                    return new OrderListItemDto(
                        order.Id,
                        order.Status.ToString(),
                        order.TotalAmount.Currency,
                        request.CallerRole == UserRole.Seller ? visible.Sum(i => i.TotalPrice.Amount) : order.TotalAmount.Amount,
                        visible
                            .Select(i => new OrderItemDto(
                                i.Id, i.VariantId, i.Quantity, i.UnitPrice.Amount, i.TotalPrice.Amount))
                            .ToList(),
                        visible.Count,
                        request.CallerRole == UserRole.Seller ? (Guid?)null : order.BuyerId,
                        order.CreatedAt);
                })
                .ToList();

            return Result<IReadOnlyList<OrderListItemDto>>.Success(items);
        }
    }
}