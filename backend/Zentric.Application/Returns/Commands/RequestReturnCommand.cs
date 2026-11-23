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
    public record RequestReturnCommand(Guid CustomerOrderId, Guid VariantId, int Quantity, Guid BuyerId) : IRequest<Result<Guid>>;

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

            // Ventana legal de 30 días corridos desde la entrega.
            if ((DateTime.UtcNow - order.UpdatedAt).TotalDays > 30)
            {
                return Result<Guid>.Failure("The legal return window of 30 days has expired.");
            }

            // ADel tipo del producto no lo declara el cliente. Sale del producto
            // que tiene el servidor, y con el la Ley: un digital no se devuelve (el
            // cliente no puede "declararlo fisico" para esquivarlo).
            var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
            if (product == null)
            {
                return Result<Guid>.NotFound($"Product for variant {request.VariantId} not found.");
            }

            // La bodega de recepcion la determina el SISTEMA, nunca el comprador:
            // primero la bodega propia del vendedor (origen del despacho) y, si no
            // existe, el hub del Marketplace. Asi el comprador nunca elige ni conoce
            // bodegas, y se elimina el error "The reception warehouse does not exist."
            var allWarehouses = await _warehouseRepository.GetAllAsync(cancellationToken: cancellationToken);
            var warehouse = allWarehouses.FirstOrDefault(w =>
                w.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Vendor
                && w.VendorId == product.VendorId)
                ?? allWarehouses.FirstOrDefault(w => w.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Marketplace);

            if (warehouse == null)
            {
                return Result<Guid>.Failure("No reception warehouse is available for this return.");
            }

            try
            {
                var returnReq = new ReturnRequest(request.CustomerOrderId, request.VariantId, warehouse.Id, request.Quantity, product.Type);
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
