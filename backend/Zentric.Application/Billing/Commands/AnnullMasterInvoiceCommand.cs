using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Billing.Ports;

namespace Zentric.Application.Billing.Commands
{
    /// <summary>
    /// Anula la factura maestra de un pedido (FAC-02).
    /// Solo el Administrador puede ejecutar esto (política BillingGenerate).
    /// Se usa cuando hay un chargeback o el pago es rechazado a posteriori.
    /// </summary>
    /// <param name="OrderId">Identificador del pedido cuya factura maestra se anula.</param>
    /// <param name="Reason">Motivo de la anulación (ej. "chargeback", "payment_rejected").</param>
    public record AnnullMasterInvoiceCommand(Guid OrderId, string Reason) : IRequest<Result>;

    public class AnnullMasterInvoiceCommandHandler : IRequestHandler<AnnullMasterInvoiceCommand, Result>
    {
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IUnitOfWork _unitOfWork;

        public AnnullMasterInvoiceCommandHandler(IInvoiceRepository invoiceRepository, IUnitOfWork unitOfWork)
        {
            _invoiceRepository = invoiceRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(AnnullMasterInvoiceCommand request, CancellationToken cancellationToken)
        {
            // Buscar la factura maestra del pedido
            var invoices = await _invoiceRepository.GetByOrderIdAsync(request.OrderId, cancellationToken);
            var masterInvoice = invoices.FirstOrDefault(i => i.Type == InvoiceType.Master);

            if (masterInvoice == null)
            {
                return Result.NotFound($"Master invoice for order {request.OrderId} not found.");
            }

            try
            {
                masterInvoice.Annull(request.Reason);
            }
            catch (InvalidOperationException ex)
            {
                return Result.Failure(ex.Message);
            }

            await _invoiceRepository.UpdateAsync(masterInvoice, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}