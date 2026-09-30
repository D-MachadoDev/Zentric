using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Billing;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Application.Billing.Commands
{
    public record GenerateInvoicesCommand(Guid CustomerOrderId) : IRequest<Result<bool>>;

    public class GenerateInvoicesCommandHandler : IRequestHandler<GenerateInvoicesCommand, Result<bool>>
    {
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public GenerateInvoicesCommandHandler(IInvoiceRepository invoiceRepository, ICustomerOrderRepository orderRepository, IUnitOfWork unitOfWork)
        {
            _invoiceRepository = invoiceRepository;
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(GenerateInvoicesCommand request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(request.CustomerOrderId, cancellationToken);
            if (order == null)
            {
                return Result<bool>.NotFound("Order not found.");
            }

            // Q-21d (dictamen del Owner 2026-09-29): estas dos guardas ya las prometia la
            // spec de este endpoint y no existian. Sin ellas, un segundo clic en
            // "facturar" -o un reintento del frontend- duplicaba las tres facturas del
            // pedido, y se podia facturar un carrito que nadie ha pagado.
            if (order.Status is not (OrderStatus.Paid or OrderStatus.Dispatched or OrderStatus.Delivered))
            {
                return Result<bool>.Failure(
                    $"Order with ID {order.Id} has not been paid: invoices are only issued once the payment is confirmed.");
            }

            var alreadyIssued = await _invoiceRepository.GetByOrderIdAsync(order.Id, cancellationToken);
            if (alreadyIssued.Count > 0)
            {
                return Result<bool>.Failure($"Invoices have already been issued for order {order.Id}.");
            }

            // Q-15 (dictamen del Owner 2026-09-27): reparto ratificado 5% plataforma /
            // 95% vendedor. El cobro de la comision queda habilitado.
            if (!PlatformFeePolicy.Current.IsCollectable)
            {
                return Result<bool>.Failure(
                    "Platform fee cannot be charged: the revenue split has not been ratified by the owner. " +
                    "See backendSDD question Q-15.");
            }

            try
            {
                var invoicesToSave = new List<Invoice>();
                var totalAmount = order.TotalAmount;
                var feePolicy = PlatformFeePolicy.Current;

                // 1. Factura Maestra: la recibe el comprador y refleja el total
                //    de la operacion (ZENTRIC.md, Dominio 9).
                invoicesToSave.Add(Invoice.CreateMaster(order.Id, totalAmount));

                // 2. Detalle Zentric: la comision de la plataforma sobre el total.
                invoicesToSave.Add(
                    Invoice.CreateZentricDetail(order.Id, feePolicy.ApplyTo(totalAmount)));

                // 3. Factura por vendedor (split). Q-18: el VendorId vive en la
                //    linea del pedido como instantanea historica, de modo que la
                //    factura refleje quien vendio en el momento de la compra.
                //    Se agrupa por vendedor y se descuenta la comion
                //    proporcional de la parte que le corresponde a cada uno.
                var vendorShare = feePolicy.Split!.VendorShare;

                foreach (var group in order.Items.GroupBy(i => i.VendorId))
                {
                    var vendorGross = new Money(0m, totalAmount.Currency);
                    foreach (var item in group)
                    {
                        vendorGross = vendorGross.Add(item.TotalPrice);
                    }

                    // El vendedor recibe su porcentaje del importe de sus lineas.
                    var vendorNet = new Money(
                        Math.Round(vendorGross.Amount * vendorShare, 2, MidpointRounding.AwayFromZero),
                        vendorGross.Currency);

                    invoicesToSave.Add(
                        Invoice.CreateVendorDetail(order.Id, group.Key, vendorNet));
                }

                await _invoiceRepository.AddRangeAsync(invoicesToSave, cancellationToken);

                // Sin guardar, las facturas emitidas no llegan a la base.
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
