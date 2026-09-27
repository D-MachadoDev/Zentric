using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders;

namespace Zentric.Application.Orders.Commands
{
    public record CreateCartCommand(Guid BuyerId) : IRequest<Result<Guid>>;

    public class CreateCartCommandHandler : IRequestHandler<CreateCartCommand, Result<Guid>>
    {
        private readonly ICustomerOrderRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateCartCommandHandler(ICustomerOrderRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(CreateCartCommand request, CancellationToken cancellationToken)
        {
            var order = new CustomerOrder(request.BuyerId);

            await _repository.AddAsync(order, cancellationToken);

            // Sin guardar, el carrito existe solo en el DbContext y no llega a la base:
            // cualquier lectura posterior responderia "Order not found".
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(order.Id);
        }
    }
}
