using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Returns.Queries
{
    public record ReturnRequestDto(
        Guid Id,
        Guid CustomerOrderId,
        Guid VariantId,
        Guid WarehouseId,
        int Quantity,
        string Status,
        bool IsGoodCondition,
        bool VendorApproved,
        DateTime CreatedAt);

    /// <summary>
    /// Devolucion por id. Q-21b: la visibilidad depende del rol del llamante
    /// (ver el handler); un recurso ajeno responde igual que uno inexistente.
    /// </summary>
    public record GetReturnByIdQuery(Guid Id, Guid CallerId, UserRole CallerRole) : IRequest<Result<ReturnRequestDto>>;

    public class GetReturnByIdQueryHandler : IRequestHandler<GetReturnByIdQuery, Result<ReturnRequestDto>>
    {
        private readonly IReturnRequestRepository _returnRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;
        private readonly IProductRepository _productRepository;

        public GetReturnByIdQueryHandler(
            IReturnRequestRepository returnRepository,
            ICustomerOrderRepository customerOrderRepository,
            IProductRepository productRepository)
        {
            _returnRepository = returnRepository;
            _customerOrderRepository = customerOrderRepository;
            _productRepository = productRepository;
        }

        public async Task<Result<ReturnRequestDto>> Handle(GetReturnByIdQuery request, CancellationToken cancellationToken)
        {
            var ret = await _returnRepository.GetByIdAsync(request.Id, cancellationToken);
            if (ret == null)
            {
                return Result<ReturnRequestDto>.NotFound("Return request not found.");
            }

            // Q-21b: la visibilidad depende del rol. Un recurso ajeno responde
            // igual que uno inexistente (anti-enumeracion).
            var isVisible = request.CallerRole switch
            {
                UserRole.Buyer => await IsBuyersReturnAsync(ret, request.CallerId, cancellationToken),
                UserRole.Seller => await IsSellersReturnAsync(ret, request.CallerId, cancellationToken),
                // Operador, Administrador y Supervisor: sin filtro de dueno.
                _ => true,
            };

            if (!isVisible)
            {
                return Result<ReturnRequestDto>.NotFound("Return request not found.");
            }

            var dto = new ReturnRequestDto(
                ret.Id,
                ret.CustomerOrderId,
                ret.VariantId,
                ret.WarehouseId,
                ret.Quantity,
                ret.Status.ToString(),
                ret.IsGoodCondition,
                ret.VendorApproved,
                ret.CreatedAt
            );

            return Result<ReturnRequestDto>.Success(dto);
        }

        /// <summary>Comprador: la devolucion debe ser de un pedido suyo (Dominio 2).</summary>
        private async Task<bool> IsBuyersReturnAsync(ReturnRequest ret, Guid buyerId, CancellationToken cancellationToken)
        {
            var order = await _customerOrderRepository.GetByIdForBuyerAsync(
                ret.CustomerOrderId, buyerId, cancellationToken);
            return order != null;
        }

        /// <summary>Vendedor: la variante devuelta debe ser de un producto suyo.</summary>
        private async Task<bool> IsSellersReturnAsync(ReturnRequest ret, Guid vendorId, CancellationToken cancellationToken)
        {
            var product = await _productRepository.GetByVariantIdAsync(ret.VariantId, cancellationToken);
            return product != null && product.VendorId == vendorId;
        }
    }
}
