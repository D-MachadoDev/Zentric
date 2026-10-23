using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.Ports;

using Zentric.Domain.Inventories.Ports;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Agrega una linea al carrito.
    ///
    /// El contrato **no admite precio ni vendedor** (ADR-0020). Ambos los
    /// pone el servidor con lo que hay en el catalogo (<c>Product.Price</c> y
    /// <c>Product.VendorId</c>), de modo que la linea queda con un precio congelado
    /// que el cliente no puede negociar y el reparto de la facturacion no depende de
    /// lo que afirme la peticion.
    ///
    /// <paramref name="BuyerId"/> es la identidad del llamante derivada
    /// del token (el controlador descarta el valor que venga en el cuerpo). El
    /// handler carga el pedido con el filtro por comprador, de modo que un
    /// carrito ajeno responde "Order not found.".
    /// </summary>
    public record AddOrderItemCommand(
        Guid OrderId,
        Guid VariantId,
        int Quantity,
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
            // El pedido se carga con el filtro por comprador; un carrito
            // ajeno se trata igual que uno inexistente.
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result.NotFound("Order not found.");
            }

            if (order.Status != OrderStatus.Cart)
            {
                return Result.Failure("Items can only be added while the order is in the Cart status.");
            }

            // ADR-0020: el precio y el vendedor los pone el servidor. El contrato ya
            // no los admite, asi que no queda nada del cliente que validar contra el
            // catalogo: la comprobacion "el vendedor coincide" que antes hacia falta
            // desaparece porque el vendedor nunca viene de la peticion.
            var product = await _productRepository.GetByVariantIdAsync(request.VariantId, cancellationToken);
            if (product == null)
            {
                return Result.NotFound($"Product for variant {request.VariantId} not found.");
            }

            // Un producto suspendido "deja de ser visible
            // en busquedas y no se puede agregar a carritos"; la Ley refuerza que el
            // Comprador "adquiere productos publicados" (ZENTRIC.md:83).
            //
            // El guardia es Product.CanBeSold y NO el de la variante: Suspend()
            // (Product.cs) solo cambia el estado del producto y deja las variantes
            // activas, asi que una variante sigue "vendible" con el producto
            // suspendido y solo la comprobacion a nivel de producto lo bloquea.
            if (!product.CanBeSold)
            {
                return Result.Failure("Product is not available for sale.");
            }

            var totalAvailable = await _inventoryRepository.GetTotalAvailableStockAsync(request.VariantId, cancellationToken);
            if (totalAvailable < request.Quantity)
            {
                return Result.Failure("Not enough available stock.");
            }

            // El precio se congela aqui, al anadir la linea: el pedido ya no vuelve a
            // mirar el catalogo, ni aunque el vendedor suba el precio despues.
            order.AddItem(request.VariantId, product.VendorId, request.Quantity, product.Price);
            await _orderRepository.UpdateAsync(order, cancellationToken);

            // Persistir la linea del pedido: sin este guardado el item se pierde.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}
