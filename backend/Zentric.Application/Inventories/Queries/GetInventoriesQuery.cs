using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Inventories.Queries
{
    /// <summary>
    /// Listado de existencias.
    ///
    /// Devuelve el MISMO <see cref="InventoryDto"/> que el detalle por variante. El reparto por rol
    /// es identico al de ahi: el Vendedor ve el stock de SUS productos, el Operador ve la
    /// red completa porque el stock de la red es su trabajo, y el resto sin filtro.
    /// </summary>
    public record GetInventoriesQuery(Guid CallerId, UserRole CallerRole) : IRequest<Result<IReadOnlyList<InventoryDto>>>;

    public class GetInventoriesQueryHandler : IRequestHandler<GetInventoriesQuery, Result<IReadOnlyList<InventoryDto>>>
    {
        private readonly IInventoryRepository _inventoryRepository;

        public GetInventoriesQueryHandler(IInventoryRepository inventoryRepository) => _inventoryRepository = inventoryRepository;

        public async Task<Result<IReadOnlyList<InventoryDto>>> Handle(
            GetInventoriesQuery request, CancellationToken cancellationToken)
        {
            // Solo el Vendedor queda encerrado en su stock. El Comprador no es un rol de esta
            // pantalla: su stock lo ve a traves del catalogo, no de la tabla de existencias.
            var vendorId = request.CallerRole == UserRole.Seller ? request.CallerId : (Guid?)null;

            var inventories = await _inventoryRepository.GetListAsync(vendorId, cancellationToken);

            var dtos = inventories
                .Select(i => new InventoryDto(
                    i.Id,
                    i.VariantId,
                    i.WarehouseId,
                    i.AvailableQuantity,
                    i.ReservedQuantity,
                    i.UsedQuantity,
                    i.DamagedQuantity))
                .ToList();

            return Result<IReadOnlyList<InventoryDto>>.Success(dtos);
        }
    }
}
