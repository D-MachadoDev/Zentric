using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;

namespace Zentric.Application.Inventories.Queries
{
    public record InventoryDto(
        Guid Id,
        Guid VariantId,
        Guid WarehouseId,
        int AvailableQuantity,
        int ReservedQuantity,
        int UsedQuantity,
        int DamagedQuantity);

    public record GetInventoryByVariantQuery(Guid VariantId) : IRequest<Result<IReadOnlyList<InventoryDto>>>;

    public class GetInventoryByVariantQueryHandler : IRequestHandler<GetInventoryByVariantQuery, Result<IReadOnlyList<InventoryDto>>>
    {
        private readonly IInventoryRepository _inventoryRepository;

        public GetInventoryByVariantQueryHandler(IInventoryRepository inventoryRepository)
        {
            _inventoryRepository = inventoryRepository;
        }

        public async Task<Result<IReadOnlyList<InventoryDto>>> Handle(GetInventoryByVariantQuery request, CancellationToken cancellationToken)
        {
            var inventories = await _inventoryRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
            var dtos = inventories.Select(i => new InventoryDto(
                i.Id,
                i.VariantId,
                i.WarehouseId,
                i.AvailableQuantity,
                i.ReservedQuantity,
                i.UsedQuantity,
                i.DamagedQuantity
            )).ToList();

            return Result<IReadOnlyList<InventoryDto>>.Success(dtos);
        }
    }
}
