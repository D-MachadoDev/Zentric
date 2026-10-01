using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Enums;

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

    /// <summary>
    /// Stock de una variante. Q-21b: el Vendedor solo ve el stock de SUS
    /// productos, esten donde esten; la variante de otro se trata como
    /// inexistente. El Operador ve cualquiera: el stock de la red es su trabajo.
    /// </summary>
    public record GetInventoryByVariantQuery(Guid VariantId, Guid CallerId, UserRole CallerRole) : IRequest<Result<IReadOnlyList<InventoryDto>>>;

    public class GetInventoryByVariantQueryHandler : IRequestHandler<GetInventoryByVariantQuery, Result<IReadOnlyList<InventoryDto>>>
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IProductRepository _productRepository;

        public GetInventoryByVariantQueryHandler(
            IInventoryRepository inventoryRepository,
            IProductRepository productRepository)
        {
            _inventoryRepository = inventoryRepository;
            _productRepository = productRepository;
        }

        public async Task<Result<IReadOnlyList<InventoryDto>>> Handle(GetInventoryByVariantQuery request, CancellationToken cancellationToken)
        {
            if (request.CallerRole == UserRole.Seller)
            {
                // El dueno del stock es el dueno del producto: sus bienes se leen
                // aunque esten en la bodega de otro (hub del Marketplace incluida).
                var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
                if (product == null || product.VendorId != request.CallerId)
                {
                    return Result<IReadOnlyList<InventoryDto>>.NotFound("Variant not found.");
                }
            }

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
