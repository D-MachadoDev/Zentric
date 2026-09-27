using MediatR;
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
