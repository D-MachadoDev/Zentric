using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Warehouses.Queries
{
    public record WarehouseDto(Guid Id, string Name, string Location, int Capacity, string Type, Guid? VendorId, bool IsActive, DateTime CreatedAt);

    /// <summary>
    /// Mapeo de bodega a DTO. Vive aqui porque lo comparten los dos handlers de
    /// este bounded context: la forma de la entidad no debe duplicarse.
    /// </summary>
    internal static class WarehouseMapper
    {
        internal static WarehouseDto ToDto(Warehouse w) => new(
            w.Id, w.Name, w.Location, w.Capacity, w.Type.ToString(), w.VendorId, w.IsActive, w.CreatedAt);
    }

    /// <summary>
    /// Listado de bodegas. Q-21b: el Vendedor queda encerrado en las suyas.
    /// Pedir las de otro vendedor responde 400 en vez de devolver en silencio las
    /// propias: el filtro pedido y el aplicado serian distintos, y responder como
    /// si nada oculta el limite.
    /// </summary>
    public record GetWarehousesQuery(Guid? VendorId, Guid CallerId, UserRole CallerRole) : IRequest<Result<IReadOnlyList<WarehouseDto>>>;

    public class GetWarehousesQueryHandler : IRequestHandler<GetWarehousesQuery, Result<IReadOnlyList<WarehouseDto>>>
    {
        private readonly IWarehouseRepository _warehouseRepository;

        public GetWarehousesQueryHandler(IWarehouseRepository warehouseRepository)
        {
            _warehouseRepository = warehouseRepository;
        }

        public async Task<Result<IReadOnlyList<WarehouseDto>>> Handle(GetWarehousesQuery request, CancellationToken cancellationToken)
        {
            if (request.CallerRole == UserRole.Seller)
            {
                if (request.VendorId.HasValue && request.VendorId.Value != request.CallerId)
                {
                    return Result<IReadOnlyList<WarehouseDto>>.Failure(
                        "A seller can only list their own warehouses.");
                }

                var own = await _warehouseRepository.GetAllAsync(request.CallerId, cancellationToken);
                return Result<IReadOnlyList<WarehouseDto>>.Success(own.Select(WarehouseMapper.ToDto).ToList());
            }

            // Operador y Administrador: sin restriccion de dueno.
            var list = await _warehouseRepository.GetAllAsync(request.VendorId, cancellationToken);
            return Result<IReadOnlyList<WarehouseDto>>.Success(list.Select(WarehouseMapper.ToDto).ToList());
        }
    }

    /// <summary>
    /// Detalle de bodega. Q-21b: el Vendedor solo lee las suyas; una bodega de
    /// otro responde igual que una inexistente.
    /// </summary>
    public record GetWarehouseByIdQuery(Guid Id, Guid CallerId, UserRole CallerRole) : IRequest<Result<WarehouseDto>>;

    public class GetWarehouseByIdQueryHandler : IRequestHandler<GetWarehouseByIdQuery, Result<WarehouseDto>>
    {
        private readonly IWarehouseRepository _warehouseRepository;

        public GetWarehouseByIdQueryHandler(IWarehouseRepository warehouseRepository)
        {
            _warehouseRepository = warehouseRepository;
        }

        public async Task<Result<WarehouseDto>> Handle(GetWarehouseByIdQuery request, CancellationToken cancellationToken)
        {
            var w = await _warehouseRepository.GetByIdAsync(request.Id, cancellationToken);
            if (w == null)
            {
                return Result<WarehouseDto>.Failure("Warehouse not found.");
            }

            // Q-21b: la bodega de otro vendedor se trata como inexistente.
            if (request.CallerRole == UserRole.Seller && w.VendorId != request.CallerId)
            {
                return Result<WarehouseDto>.Failure("Warehouse not found.");
            }

            return Result<WarehouseDto>.Success(WarehouseMapper.ToDto(w));
        }
    }
}
