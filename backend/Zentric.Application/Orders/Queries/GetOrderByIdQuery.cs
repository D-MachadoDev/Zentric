using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Orders.Queries
{
    public record OrderItemDto(
        Guid Id,
        Guid VariantId,
        int Quantity,
        decimal UnitPrice,
        decimal TotalPrice,
        string? ProductName = null,
        string? Sku = null,
        string? ImageUrl = null,
        string? VendorName = null);

    public record OrderDto(
        Guid Id,
        Guid BuyerId,
        string Status,
        decimal TotalAmount,
        string Currency,
        IReadOnlyList<OrderItemDto> Items,
        DateTime CreatedAt,
        DateTime ExpiresAt);

    /// <summary>
    /// Consulta de un pedido restringida a su comprador.
    ///
    /// <see cref="GetOrderByIdQuery"/> queda sin verificar, a proposito: la usan
    /// los flujos internos (pago, checkout) donde el comprador ya es conocido.
    /// Esta variante es la que usan los endpoints HTTP, para que un comprador no
    /// pueda leer el pedido de otro (ZENTRIC.md Dominio 2).
    /// </summary>
    public record GetOrderByIdForBuyerQuery(Guid OrderId, Guid BuyerId) : IRequest<Result<OrderDto>>;

    public class GetOrderByIdForBuyerQueryHandler
        : IRequestHandler<GetOrderByIdForBuyerQuery, Result<OrderDto>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IProductRepository? _productRepository;
        private readonly IUserRepository? _userRepository;

        public GetOrderByIdForBuyerQueryHandler(
            ICustomerOrderRepository orderRepository,
            IProductRepository? productRepository = null,
            IUserRepository? userRepository = null)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
        }

        public GetOrderByIdForBuyerQueryHandler(ICustomerOrderRepository orderRepository)
            : this(orderRepository, null, null)
        {
        }

        public async Task<Result<OrderDto>> Handle(
            GetOrderByIdForBuyerQuery request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);

            if (order == null)
            {
                // Mismo mensaje para "no existe" y "es de otro": filtrar esa
                // diferencia permitiria enumerar pedidos ajenos probando GUIDs.
                return Result<OrderDto>.NotFound("Order not found.");
            }

            var itemDtos = await EnrichItemsAsync(order.Items, cancellationToken);

            var dto = new OrderDto(
                order.Id,
                order.BuyerId,
                order.Status.ToString(),
                order.TotalAmount.Amount,
                order.TotalAmount.Currency,
                itemDtos,
                order.CreatedAt,
                order.CreatedAt.AddMinutes(15)
            );

            return Result<OrderDto>.Success(dto);
        }

        private async Task<List<OrderItemDto>> EnrichItemsAsync(
            IEnumerable<Zentric.Domain.Orders.Entities.OrderItem> items, CancellationToken cancellationToken)
        {
            var result = new List<OrderItemDto>();
            foreach (var i in items)
            {
                string? productName = null;
                string? sku = null;
                string? imageUrl = null;
                string? vendorName = null;

                if (_productRepository != null)
                {
                    var product = await _productRepository.GetByVariantIdAsync(i.VariantId, cancellationToken);
                    if (product != null)
                    {
                        productName = product.Name;
                        imageUrl = product.ImageUrl;
                        var variant = product.Variants.FirstOrDefault(v => v.Id == i.VariantId);
                        sku = variant?.Sku;
                    }
                }

                if (_userRepository != null && i.VendorId != Guid.Empty)
                {
                    var vendor = await _userRepository.GetByIdAsync(i.VendorId);
                    vendorName = vendor?.FullName?.Value;
                }

                result.Add(new OrderItemDto(
                    i.Id,
                    i.VariantId,
                    i.Quantity,
                    i.UnitPrice.Amount,
                    i.TotalPrice.Amount,
                    productName,
                    sku,
                    imageUrl,
                    vendorName));
            }
            return result;
        }
    }

    public record GetOrderByIdQuery(Guid OrderId) : IRequest<Result<OrderDto>>;

    public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, Result<OrderDto>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IProductRepository? _productRepository;
        private readonly IUserRepository? _userRepository;

        public GetOrderByIdQueryHandler(
            ICustomerOrderRepository orderRepository,
            IProductRepository? productRepository = null,
            IUserRepository? userRepository = null)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
        }

        public GetOrderByIdQueryHandler(ICustomerOrderRepository orderRepository)
            : this(orderRepository, null, null)
        {
        }

        public async Task<Result<OrderDto>> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
            if (order == null)
            {
                return Result<OrderDto>.NotFound("Order not found.");
            }

            var itemDtos = await EnrichItemsAsync(order.Items, cancellationToken);

            var dto = new OrderDto(
                order.Id,
                order.BuyerId,
                order.Status.ToString(),
                order.TotalAmount.Amount,
                order.TotalAmount.Currency,
                itemDtos,
                order.CreatedAt,
                order.CreatedAt.AddMinutes(15)
            );

            return Result<OrderDto>.Success(dto);
        }

        private async Task<List<OrderItemDto>> EnrichItemsAsync(
            IEnumerable<Zentric.Domain.Orders.Entities.OrderItem> items, CancellationToken cancellationToken)
        {
            var result = new List<OrderItemDto>();
            foreach (var i in items)
            {
                string? productName = null;
                string? sku = null;
                string? imageUrl = null;
                string? vendorName = null;

                if (_productRepository != null)
                {
                    var product = await _productRepository.GetByVariantIdAsync(i.VariantId, cancellationToken);
                    if (product != null)
                    {
                        productName = product.Name;
                        imageUrl = product.ImageUrl;
                        var variant = product.Variants.FirstOrDefault(v => v.Id == i.VariantId);
                        sku = variant?.Sku;
                    }
                }

                if (_userRepository != null && i.VendorId != Guid.Empty)
                {
                    var vendor = await _userRepository.GetByIdAsync(i.VendorId);
                    vendorName = vendor?.FullName?.Value;
                }

                result.Add(new OrderItemDto(
                    i.Id,
                    i.VariantId,
                    i.Quantity,
                    i.UnitPrice.Amount,
                    i.TotalPrice.Amount,
                    productName,
                    sku,
                    imageUrl,
                    vendorName));
            }
            return result;
        }
    }
}
