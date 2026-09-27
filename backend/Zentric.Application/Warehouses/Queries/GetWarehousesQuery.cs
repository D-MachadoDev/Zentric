using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Warehouses.Queries
{
    public record WarehouseDto(Guid Id, string Name, string Location, int Capacity, string Type, Guid? VendorId, bool IsActive, DateTime CreatedAt);

    public record GetWarehousesQuery(Guid? VendorId = null) : IRequest<Result<IReadOnlyList<WarehouseDto>>>;

    public class GetWarehousesQueryHandler : IRequestHandler<GetWarehousesQuery, Result<IReadOnlyList<WarehouseDto>>>
    {
        private readonly IWarehouseRepository _warehouseRepository;

        public GetWarehousesQueryHandler(IWarehouseRepository warehouseRepository)
        {
            _warehouseRepository = warehouseRepository;
        }

        public async Task<Result<IReadOnlyList<WarehouseDto>>> Handle(GetWarehousesQuery request, CancellationToken cancellationToken)
        {
            var list = await _warehouseRepository.GetAllAsync(request.VendorId, cancellationToken);
            var dtos = list.Select(w => new WarehouseDto(
                w.Id,
                w.Name,
                w.Location,
                w.Capacity,
                w.Type.ToString(),
                w.VendorId,
                w.IsActive,
                w.CreatedAt
            )).ToList();

            return Result<IReadOnlyList<WarehouseDto>>.Success(dtos);
        }
    }

    public record GetWarehouseByIdQuery(Guid Id) : IRequest<Result<WarehouseDto>>;

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

            var dto = new WarehouseDto(
                w.Id,
                w.Name,
                w.Location,
                w.Capacity,
                w.Type.ToString(),
                w.VendorId,
                w.IsActive,
                w.CreatedAt
            );

            return Result<WarehouseDto>.Success(dto);
        }
    }
}
