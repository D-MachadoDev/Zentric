using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Returns.Ports;

namespace Zentric.Application.Returns.Commands
{
    public record InspectReturnCommand(Guid ReturnRequestId, bool IsGoodCondition) : IRequest<Result<bool>>;

    public class InspectReturnCommandHandler : IRequestHandler<InspectReturnCommand, Result<bool>>
    {
        private readonly IReturnRequestRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public InspectReturnCommandHandler(IReturnRequestRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(InspectReturnCommand request, CancellationToken cancellationToken)
        {
            var returnReq = await _repository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            try
            {
                returnReq.InspectByLogistics(request.IsGoodCondition);
                await _repository.UpdateAsync(returnReq, cancellationToken);

                // Sin guardar, el dictamen de inspeccion se pierde.
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
