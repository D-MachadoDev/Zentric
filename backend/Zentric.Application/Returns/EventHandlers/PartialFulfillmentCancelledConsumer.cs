using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Events;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Orders.Ports;

namespace Zentric.Application.Returns.EventHandlers
{
    /// <summary>
    /// Consumidor de <see cref="PartialFulfillmentCancelledDomainEvent"/> (ADR-0020).
    ///
    /// Cuando un despacho se cancela por quiebre de stock ("Stock Fantasma"), el ADDENDUM
    /// Dominio 8 exige una devolución obligatoria con reembolso. Este handler aplica la
    /// política de reembolso automático (RefundPolicyService → Auto para "stock_breakage"),
    /// acredita el comprobante y registra la auditoría (RefundAudit).
    ///
    /// Si por alguna razón la política dice Exception (p. ej. sin comprobante), la auditoría
    /// queda con Outcome = InsufficientBalance / NoReceipt y el reembolso NO se ejecuta:
    /// quedará pendiente de dictamen del Administrador.
    /// </summary>
    public class PartialFulfillmentCancelledConsumer : INotificationHandler<DomainEventNotification<PartialFulfillmentCancelledDomainEvent>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentRepository;
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IPaymentReceiptRepository _receiptRepository;
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IRefundAuditRepository _auditRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly RefundPolicyService _policyService;

        public PartialFulfillmentCancelledConsumer(
            IFulfillmentOrderRepository fulfillmentRepository,
            IReturnRequestRepository returnRepository,
            IPaymentReceiptRepository receiptRepository,
            ICustomerOrderRepository orderRepository,
            IRefundAuditRepository auditRepository,
            IUnitOfWork unitOfWork,
            RefundPolicyService policyService)
        {
            _fulfillmentRepository = fulfillmentRepository;
            _returnRepository = returnRepository;
            _receiptRepository = receiptRepository;
            _orderRepository = orderRepository;
            _auditRepository = auditRepository;
            _unitOfWork = unitOfWork;
            _policyService = policyService;
        }

        public async Task Handle(DomainEventNotification<PartialFulfillmentCancelledDomainEvent> notification, CancellationToken cancellationToken)
        {
            var domainEvent = notification.DomainEvent;

            // 1. Cargar el fulfillment para obtener CustomerOrderId
            var fulfillment = await _fulfillmentRepository.GetByIdAsync(domainEvent.FulfillmentOrderId, cancellationToken);
            if (fulfillment == null)
            {
                return;
            }

            // 2. Cargar el pedido para obtener los items y VariantId
            var order = await _orderRepository.GetByIdAsync(fulfillment.CustomerOrderId, cancellationToken);
            if (order == null)
            {
                return;
            }

            // 3. Buscar la ReturnRequest creada por el CancelFulfillmentOrderDueToNoStockCommand
            // Se asocia por CustomerOrderId + VariantId
            var returns = await _returnRepository.GetByOrderIdAsync(fulfillment.CustomerOrderId, cancellationToken);
            var returnReq = returns.FirstOrDefault(r =>
                order.Items.Any(i => i.VariantId == r.VariantId)
                && r.Status == ReturnStatus.Requested);

            if (returnReq == null)
            {
                return;
            }

            // 4. Decidir política (ADR-0020)
            var context = new RefundContext(
                CustomerOrderId: fulfillment.CustomerOrderId,
                ReturnRequestId: returnReq.Id,
                VariantId: returnReq.VariantId,
                Quantity: returnReq.Quantity,
                Reason: "stock_breakage");

            var decision = await _policyService.DecideAsync(context, cancellationToken);

            // 5. Si es Auto, ejecutar el reembolso; si Exception, solo auditar
            var outcome = RefundAuditOutcome.Credited;
            string? errorMessage = null;
            decimal attemptedAmount = 0;
            string currency = "COP";

            if (decision.IsAuto)
            {
                var creditResult = await ExecuteAutoRefundAsync(returnReq, fulfillment.CustomerOrderId, decision.RuleApplied, cancellationToken);

                outcome = creditResult.Outcome;
                errorMessage = creditResult.ErrorMessage;
                attemptedAmount = creditResult.AttemptedAmount;
                currency = creditResult.Currency;
            }
            else
            {
                outcome = RefundAuditOutcome.Error;
                errorMessage = $"Policy exception: {decision.RuleApplied}";
                attemptedAmount = 0;
            }

            // 6. Registrar auditoría (ADR-0020 decision 7)
            var audit = RefundAudit.CreateAuto(
                returnRequestId: returnReq.Id,
                customerOrderId: fulfillment.CustomerOrderId,
                orderLineId: null,
                paymentReceiptId: Guid.Empty,
                ruleApplied: decision.RuleApplied,
                outcome: outcome,
                attemptedAmount: attemptedAmount,
                currency: currency,
                errorMessage: errorMessage);

            await _auditRepository.AddAsync(audit, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        private async Task<(RefundAuditOutcome Outcome, string? ErrorMessage, decimal AttemptedAmount, string Currency)> ExecuteAutoRefundAsync(
            ReturnRequest returnReq,
            Guid customerOrderId,
            string ruleApplied,
            CancellationToken cancellationToken)
        {
            var receipt = await _receiptRepository.GetByOrderIdAsync(customerOrderId, cancellationToken);
            if (receipt == null)
            {
                return (RefundAuditOutcome.NoReceipt, "No payment receipt found for order", 0, "COP");
            }

            var order = await _orderRepository.GetByIdAsync(customerOrderId, cancellationToken);
            if (order == null)
            {
                return (RefundAuditOutcome.Error, "Order not found", 0, "COP");
            }

            var line = order.Items.FirstOrDefault(i => i.VariantId == returnReq.VariantId);
            if (line == null)
            {
                return (RefundAuditOutcome.VariantNotOnOrder, "Returned variant not on order", 0, "COP");
            }

            var refundableUnits = Math.Min(returnReq.Quantity, line.Quantity);
            var amount = new Zentric.Domain.Products.ValueObjects.Money(line.UnitPrice.Amount * refundableUnits, line.UnitPrice.Currency);

            var credit = new Zentric.Domain.Payments.RefundCredit(
                paymentReceiptId: receipt.Id,
                returnRequestId: returnReq.Id,
                customerOrderId: order.Id,
                orderItemId: line.Id,
                variantId: line.VariantId,
                quantity: refundableUnits,
                amount: amount,
                ruleApplied: ruleApplied,
                actorId: Guid.Empty,
                occurredAt: DateTime.UtcNow);

            try
            {
                receipt.Refund(credit);
                returnReq.MarkAsRefunded();

                await _receiptRepository.UpdateAsync(receipt, cancellationToken);
                await _returnRepository.UpdateAsync(returnReq, cancellationToken);

                return (RefundAuditOutcome.Credited, null, amount.Amount, amount.Currency);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return (RefundAuditOutcome.InsufficientBalance, ex.Message, amount.Amount, amount.Currency);
            }
        }
    }
}