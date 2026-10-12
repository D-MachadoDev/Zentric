using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Returns.Commands
{
    /// <summary>
    /// Rechaza una devolucion ya solicitada (ADDENDUM Dominio 10, estado "Rechazada").
    ///
    /// Este estado existia en el enum y en <c>ReturnRequest.Reject()</c>, pero no habia comando ni
    /// endpoint: una devolucion podia solicitarse, inspeccionarse y aprobarse, pero nunca rechazarse.
    /// El ciclo de posventa estaba truncado.
    ///
    /// Quien rechaza: el **Vendedor** del producto, la misma persona que aprueba. La Ley asigna la
    /// decision al Vendedor ("Si es asi, requiere la aprobacion del Vendedor"); Rechazada es esa
    /// misma decision negada, asi que no hace falta inventar un actor nuevo. Se reutiliza la
    /// politica <c>ReturnApprove</c> en vez de crear otra, porque separar "puede aprobar" y "puede
    /// rechazar" no aporta nada: quien puede decir si, puede decir no.
    /// </summary>
    public record RejectReturnCommand(
        Guid ReturnRequestId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;

    public class RejectReturnCommandHandler : IRequestHandler<RejectReturnCommand, Result<bool>>
    {
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RejectReturnCommandHandler(
            IReturnRequestRepository returnRepository,
            IProductRepository productRepository,
            IUnitOfWork unitOfWork)
        {
            _returnRepository = returnRepository;
            _productRepository = productRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(RejectReturnCommand request, CancellationToken cancellationToken)
        {
            var returnReq = await _returnRepository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            // Q-21b: el rechazo es del vendedor del producto. El mensaje es el de "no existe" para
            // no confirmar que esa devolucion existe y es de otro.
            var product = await _productRepository.GetByVariantIdAsync(returnReq.VariantId, cancellationToken);
            if (product == null || product.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            try
            {
                returnReq.Reject();

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