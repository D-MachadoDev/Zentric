using System;
using Zentric.Domain.Payments;

namespace Zentric.Infrastructure.Persistence.Models
{
    /// <summary>
    /// Un registro de auditoria por cada credito a favor, no uno por comprobante.
    ///
    /// ADR-0020 decision 7: el acumulado de <c>PaymentReceiptDbModel</c> solo dice
    /// cuanto se devolvio en total. Con dos devoluciones parciales no dice a quien
    /// ni de que linea, que es lo que pregunta quien disputa un cargo.
    ///
    /// Inmutable por construccion: sin setters de mutacion, igual que su
    /// contraparte de dominio. Un registro de auditoria editable no audita nada.
    /// </summary>
    public class RefundCreditDbModel
    {
        public Guid Id { get; set; }
        public Guid PaymentReceiptId { get; set; }
        public Guid ReturnRequestId { get; set; }
        public Guid CustomerOrderId { get; set; }
        public Guid OrderItemId { get; set; }
        public Guid VariantId { get; set; }
        public int Quantity { get; set; }
        public MoneyDbModel Amount { get; set; } = null!;
        public string RuleApplied { get; set; } = null!;
        public Guid ActorId { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}