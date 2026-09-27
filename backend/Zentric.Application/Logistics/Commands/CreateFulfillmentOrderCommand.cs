using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;

namespace Zentric.Application.Logistics.Commands
{
    public record CreateFulfillmentOrderCommand(Guid CustomerOrderId, Guid VendorId) : IRequest<Result<Guid>>;

    public class CreateFulfillmentOrderCommandHandler : IRequestHandler<CreateFulfillmentOrderCommand, Result<Guid>>
    {
        private readonly IFulfillmentOrderRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateFulfillmentOrderCommandHandler(IFulfillmentOrderRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(CreateFulfillmentOrderCommand request, CancellationToken cancellationToken)
        {
            var order = new FulfillmentOrder(request.CustomerOrderId, request.VendorId);
            await _repository.AddAsync(order, cancellationToken);

            // Sin guardar, la orden de despacho no llega a la base.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(order.Id);
        }
    }
}
