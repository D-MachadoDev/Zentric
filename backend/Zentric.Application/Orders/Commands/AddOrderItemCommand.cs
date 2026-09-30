using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

using Zentric.Domain.Inventories.Ports;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Agrega una linea al carrito.
    ///
    /// Q-18: <paramref name="VendorId"/> es la instantanea historica del
    /// vendedor. Se valida contra el producto para no aceptar un vendedor
    /// arbitrario del cliente, y se persiste en la linea para que la factura
    /// refleje quien vendio en el momento de la compra.
    ///
    /// Q-21b: <paramref name="BuyerId"/> es la identidad del llamante derivada
    /// del token (el controlador descarta el valor que venga en el cuerpo). El
    /// handler carga el pedido con el filtro por comprador, de modo que un
    /// carrito ajeno responde "Order not found.".
    /// </summary>
    public record AddOrderItemCommand(
        Guid OrderId,
        Guid VariantId,
        Guid VendorId,
        int Quantity,
        decimal UnitPrice,
        string Currency,
        Guid BuyerId) : IRequest<Result>;

    public class AddOrderItemCommandHandler : IRequestHandler<AddOrderItemCommand, Result>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork _unitOfWork;

        public AddOrderItemCommandHandler(
            ICustomerOrderRepository orderRepository,
            IInventoryRepository inventoryRepository,
            IProductRepository productRepository,
            IUnitOfWork unitOfWork)
        {
            _orderRepository = orderRepository;
            _inventoryRepository = inventoryRepository;
            _productRepository = productRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(AddOrderItemCommand request, CancellationToken cancellationToken)
        {
            // Q-21b: el pedido se carga con el filtro por comprador; un carrito
            // ajeno se trata igual que uno inexistente.
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result.Failure("Order not found.");
            }

            if (order.Status != OrderStatus.Cart)
            {
                return Result.Failure("Items can only be added while the order is in the Cart status.");
            }

            // Q-18: el vendedor indicado debe ser el dueno real de la variante.
            // Sin esta comprobacion, un cliente podria atribuir la venta a otro
            // vendedor y corromper el reparto de la facturacion.
            var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
            if (product == null)
            {
                return Result.Failure($"Product for variant {request.VariantId} not found.");
            }

            if (product.VendorId != request.VendorId)
            {
                return Result.Failure(
                    $"Vendor {request.VendorId} does not own variant {request.VariantId}.");
            }

            var totalAvailable = await _inventoryRepository.GetTotalAvailableStockAsync(request.VariantId, cancellationToken);
            if (totalAvailable < request.Quantity)
            {
                return Result.Failure("Not enough available stock.");
            }

            var money = new Money(request.UnitPrice, request.Currency);

            order.AddItem(request.VariantId, request.VendorId, request.Quantity, money);
            await _orderRepository.UpdateAsync(order, cancellationToken);

            // Persistir la linea del pedido: sin este guardado el item se pierde.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}
