using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Inventories.Queries
{
    public record GetInventoriesQuery(Guid CallerId, UserRole CallerRole, int Page = 0, int Size = PageRequest.DefaultPageSize) : IRequest<Result<PagedResult<InventoryDto>>>;

    public class GetInventoriesQueryHandler : IRequestHandler<GetInventoriesQuery, Result<PagedResult<InventoryDto>>>
    {
        private readonly IInventoryRepository _inventoryRepository;

        public GetInventoriesQueryHandler(IInventoryRepository inventoryRepository) => _inventoryRepository = inventoryRepository;

        public async Task<Result<PagedResult<InventoryDto>>> Handle(
            GetInventoriesQuery request, CancellationToken cancellationToken)
        {
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

            var page = new PageRequest(request.Page, request.Size);
            var paged = dtos.Skip(page.Skip).Take(page.Take).ToList();
            return Result<PagedResult<InventoryDto>>.Success(
                new PagedResult<InventoryDto>(paged, page.Page, page.Size, dtos.Count));
        }
    }
}
