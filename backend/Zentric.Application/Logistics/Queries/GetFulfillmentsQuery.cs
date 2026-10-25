using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Logistics.Enums;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Queries
{
    /// <summary>
    /// Listado de despachos: la cola de trabajo del Operador y del Vendedor.
    ///
    /// Devuelve el MISMO <see cref="FulfillmentOrderDto"/> que el detalle. No se crea un DTO de
    /// fila aparte a proposito: el mismo dato no debe tener dos formas segun venga de una pantalla
    /// o de otra, porque el frontend acabaria pidiendo una conversion en cada pantalla.
    /// </summary>
    public record GetFulfillmentsQuery(Guid CallerId, UserRole CallerRole, FulfillmentStatus? Status)
        : IRequest<Result<IReadOnlyList<FulfillmentOrderDto>>>;

    public class GetFulfillmentsQueryHandler
        : IRequestHandler<GetFulfillmentsQuery, Result<IReadOnlyList<FulfillmentOrderDto>>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;

        public GetFulfillmentsQueryHandler(IFulfillmentOrderRepository fulfillmentRepository)
            => _fulfillmentRepository = fulfillmentRepository;

        public async Task<Result<IReadOnlyList<FulfillmentOrderDto>>> Handle(
            GetFulfillmentsQuery request, CancellationToken cancellationToken)
        {
            // Cada rol se queda en lo suyo. El Comprador ve los despachos de SUS pedidos, el
            // Vendedor los suyos, y Operador, Administrador y Supervisor la cola completa: es
            // literalmente su pantalla de trabajo.
            Guid? vendorId = null;
            Guid? buyerId = null;

            switch (request.CallerRole)
            {
                case UserRole.Seller:
                    vendorId = request.CallerId;
                    break;

                case UserRole.Buyer:
                    buyerId = request.CallerId;
                    break;

                default:
                    break;
            }

            var orders = await _fulfillmentRepository.GetListAsync(
                vendorId, buyerId, request.Status, cancellationToken);

            var items = orders
                .Select(order => new FulfillmentOrderDto(
                    order.Id,
                    order.CustomerOrderId,
                    order.VendorId,
                    order.Status.ToString(),
                    order.CancellationReason,
                    order.Shipments
                        .Select(s => new ShipmentDto(s.Id, s.WarehouseId, s.TrackingNumber))
                        .ToList(),
                    order.CreatedAt))
                .ToList();

            return Result<IReadOnlyList<FulfillmentOrderDto>>.Success(items);
        }
    }
}
