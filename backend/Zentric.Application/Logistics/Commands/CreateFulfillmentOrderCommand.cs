using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Crea un despacho. Q-21b: el Vendedor solo puede crear despachos a su
    /// nombre; el Operador puede crearlos para cualquier vendedor, porque
    /// preparar y despachar en bodega es su rol.
    /// </summary>
    public record CreateFulfillmentOrderCommand(
        Guid CustomerOrderId,
        Guid VendorId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<Guid>>;

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
            // Q-21b: el vendedor no puede crear despachos a nombre de otro.
            if (request.CallerRole == UserRole.Seller && request.VendorId != request.CallerId)
            {
                return Result<Guid>.Failure("A seller can only create fulfillments for themselves.");
            }

            var order = new FulfillmentOrder(request.CustomerOrderId, request.VendorId);
            await _repository.AddAsync(order, cancellationToken);

            // Sin guardar, la orden de despacho no llega a la base.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(order.Id);
        }
    }
}
