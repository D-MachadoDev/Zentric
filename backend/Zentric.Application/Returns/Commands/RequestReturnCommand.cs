using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;

namespace Zentric.Application.Returns.Commands
{
    /// <summary>
    /// Radica una devolucion. Q-21b: <paramref name="BuyerId"/> es la identidad
    /// del llamante derivada del token; el handler verifica contra ella que el
    /// pedido a devolver sea propio (Dominio 2: el comprador nunca administra
    /// informacion de otros compradores).
    /// </summary>
    public record RequestReturnCommand(Guid CustomerOrderId, Guid VariantId, Guid WarehouseId, int Quantity, ProductType ProductType, Guid BuyerId) : IRequest<Result<Guid>>;

    public class RequestReturnCommandHandler : IRequestHandler<RequestReturnCommand, Result<Guid>>
    {
        private readonly IReturnRequestRepository _repository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICustomerOrderRepository _customerOrderRepository;

        public RequestReturnCommandHandler(
            IReturnRequestRepository repository,
            IUnitOfWork unitOfWork,
            ICustomerOrderRepository customerOrderRepository)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
            _customerOrderRepository = customerOrderRepository;
        }

        public async Task<Result<Guid>> Handle(RequestReturnCommand request, CancellationToken cancellationToken)
        {
            // Q-21b: solo se devuelve lo propio. El pedido se carga con el filtro
            // por comprador; si es de otro o no existe, responde igual ("Order
            // not found.") para no permitir enumeracion de pedidos ajenos.
            var order = await _customerOrderRepository.GetByIdForBuyerAsync(
                request.CustomerOrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result<Guid>.NotFound("Order not found.");
            }

            try
            {
                var returnReq = new ReturnRequest(request.CustomerOrderId, request.VariantId, request.WarehouseId, request.Quantity, request.ProductType);
                await _repository.AddAsync(returnReq, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                
                return Result<Guid>.Success(returnReq.Id);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
