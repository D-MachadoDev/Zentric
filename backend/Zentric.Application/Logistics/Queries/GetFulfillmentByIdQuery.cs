using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Users.Enums;

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

    /// <summary>
    /// Despacho por id. Q-21b: la visibilidad depende del rol del llamante (ver
    /// el handler); un recurso ajeno responde igual que uno inexistente.
    /// </summary>
    public record GetFulfillmentByIdQuery(Guid Id, Guid CallerId, UserRole CallerRole) : IRequest<Result<FulfillmentOrderDto>>;

    public class GetFulfillmentByIdQueryHandler : IRequestHandler<GetFulfillmentByIdQuery, Result<FulfillmentOrderDto>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;

        public GetFulfillmentByIdQueryHandler(
            IFulfillmentOrderRepository fulfillmentRepository,
            ICustomerOrderRepository customerOrderRepository)
        {
            _fulfillmentRepository = fulfillmentRepository;
            _customerOrderRepository = customerOrderRepository;
        }

        public async Task<Result<FulfillmentOrderDto>> Handle(GetFulfillmentByIdQuery request, CancellationToken cancellationToken)
        {
            var fulfillment = await _fulfillmentRepository.GetByIdAsync(request.Id, cancellationToken);
            if (fulfillment == null)
            {
                return Result<FulfillmentOrderDto>.Failure("Fulfillment order not found.");
            }

            // Q-21b: la visibilidad depende del rol. Un recurso ajeno responde
            // igual que uno inexistente (anti-enumeracion).
            var isVisible = request.CallerRole switch
            {
                UserRole.Buyer => await IsBuyersFulfillmentAsync(fulfillment, request.CallerId, cancellationToken),
                UserRole.Seller => fulfillment.VendorId == request.CallerId,
                // Operador, Administrador y Supervisor: sin filtro de dueno.
                _ => true,
            };

            if (!isVisible)
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

        /// <summary>Comprador: el despacho debe ser de un pedido suyo (Dominio 2).</summary>
        private async Task<bool> IsBuyersFulfillmentAsync(FulfillmentOrder fulfillment, Guid buyerId, CancellationToken cancellationToken)
        {
            var order = await _customerOrderRepository.GetByIdForBuyerAsync(
                fulfillment.CustomerOrderId, buyerId, cancellationToken);
            return order != null;
        }
    }
}
