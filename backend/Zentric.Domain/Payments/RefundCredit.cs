using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments
{
    /// <summary>
    /// Trazabilidad de UN credito a favor, no del total acreditado.
    ///
    /// ADR-0020 decision 7 pide registrar devolucion, pedido, linea, importe,
    /// regla aplicada, fecha, actor y comprobante. El acumulado del comprobante
    /// no puede cumplir eso: con dos devoluciones parciales solo dice cuanto se
    /// devolvio en total, no a quien ni por que linea. Una fila por credito.
    ///
    /// Inmutable por construccion: no tiene setters publicos ni metodos de
    /// mutacion, porque un registro de auditoria que se puede editar no es un
    /// registro de auditoria.
    /// </summary>
    public sealed class RefundCredit
    {
        public Guid Id { get; private set; }
        public Guid PaymentReceiptId { get; private set; }
        public Guid ReturnRequestId { get; private set; }
        public Guid CustomerOrderId { get; private set; }
        public Guid OrderItemId { get; private set; }
        public Guid VariantId { get; private set; }
        public int Quantity { get; private set; }

        /// <summary>Importe acreditado por ESTE credito, no el acumulado del comprobante.</summary>
        public Money Amount { get; private set; }

        /// <summary>
        /// Regla que decidio el credito (ADR-0020: "las reglas viven en codigo").
        /// Es el identificador estable de la regla, no su descripcion: describe
        /// como se que regla se aplico aunque el texto cambie.
        /// </summary>
        public string RuleApplied { get; private set; }

        /// <summary>Actor o sistema que autorizo el credito.</summary>
        public Guid ActorId { get; private set; }

        public DateTime OccurredAt { get; private set; }

        private RefundCredit()
        {
            RuleApplied = null!;
            Amount = null!;
        }

        public RefundCredit(
            Guid paymentReceiptId,
            Guid returnRequestId,
            Guid customerOrderId,
            Guid orderItemId,
            Guid variantId,
            int quantity,
            Money amount,
            string ruleApplied,
            Guid actorId,
            DateTime occurredAt)
        {
            if (quantity <= 0)
                throw new ArgumentException("A refund credit must cover at least one unit.", nameof(quantity));

            if (amount is null) throw new ArgumentNullException(nameof(amount));

            if (amount.Amount <= 0m)
                throw new ArgumentException("A refund credit must be greater than zero.", nameof(amount));

            if (string.IsNullOrWhiteSpace(ruleApplied))
                throw new ArgumentException("A refund credit must name the rule that authorised it.", nameof(ruleApplied));

            Id = Guid.NewGuid();
            PaymentReceiptId = paymentReceiptId;
            ReturnRequestId = returnRequestId;
            CustomerOrderId = customerOrderId;
            OrderItemId = orderItemId;
            VariantId = variantId;
            Quantity = quantity;
            Amount = amount;
            RuleApplied = ruleApplied;
            ActorId = actorId;
            OccurredAt = occurredAt;
        }
    }
}