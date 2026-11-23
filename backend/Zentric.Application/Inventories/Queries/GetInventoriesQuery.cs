using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Inventories.Queries
{
    /// <summary>
    /// Listado paginado de existencias. <paramref name="Page"/> es de base cero;
    /// el borde HTTP traduce la pagina 1-based del cliente.
    /// </summary>
    public record GetInventoriesQuery(
        Guid CallerId,
        UserRole CallerRole,
        int Page = 0,
        int Size = PageRequest.DefaultPageSize,
        Guid? WarehouseId = null,
        string? Search = null) : IRequest<Result<PagedResult<InventoryDto>>>;

    public class GetInventoriesQueryHandler : IRequestHandler<GetInventoriesQuery, Result<PagedResult<InventoryDto>>>
    {
        private readonly IInventoryRepository _inventoryRepository;

        public GetInventoriesQueryHandler(IInventoryRepository inventoryRepository) => _inventoryRepository = inventoryRepository;

        public async Task<Result<PagedResult<InventoryDto>>> Handle(
            GetInventoriesQuery request, CancellationToken cancellationToken)
        {
            var vendorId = request.CallerRole == UserRole.Seller ? request.CallerId : (Guid?)null;
            var page = new PageRequest(request.Page, request.Size);

            // Filtros, conteo y pagina se resuelven en la misma consulta: filtrar
            // despues de leer dejaba el total y las filas mintiendo.
            var (items, totalItems) = await _inventoryRepository.GetPagedAsync(
                vendorId,
                request.WarehouseId,
                request.Search,
                page.Skip,
                page.Take,
                cancellationToken);

            var dtos = items
                .Select(row => new InventoryDto(
                    row.Inventory.Id,
                    row.Inventory.VariantId,
                    row.Inventory.WarehouseId,
                    row.Inventory.AvailableQuantity,
                    row.Inventory.ReservedQuantity,
                    row.Inventory.UsedQuantity,
                    row.Inventory.DamagedQuantity,
                    row.ProductName,
                    row.Sku))
                .ToList();

            return Result<PagedResult<InventoryDto>>.Success(
                new PagedResult<InventoryDto>(dtos, page.Page, page.Size, totalItems));
        }
    }
}
