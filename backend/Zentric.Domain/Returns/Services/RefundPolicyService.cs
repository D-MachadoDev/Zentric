using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;

namespace Zentric.Domain.Returns.Services
{
    /// <summary>
    /// Contexto para la decisión de política de reembolso.
    /// </summary>
    public sealed record RefundContext(
        Guid CustomerOrderId,
        Guid ReturnRequestId,
        Guid VariantId,
        int Quantity,
        /// <summary>Razón del reembolso: "stock_breakage", "vendor_approved_return", etc.</summary>
        string Reason);

    /// <summary>
    /// Resultado de la decisión de política.
    /// </summary>
    public sealed record RefundDecision
    {
        public bool IsAuto { get; }
        public string RuleApplied { get; }

        private RefundDecision(bool isAuto, string ruleApplied)
        {
            IsAuto = isAuto;
            RuleApplied = ruleApplied;
        }

        public static RefundDecision Auto(string ruleApplied) => new(true, ruleApplied);
        public static RefundDecision Exception(string reason) => new(false, $"EXCEPTION: {reason}");
    }

    /// <summary>
    /// Servicio que decide si un reembolso es AUTOMÁTICO (regla clara) o EXCEPCIÓN
    /// (requiere dictamen de Administrador), según ADR-0020.
    ///
    /// Reglas automáticas actuales:
    /// - Devolución por quiebre de stock (PartialFulfillmentCancelledDomainEvent):
    ///   el consumidor del evento llama a este servicio y obtiene Auto.
    ///
    /// Todo lo demás hoy es Excepción (requiere Administrador).
    /// El Owner puede ampliar las reglas automáticas en el futuro sin tocar casos de uso.
    /// </summary>
    public sealed class RefundPolicyService
    {
        private readonly IPaymentReceiptRepository _receiptRepository;
        private readonly ICustomerOrderRepository _orderRepository;

        public RefundPolicyService(
            IPaymentReceiptRepository receiptRepository,
            ICustomerOrderRepository orderRepository)
        {
            _receiptRepository = receiptRepository;
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Decide el tipo de decisión para un reembolso dado el contexto.
        /// </summary>
        /// <param name="context">Contexto del reembolso (incluye razón, p.ej. "stock_breakage").</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <returns>Auto si la regla es clara y ejecutable; Exception en caso contrario.</returns>
        public async Task<RefundDecision> DecideAsync(
            RefundContext context,
            CancellationToken cancellationToken = default)
        {
            // Regla 1: Quiebre de stock (stock breakage) → AUTOMÁTICO
            // El evento PartialFulfillmentCancelledDomainEvent trae Reason = "Stock Fantasma"
            if (context.Reason == "stock_breakage" || context.Reason == "Stock Fantasma")
            {
                // Validar que haya comprobante aprobado y saldo suficiente
                if (await HasValidReceiptAndBalanceAsync(context.CustomerOrderId, cancellationToken))
                {
                    return RefundDecision.Auto("EXC-02: frozen line price x returned units (stock breakage, ADR-0020 d.6)");
                }

                return RefundDecision.Exception("Stock breakage pero sin comprobante válido o saldo insuficiente");
            }

            // Regla 2: Devolución estándar aprobada por Vendedor → EXCEPCIÓN
            // Hoy TODA devolución aprobada por el Vendedor requiere dictamen del Administrador
            // para liberar el dinero (separación de poderes: Vendedor aprueba reingreso stock,
            // Administrador libera dinero). Ver ADR-0014 / Q-24.
            if (context.Reason == "vendor_approved_return")
            {
                return RefundDecision.Exception("Standard vendor-approved return requires Administrator dictamen (separation of powers, ADR-0014)");
            }

            // Default: excepción
            return RefundDecision.Exception($"No automatic rule matches reason '{context.Reason}'");
        }

        /// <summary>
        /// Verifica que exista un comprobante aprobado con saldo pendiente para el pedido.
        /// </summary>
        private async Task<bool> HasValidReceiptAndBalanceAsync(Guid customerOrderId, CancellationToken cancellationToken)
        {
            var receipt = await _receiptRepository.GetByOrderIdAsync(customerOrderId, cancellationToken);
            if (receipt == null) return false;

            var status = receipt.GetType().GetProperty("Status")?.GetValue(receipt)?.ToString();
            if (status != "Approved" && status != "Refunded") return false;

            // Verificar saldo pendiente > 0
            var amountProp = receipt.GetType().GetProperty("Amount");
            var refundedProp = receipt.GetType().GetProperty("RefundedAmount");
            if (amountProp == null || refundedProp == null) return false;

            var amount = (decimal)amountProp.GetValue(receipt)!;
            var refunded = (decimal)refundedProp.GetValue(receipt)!;
            return (amount - refunded) > 0;
        }
    }
}