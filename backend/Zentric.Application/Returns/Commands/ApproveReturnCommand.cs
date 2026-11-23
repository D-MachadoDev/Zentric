using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Returns.Commands
{
    /// <summary>
    /// Aprueba una devolucion. Solo la aprueba el vendedor cuyo producto se
    /// devuelve; la politica sigue siendo solo-Seller .
    /// </summary>
    public record ApproveReturnCommand(
        Guid ReturnRequestId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;

    public class ApproveReturnCommandHandler : IRequestHandler<ApproveReturnCommand, Result<bool>>
    {
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ReturnsApprovalService _approvalService;
        private readonly IProductRepository _productRepository;
        private readonly Zentric.Domain.Warehouses.Ports.IWarehouseRepository _warehouseRepository;
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IBuyerRepository _buyerRepository;
        private readonly IUserRepository _userRepository;
        private readonly IEmailSender _emailSender;

        public ApproveReturnCommandHandler(
            IReturnRequestRepository returnRepository, 
            IUnitOfWork unitOfWork,
            ReturnsApprovalService approvalService,
            IProductRepository productRepository,
            Zentric.Domain.Warehouses.Ports.IWarehouseRepository warehouseRepository,
            ICustomerOrderRepository orderRepository,
            IBuyerRepository buyerRepository,
            IUserRepository userRepository,
            IEmailSender emailSender)
        {
            _returnRepository = returnRepository;
            _unitOfWork = unitOfWork;
            _approvalService = approvalService;
            _productRepository = productRepository;
            _warehouseRepository = warehouseRepository;
            _orderRepository = orderRepository;
            _buyerRepository = buyerRepository;
            _userRepository = userRepository;
            _emailSender = emailSender;
        }

        public async Task<Result<bool>> Handle(ApproveReturnCommand request, CancellationToken cancellationToken)
        {
            var returnReq = await _returnRepository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            // La aprobacion es del vendedor del producto devuelto
            // . El mensaje es el de "no existe" para no
            // confirmar que esa devolucion existe y es de otro.
            var product = await _productRepository.GetByVariantIdAsync(returnReq.VariantId, cancellationToken);
            if (product == null || product.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            // ADel cliente ya no declara si la devolucion vuelve a la misma
            // bodega del mismo vendedor. Lo deduce el servidor: solo cuenta si se recibe
            // en una bodega del propio vendedor, porque quien recibe fisicamente la
            // mercancia responde por su estado. Un hub del Marketplace NO habilita la
            // exencion: ahi no esta el vendedor.
            var warehouse = await _warehouseRepository.GetByIdAsync(returnReq.WarehouseId, cancellationToken);
            var isSameWarehouseAndVendor = warehouse is not null
                && warehouse.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Vendor
                && warehouse.VendorId == product.VendorId;

            try
            {
                _approvalService.ApproveReturn(returnReq, isSameWarehouseAndVendor);
                
                await _returnRepository.UpdateAsync(returnReq, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await NotifyBuyerAsync(product, returnReq.CustomerOrderId, returnReq.Quantity, cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Avisa al comprador por correo. Best-effort: la aprobacion ya quedo
        /// persistida, asi que un fallo de correo no debe revertirla ni romper la API.
        /// </summary>
        private async Task NotifyBuyerAsync(
            Zentric.Domain.Products.Product product,
            Guid customerOrderId,
            int quantity,
            CancellationToken cancellationToken)
        {
            try
            {
                var order = await _orderRepository.GetByIdAsync(customerOrderId, cancellationToken);
                if (order is null)
                {
                    return;
                }

                var buyer = await _buyerRepository.GetByIdAsync(order.BuyerId, cancellationToken);
                var user = buyer is not null ? await _userRepository.GetByIdAsync(buyer.UserId) : null;
                if (user is null)
                {
                    return;
                }

                await _emailSender.SendReturnApprovedEmailAsync(
                    user.Email.Value,
                    user.FullName.Value,
                    product.Name,
                    customerOrderId.ToString("N")[..8],
                    quantity,
                    cancellationToken);
            }
            catch
            {
                // Best-effort: la aprobacion no depende del correo.
            }
        }
    }
}
