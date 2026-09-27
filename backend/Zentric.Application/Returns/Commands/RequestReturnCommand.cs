using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;

namespace Zentric.Application.Returns.Commands
{
    public record RequestReturnCommand(Guid CustomerOrderId, Guid VariantId, Guid WarehouseId, int Quantity, ProductType ProductType) : IRequest<Result<Guid>>;

    public class RequestReturnCommandHandler : IRequestHandler<RequestReturnCommand, Result<Guid>>
    {
        private readonly IReturnRequestRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public RequestReturnCommandHandler(IReturnRequestRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(RequestReturnCommand request, CancellationToken cancellationToken)
        {
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
