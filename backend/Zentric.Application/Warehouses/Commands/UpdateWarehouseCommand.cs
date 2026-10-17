using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Application.Warehouses.Commands
{
    public record UpdateWarehouseCommand(
        Guid Id,
        string Name,
        string Location,
        int Capacity,
        bool IsActive,
        Guid CallerId,
        UserRole CallerRole
    ) : IRequest<Result>;

    public class UpdateWarehouseCommandHandler : IRequestHandler<UpdateWarehouseCommand, Result>
    {
        private readonly IWarehouseRepository _warehouseRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateWarehouseCommandHandler(IWarehouseRepository warehouseRepository, IUnitOfWork unitOfWork)
        {
            _warehouseRepository = warehouseRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(UpdateWarehouseCommand request, CancellationToken cancellationToken)
        {
            var warehouse = await _warehouseRepository.GetByIdAsync(request.Id, cancellationToken);
            if (warehouse is null)
            {
                return Result.NotFound($"Bodega con ID {request.Id} no encontrada.");
            }

            // Regla de autorizacion fina: el Vendedor solo puede editar sus bodegas propias.
            // El Administrador puede editar cualquier bodega (Marketplace o Vendor).
            if (request.CallerRole == UserRole.Seller && warehouse.VendorId != request.CallerId)
            {
                return Result.Failure("No tiene permisos para modificar una bodega que no le pertenece.");
            }

            try
            {
                // Si la bodega estaba inactiva y se desea activar o renombrar, activamos primero si se solicita
                if (request.IsActive && !warehouse.IsActive)
                {
                    warehouse.Activate();
                }

                if (warehouse.Name != request.Name)
                {
                    warehouse.Rename(request.Name);
                }

                if (warehouse.Location != request.Location)
                {
                    warehouse.Relocate(request.Location);
                }

                if (warehouse.Capacity != request.Capacity)
                {
                    warehouse.NewCapacity(request.Capacity);
                }

                if (!request.IsActive && warehouse.IsActive)
                {
                    warehouse.Deactivate();
                }

                await _warehouseRepository.UpdateAsync(warehouse, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result.Success();
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result.Failure(ex.Message);
            }
        }
    }
}
