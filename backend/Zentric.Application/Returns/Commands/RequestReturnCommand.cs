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
    /// Radica una devolucion. <paramref name="BuyerId"/> es la identidad
    /// del llamante derivada del token; el handler verifica contra ella que el
    /// pedido a devolver sea propio (Dominio 2: el comprador nunca administra
    /// informacion de otros compradores).
    /// </summary>
    public record RequestReturnCommand(Guid CustomerOrderId, Guid VariantId, Guid WarehouseId, int Quantity, Guid BuyerId) : IRequest<Result<Guid>>;

    public class RequestReturnCommandHandler : IRequestHandler<RequestReturnCommand, Result<Guid>>
    {
        private readonly IReturnRequestRepository _repository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICustomerOrderRepository _customerOrderRepository;
        private readonly Zentric.Domain.Products.Ports.IProductRepository _productRepository;
        private readonly Zentric.Domain.Warehouses.Ports.IWarehouseRepository _warehouseRepository;

        public RequestReturnCommandHandler(
            IReturnRequestRepository repository,
            IUnitOfWork unitOfWork,
            ICustomerOrderRepository customerOrderRepository,
            Zentric.Domain.Products.Ports.IProductRepository productRepository,
            Zentric.Domain.Warehouses.Ports.IWarehouseRepository warehouseRepository)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
            _customerOrderRepository = customerOrderRepository;
            _productRepository = productRepository;
            _warehouseRepository = warehouseRepository;
        }

        public async Task<Result<Guid>> Handle(RequestReturnCommand request, CancellationToken cancellationToken)
        {
            // Solo se devuelve lo propio. El pedido se carga con el filtro
            // por comprador; si es de otro o no existe, responde igual ("Order
            // not found.") para no permitir enumeracion de pedidos ajenos.
            var order = await _customerOrderRepository.GetByIdForBuyerAsync(
                request.CustomerOrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result<Guid>.NotFound("Order not found.");
            }

            // ADR-0018: el tipo del producto no lo declara el cliente. Sale del producto
            // que tiene el servidor, y con el la Ley: un digital no se devuelve (el
            // cliente no puede "declararlo fisico" para esquivarlo).
            var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
            if (product == null)
            {
                return Result<Guid>.NotFound($"Product for variant {request.VariantId} not found.");
            }

            // El lugar de recepcion se valida contra bodegas reales: una bodega del
            // Marketplace o una del propio vendedor del producto. Cualquier otro GUID
            // (o una bodega de otro) es un punto de recepcion inventado por el cliente.
            var warehouse = await _warehouseRepository.GetByIdAsync(request.WarehouseId, cancellationToken);
            if (warehouse == null)
            {
                return Result<Guid>.Failure("The reception warehouse does not exist.");
            }

            var isMarketplace = warehouse.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Marketplace;
            var isVendorsOwn = warehouse.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Vendor
                && warehouse.VendorId == product.VendorId;
            if (!isMarketplace && !isVendorsOwn)
            {
                return Result<Guid>.Failure("The reception warehouse is not valid for this return.");
            }

            try
            {
                var returnReq = new ReturnRequest(request.CustomerOrderId, request.VariantId, request.WarehouseId, request.Quantity, product.Type);
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
