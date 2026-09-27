using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;

namespace Zentric.Application.Orders.Queries
{
    public record OrderItemDto(Guid Id, Guid VariantId, int Quantity, decimal UnitPrice, decimal TotalPrice);

    public record OrderDto(
        Guid Id,
        Guid BuyerId,
        string Status,
        decimal TotalAmount,
        string Currency,
        IReadOnlyList<OrderItemDto> Items,
        DateTime CreatedAt);

    /// <summary>
    /// Consulta de un pedido restringida a su comprador.
    ///
    /// <see cref="GetOrderByIdQuery"/> queda sin verificar, a proposito: la usan
    /// los flujos internos (pago, checkout) donde el comprador ya es conocido.
    /// Esta variante es la que usan los endpoints HTTP, para que un comprador no
    /// pueda leer el pedido de otro (ZENTRIC.md Dominio 2).
    /// </summary>
    public record GetOrderByIdForBuyerQuery(Guid OrderId, Guid BuyerId) : IRequest<Result<OrderDto>>;

    public class GetOrderByIdForBuyerQueryHandler
        : IRequestHandler<GetOrderByIdForBuyerQuery, Result<OrderDto>>
    {
        private readonly ICustomerOrderRepository _orderRepository;

        public GetOrderByIdForBuyerQueryHandler(ICustomerOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        public async Task<Result<OrderDto>> Handle(
            GetOrderByIdForBuyerQuery request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);

            if (order == null)
            {
                // Mismo mensaje para "no existe" y "es de otro": filtrar esa
                // diferencia permitiria enumerar pedidos ajenos probando GUIDs.
                return Result<OrderDto>.Failure("Order not found.");
            }

            var dto = new OrderDto(
                order.Id,
                order.BuyerId,
                order.Status.ToString(),
                order.TotalAmount.Amount,
                order.TotalAmount.Currency,
                order.Items.Select(i => new OrderItemDto(
                    i.Id,
                    i.VariantId,
                    i.Quantity,
                    i.UnitPrice.Amount,
                    i.TotalPrice.Amount
                )).ToList(),
                order.CreatedAt
            );

            return Result<OrderDto>.Success(dto);
        }
    }

    public record GetOrderByIdQuery(Guid OrderId) : IRequest<Result<OrderDto>>;

    public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, Result<OrderDto>>
    {
        private readonly ICustomerOrderRepository _orderRepository;

        public GetOrderByIdQueryHandler(ICustomerOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        public async Task<Result<OrderDto>> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
            if (order == null)
            {
                return Result<OrderDto>.Failure("Order not found.");
            }

            var dto = new OrderDto(
                order.Id,
                order.BuyerId,
                order.Status.ToString(),
                order.TotalAmount.Amount,
                order.TotalAmount.Currency,
                order.Items.Select(i => new OrderItemDto(
                    i.Id,
                    i.VariantId,
                    i.Quantity,
                    i.UnitPrice.Amount,
                    i.TotalPrice.Amount
                )).ToList(),
                order.CreatedAt
            );

            return Result<OrderDto>.Success(dto);
        }
    }
}
