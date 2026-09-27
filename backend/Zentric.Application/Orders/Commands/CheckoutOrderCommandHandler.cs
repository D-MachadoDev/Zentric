using MediatR;
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

namespace Zentric.Application.Orders.Commands
{
    public class CheckoutOrderCommandHandler : IRequestHandler<CheckoutOrderCommand, Result<bool>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly InventoryReservationService _inventoryReservationService;
        private readonly IUnitOfWork _unitOfWork;

        public CheckoutOrderCommandHandler(
            ICustomerOrderRepository orderRepository,
            IProductRepository productRepository,
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            InventoryReservationService inventoryReservationService,
            IUnitOfWork unitOfWork)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _inventoryReservationService = inventoryReservationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(CheckoutOrderCommand request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
            if (order == null)
            {
                return Result<bool>.Failure($"Order with ID {request.OrderId} not found.");
            }

            try
            {
                // Checkout the order (moves to PendingPayment)
                order.Checkout();

                // Reserve inventory
                await _inventoryReservationService.ReserveForOrderAsync(order, cancellationToken);

                // Group items by VendorId
                var itemsByVendor = new Dictionary<Guid, List<Domain.Orders.Entities.OrderItem>>();
                foreach (var item in order.Items)
                {
                    var product = await _productRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                    if (product == null)
                    {
                        return Result<bool>.Failure($"Product for variant {item.VariantId} not found.");
                    }

                    if (!itemsByVendor.ContainsKey(product.VendorId))
                    {
                        itemsByVendor[product.VendorId] = new List<Domain.Orders.Entities.OrderItem>();
                    }
                    itemsByVendor[product.VendorId].Add(item);
                }

                // Create FulfillmentOrders for each vendor
                foreach (var vendorId in itemsByVendor.Keys)
                {
                    var fulfillmentOrder = new FulfillmentOrder(order.Id, vendorId);
                    await _fulfillmentOrderRepository.AddAsync(fulfillmentOrder, cancellationToken);
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
