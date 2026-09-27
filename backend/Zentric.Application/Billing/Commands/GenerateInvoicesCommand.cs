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

            try
            {
                var invoicesToSave = new List<Invoice>();
                var totalAmount = order.TotalAmount;

                // 1. Factura Maestra
                var masterInvoice = Invoice.CreateMaster(order.Id, totalAmount);
                invoicesToSave.Add(masterInvoice);

                // 2. Factura Zentric (Platform Fee, supuesto 5%)
                // Nota: Asumimos un 5% de fee fijo.
                var zentricFeeAmount = new Money(Math.Round(totalAmount.Amount * 0.05m, 2), totalAmount.Currency);
                var zentricInvoice = Invoice.CreateZentricDetail(order.Id, zentricFeeAmount);
                invoicesToSave.Add(zentricInvoice);

                // 3. Facturas a los Vendedores (Split)
                // Para simplificar, suponemos que el VendorTotalAmount es el subtotal de sus items, menos el fee proporcional.
                // Como no tenemos el SellerId en el OrderItem en este punto (está en Product), 
                // para la especificacion de facturación lo ideal es calcularlo. 
                // Por ahora creamos un VendorDetail general si tuviéramos un VendorId, o lo dejamos como TBD si requerimos inyectar los VendorIds.
                // En un escenario real, agruparíamos OrderItems por VendorId.
                
                // TODO: Obtener los VendorIds reales agrupando desde ProductRepository. 
                // Para la SPEC-008 actual, demostramos la orquestación.

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
