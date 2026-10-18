using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Orders.Queries
{
    /// <summary>
    /// Fila del listado de pedidos.
    ///
    /// Reutiliza <see cref="OrderItemDto"/> del detalle a proposito: el mismo dato no debe tener
    /// dos formas segun de que pantalla venga, porque el frontend acabaria pidiendo una conversion.
    ///
    /// Deliberadamente NO lleva el total completo ni el BuyerId para el Vendedor: son los datos
    /// que el dictamen de Q-21b decidio no exponer. En su lugar el <c>TotalAmount</c> que llega es
    /// el SUBTOTAL de sus lineas, calculado en el handler.
    /// </summary>
    public record OrderListItemDto(
        Guid Id,
        string Status,
        string Currency,
        decimal TotalAmount,
        IReadOnlyList<OrderItemDto> Items,
        int ItemCount,
        Guid? BuyerId,
        DateTime CreatedAt,
        DateTime? ExpiresAt = null);

    /// <summary>
    /// Listado de pedidos.
    ///
    /// Que el filtro se decida aqui y no en el endpoint es lo que mantiene la regla: el
    /// repositorio recibe identificadores ya resueltos, nunca el rol. Si el filtro viviera en el
    /// repositorio, bastaria un endpoint nuevo que lo olvidara para abrir una via de fuga.
    /// </summary>
    public record GetOrdersQuery(Guid CallerId, UserRole CallerRole, OrderStatus? Status) : IRequest<Result<IReadOnlyList<OrderListItemDto>>>;

    public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, Result<IReadOnlyList<OrderListItemDto>>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IProductRepository? _productRepository;
        private readonly IUserRepository? _userRepository;

        public GetOrdersQueryHandler(
            ICustomerOrderRepository orderRepository,
            IProductRepository? productRepository = null,
            IUserRepository? userRepository = null)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
        }

        public GetOrdersQueryHandler(ICustomerOrderRepository orderRepository)
            : this(orderRepository, null, null)
        {
        }

        public async Task<Result<IReadOnlyList<OrderListItemDto>>> Handle(
            GetOrdersQuery request, CancellationToken cancellationToken)
        {
            Guid? buyerId = null;
            Guid? vendorId = null;

            switch (request.CallerRole)
            {
                case UserRole.Buyer:
                    buyerId = request.CallerId;
                    break;

                case UserRole.Seller:
                    vendorId = request.CallerId;
                    break;

                // Administrator, LogisticsOperator y Supervisor: sin filtro de dueno. Es
                // deliberado y es la reparacion de un 404 que antes hacia imposible el trabajo
                // operativo: nadie con rol operativo podia ver la cola de despachos.
                default:
                    break;
            }

            var orders = await _orderRepository.GetListAsync(buyerId, vendorId, request.Status, cancellationToken);

            var productCache = new Dictionary<Guid, (string Name, string? Sku, string? ImageUrl)>();
            var vendorCache = new Dictionary<Guid, string?>();

            var items = new List<OrderListItemDto>();
            foreach (var order in orders)
            {
                // El Vendedor solo ve SUS lineas en el listado, igual que en el detalle: el
                // mismo criterio en los dos, o el listado le(filter)aria informacion que al
                // abrir el pedido se le negaria.
                var visible = request.CallerRole == UserRole.Seller
                    ? order.Items.Where(i => i.VendorId == request.CallerId).ToList()
                    : order.Items.ToList();

                var orderItemDtos = new List<OrderItemDto>();
                foreach (var i in visible)
                {
                    string? productName = null;
                    string? sku = null;
                    string? imageUrl = null;
                    string? vendorName = null;

                    if (_productRepository != null)
                    {
                        if (!productCache.TryGetValue(i.VariantId, out var prodInfo))
                        {
                            var prod = await _productRepository.GetByVariantIdAsync(i.VariantId, cancellationToken);
                            if (prod != null)
                            {
                                var v = prod.Variants.FirstOrDefault(x => x.Id == i.VariantId);
                                prodInfo = (prod.Name, v?.Sku, prod.ImageUrl);
                            }
                            else
                            {
                                prodInfo = ("Producto", null, null);
                            }
                            productCache[i.VariantId] = prodInfo;
                        }
                        productName = prodInfo.Name;
                        sku = prodInfo.Sku;
                        imageUrl = prodInfo.ImageUrl;
                    }

                    if (_userRepository != null && i.VendorId != Guid.Empty)
                    {
                        if (!vendorCache.TryGetValue(i.VendorId, out vendorName))
                        {
                            var vendor = await _userRepository.GetByIdAsync(i.VendorId);
                            vendorName = vendor?.FullName?.Value;
                            vendorCache[i.VendorId] = vendorName;
                        }
                    }

                    orderItemDtos.Add(new OrderItemDto(
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

                items.Add(new OrderListItemDto(
                    order.Id,
                    order.Status.ToString(),
                    order.TotalAmount.Currency,
                    request.CallerRole == UserRole.Seller ? visible.Sum(i => i.TotalPrice.Amount) : order.TotalAmount.Amount,
                    orderItemDtos,
                    visible.Count,
                    request.CallerRole == UserRole.Seller ? (Guid?)null : order.BuyerId,
                    order.CreatedAt,
                    order.CreatedAt.AddMinutes(15)));
            }

            return Result<IReadOnlyList<OrderListItemDto>>.Success(items);
        }
    }
}