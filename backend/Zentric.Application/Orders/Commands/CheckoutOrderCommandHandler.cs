using Zentric.Application.Common.Messaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Inventories.Services;
using Zentric.Domain.Logistics;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Orders.Commands
{
    public class CheckoutOrderCommandHandler : IRequestHandler<CheckoutOrderCommand, Result<bool>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly InventoryReservationService _inventoryReservationService;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CheckoutOrderCommandHandler(
            ICustomerOrderRepository orderRepository,
            IProductRepository productRepository,
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            InventoryReservationService inventoryReservationService,
            IUserRepository userRepository,
            IUnitOfWork unitOfWork)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _inventoryReservationService = inventoryReservationService;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(CheckoutOrderCommand request, CancellationToken cancellationToken)
        {
            // El carrito se carga con el filtro por comprador; el de otro
            // comprador se trata igual que uno inexistente.
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result<bool>.NotFound($"Order with ID {request.OrderId} not found.");
            }

            try
            {
                bool isRenewal = order.Status == Domain.Orders.Enums.OrderStatus.PendingPayment;

                // Checkout the order (moves to PendingPayment) or renew its 15-min window if already PendingPayment
                if (isRenewal)
                {
                    order.RenewReservation();
                }
                else
                {
                    order.Checkout();
                }

                // Agrupar por vendedor antes de reservar: la reserva persiste cambios en la
                // base de datos, asi que cualquier validacion que pueda fallar
                // debe ejecutarse antes de tocar stock.
                var itemsByVendor = new Dictionary<Guid, List<Domain.Orders.Entities.OrderItem>>();
                foreach (var item in order.Items)
                {
                    var product = await _productRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                    if (product == null)
                    {
                        return Result<bool>.NotFound($"Product for variant {item.VariantId} not found.");
                    }

                    // Un producto digital no genera despacho (entrega inmediata tras el pago).
                    if (product.Type == Zentric.Domain.Products.Enums.ProductType.Digital)
                    {
                        continue;
                    }

                    if (!itemsByVendor.ContainsKey(product.VendorId))
                    {
                        itemsByVendor[product.VendorId] = new List<Domain.Orders.Entities.OrderItem>();
                    }
                    itemsByVendor[product.VendorId].Add(item);
                }

                // El checkout rechaza cualquier
                // carrito que contenga un producto de un Vendedor bloqueado o desactivado.
                // Los productos del Vendedor siguen Published (no hay cascada), asi que la
                // unica barrera es esta. Se comprueba ANTES de reservar stock, porque la
                // reserva ya escribe en la base y dejaria reservas de un pedido que no se
                // guarda. No se exige que el usuario exista: solo que, si existe, no este
                // bloqueado, para no acoplar este camino a la completitud de la tabla Users.
                foreach (var vendorId in itemsByVendor.Keys)
                {
                    var vendor = await _userRepository.GetByIdAsync(vendorId);
                    if (vendor is not null && !vendor.CanAuthenticate)
                    {
                        return Result<bool>.Failure(
                            $"Vendor {vendorId} is blocked and cannot sell.");
                    }

                    // + ADrechazar si el vendedor supera el umbral de stock fantasma
                    if (vendor is not null && vendor.ExceedsStockFantasmaThreshold())
                    {
                        return Result<bool>.Failure(
                            $"Vendor {vendorId} has exceeded the phantom stock threshold (rate: {vendor.StockFantasmaRate:P0}) and cannot sell.");
                    }
                }

                if (!isRenewal)
                {
                    // Reserve inventory
                    await _inventoryReservationService.ReserveForOrderAsync(order, cancellationToken);

                    // Create FulfillmentOrders for each vendor
                    foreach (var vendorId in itemsByVendor.Keys)
                    {
                        var fulfillmentOrder = new FulfillmentOrder(order.Id, vendorId);
                        await _fulfillmentOrderRepository.AddAsync(fulfillmentOrder, cancellationToken);
                    }
                }

                await _orderRepository.UpdateAsync(order, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
