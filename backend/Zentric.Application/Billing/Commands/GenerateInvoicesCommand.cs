using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Billing.Ports;
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
                return Result<bool>.Failure("Order not found.");
            }

            // Q-15 (dictamen del Owner): el porcentaje y el reparto plataforma/
            // vendedor NO estan definidos en la Ley. Mientras no se ratifique el
            // reparto, se emite la Factura Maestra (que refleja lo que el
            // comprador debe) pero NO se emite el Detalle Zentric cobrable.
            // Nadie paga una comision estimada por el agente.
            if (!PlatformFeePolicy.Current.IsCollectable)
            {
                return Result<bool>.Failure(
                    "Platform fee cannot be charged: the revenue split has not been ratified by the owner. " +
                    "The master invoice can be issued, but the Zentric fee detail remains an estimate. " +
                    "See backendSDD question Q-15.");
            }

            try
            {
                var invoicesToSave = new List<Invoice>();
                var totalAmount = order.TotalAmount;

                // 1. Factura Maestra
                var masterInvoice = Invoice.CreateMaster(order.Id, totalAmount);
                invoicesToSave.Add(masterInvoice);

                // 2. Factura Zentric (comision de plataforma), solo si hay reparto ratificado.
                var feePolicy = PlatformFeePolicy.Current;
                var zentricFeeAmount = feePolicy.ApplyTo(totalAmount);
                var zentricInvoice = Invoice.CreateZentricDetail(order.Id, zentricFeeAmount);
                invoicesToSave.Add(zentricInvoice);

                // 3. Facturas a los Vendedores (Split)
                // Requiere el VendorId en la linea del pedido (Q-18). El Owner
                // decidio storing la instantanea historica del vendedor en
                // OrderItem, de modo que la factura refleje quien vendio el
                // producto en el momento de la compra aunque despues cambie.
                // Pendiente de implementacion: migracion + agrupacion por VendorId.

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
