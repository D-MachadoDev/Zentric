using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;

namespace Zentric.Application.Inventories.Commands
{
    public record AddStockCommand(
        Guid VariantId,
        Guid WarehouseId,
        int Quantity
    ) : IRequest<Result<Guid>>;

    public class AddStockCommandHandler : IRequestHandler<AddStockCommand, Result<Guid>>
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IUnitOfWork _unitOfWork;

        public AddStockCommandHandler(IInventoryRepository inventoryRepository, IUnitOfWork unitOfWork)
        {
            _inventoryRepository = inventoryRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(AddStockCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var inventory = await _inventoryRepository.GetByVariantAndWarehouseAsync(
                    request.VariantId,
                    request.WarehouseId,
                    cancellationToken);

                if (inventory != null)
                {
                    inventory.AddStock(request.Quantity);
                    await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                }
                else
                {
                    inventory = new Inventory(
                        request.VariantId,
                        request.WarehouseId,
                        request.Quantity,
                        0,
                        0,
                        0);
                    await _inventoryRepository.AddAsync(inventory, cancellationToken);
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result<Guid>.Success(inventory.Id);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
