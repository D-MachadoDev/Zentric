using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Logistics.Ports;

namespace Zentric.Application.Logistics.Queries
{
    public record ShipmentDto(Guid Id, Guid WarehouseId, string TrackingNumber);

    public record FulfillmentOrderDto(
        Guid Id,
        Guid CustomerOrderId,
        Guid VendorId,
        string Status,
        string? CancellationReason,
        IReadOnlyList<ShipmentDto> Shipments,
        DateTime CreatedAt);

    public record GetFulfillmentByIdQuery(Guid Id) : IRequest<Result<FulfillmentOrderDto>>;

    public class GetFulfillmentByIdQueryHandler : IRequestHandler<GetFulfillmentByIdQuery, Result<FulfillmentOrderDto>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;

        public GetFulfillmentByIdQueryHandler(IFulfillmentOrderRepository fulfillmentRepository)
        {
            _fulfillmentRepository = fulfillmentRepository;
        }

        public async Task<Result<FulfillmentOrderDto>> Handle(GetFulfillmentByIdQuery request, CancellationToken cancellationToken)
        {
            var fulfillment = await _fulfillmentRepository.GetByIdAsync(request.Id, cancellationToken);
            if (fulfillment == null)
            {
                return Result<FulfillmentOrderDto>.Failure("Fulfillment order not found.");
            }

            var dto = new FulfillmentOrderDto(
                fulfillment.Id,
                fulfillment.CustomerOrderId,
                fulfillment.VendorId,
                fulfillment.Status.ToString(),
                fulfillment.CancellationReason,
                fulfillment.Shipments.Select(s => new ShipmentDto(s.Id, s.WarehouseId, s.TrackingNumber)).ToList(),
                fulfillment.CreatedAt
            );

            return Result<FulfillmentOrderDto>.Success(dto);
        }
    }
}
