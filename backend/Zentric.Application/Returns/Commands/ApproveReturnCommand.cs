using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Returns.Commands
{
    /// <summary>
    /// Aprueba una devolucion. Q-21b: solo la aprueba el vendedor cuyo producto se
    /// devuelve; la politica sigue siendo solo-Seller (ADDENDUM Dominio 10).
    /// </summary>
    public record ApproveReturnCommand(
        Guid ReturnRequestId,
        bool IsSameWarehouseAndVendor,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;

    public class ApproveReturnCommandHandler : IRequestHandler<ApproveReturnCommand, Result<bool>>
    {
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ReturnsApprovalService _approvalService;
        private readonly IProductRepository _productRepository;

        public ApproveReturnCommandHandler(
            IReturnRequestRepository returnRepository, 
            IUnitOfWork unitOfWork,
            ReturnsApprovalService approvalService,
            IProductRepository productRepository)
        {
            _returnRepository = returnRepository;
            _unitOfWork = unitOfWork;
            _approvalService = approvalService;
            _productRepository = productRepository;
        }

        public async Task<Result<bool>> Handle(ApproveReturnCommand request, CancellationToken cancellationToken)
        {
            var returnReq = await _returnRepository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            // Q-21b: la aprobacion es del vendedor del producto devuelto
            // (ADDENDUM Dominio 10). El mensaje es el de "no existe" para no
            // confirmar que esa devolucion existe y es de otro.
            var product = await _productRepository.GetByVariantIdAsync(returnReq.VariantId, cancellationToken);
            if (product == null || product.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound("Return request not found.");
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
