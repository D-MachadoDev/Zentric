using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;

namespace Zentric.Application.Returns.Commands
{
    public record ApproveReturnCommand(Guid ReturnRequestId, bool IsSameWarehouseAndVendor) : IRequest<Result<bool>>;

    public class ApproveReturnCommandHandler : IRequestHandler<ApproveReturnCommand, Result<bool>>
    {
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ReturnsApprovalService _approvalService;

        public ApproveReturnCommandHandler(
            IReturnRequestRepository returnRepository, 
            IUnitOfWork unitOfWork,
            ReturnsApprovalService approvalService)
        {
            _returnRepository = returnRepository;
            _unitOfWork = unitOfWork;
            _approvalService = approvalService;
        }

        public async Task<Result<bool>> Handle(ApproveReturnCommand request, CancellationToken cancellationToken)
        {
            var returnReq = await _returnRepository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.Failure("Return request not found.");
            }

            try
            {
                _approvalService.ApproveReturn(returnReq, request.IsSameWarehouseAndVendor);
                
                await _returnRepository.UpdateAsync(returnReq, cancellationToken);
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
