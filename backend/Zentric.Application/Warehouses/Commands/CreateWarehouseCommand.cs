using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Warehouses.Commands
{
    public record CreateWarehouseCommand(
        string Name,
        string Location,
        int Capacity,
        WarehouseType Type,
        Guid? VendorId
    ) : IRequest<Result<Guid>>;

    public class CreateWarehouseCommandHandler : IRequestHandler<CreateWarehouseCommand, Result<Guid>>
    {
        private readonly IWarehouseRepository _warehouseRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateWarehouseCommandHandler(IWarehouseRepository warehouseRepository, IUnitOfWork unitOfWork)
        {
            _warehouseRepository = warehouseRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(CreateWarehouseCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var warehouse = new Warehouse(
                    request.Name,
                    request.Location,
                    request.Capacity,
                    request.Type,
                    request.VendorId
                );

                await _warehouseRepository.AddAsync(warehouse, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<Guid>.Success(warehouse.Id);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
