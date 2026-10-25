using Zentric.Domain.Common.Models;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Users.Enums;

namespace Zentric.Domain.Returns
{
    /// <summary>
    /// Registro de auditoría de una decisión de reembolso (ADR-0020).
    /// Cada intento de reembolso deja traza de qué regla se aplicó, quién decidió
    /// (sistema o Administrador) y el resultado.
    /// </summary>
    public sealed class RefundAudit : Entity
    {
        public Guid Id { get; init; }
        public Guid ReturnRequestId { get; private set; }
        public Guid CustomerOrderId { get; private set; }
        public Guid? OrderLineId { get; private set; }
        public Guid PaymentReceiptId { get; private set; }

        /// <summary>
        /// Texto libre que identifica la regla aplicada (ej. "EXC-02: frozen line price x returned units").
        /// </summary>
        public string RuleApplied { get; private set; }

        /// <summary>
        /// Si la decisión fue automática (sistema) o manual (Administrador).
        /// </summary>
        public RefundDecisionType DecisionType { get; private set; }

        /// <summary>
        /// ID del actor que tomó la decisión (Usuario para manual, null para automático).
        /// </summary>
        public Guid? ActorId { get; private set; }

        /// <summary>
        /// Rol del actor en el momento de la decisión.
        /// </summary>
        public UserRole? ActorRole { get; private set; }

        /// <summary>
        /// Resultado de la decisión.
        /// </summary>
        public RefundAuditOutcome Outcome { get; private set; }

        /// <summary>
        /// Mensaje de error si el resultado falló (ej. "saldo insuficiente en comprobante").
        /// </summary>
        public string? ErrorMessage { get; private set; }

        /// <summary>
        /// Importe que se intentó acreditar (puede ser 0 si falló).
        /// </summary>
        public decimal AttemptedAmount { get; private set; }

        /// <summary>
        /// Moneda del intento.
        /// </summary>
        public string Currency { get; private set; }

        public DateTime OccurredAt { get; private set; }

        private RefundAudit() { RuleApplied = null!; Currency = null!; }

        /// <summary>
        /// Crea una entrada de auditoría para un reembolso automático (sistema).
        /// </summary>
        public static RefundAudit CreateAuto(
            Guid returnRequestId,
            Guid customerOrderId,
            Guid? orderLineId,
            Guid paymentReceiptId,
            string ruleApplied,
            RefundAuditOutcome outcome,
            decimal attemptedAmount,
            string currency,
            string? errorMessage = null)
        {
            return new RefundAudit
            {
                Id = Guid.NewGuid(),
                ReturnRequestId = returnRequestId,
                CustomerOrderId = customerOrderId,
                OrderLineId = orderLineId,
                PaymentReceiptId = paymentReceiptId,
                RuleApplied = ruleApplied ?? throw new ArgumentNullException(nameof(ruleApplied)),
                DecisionType = RefundDecisionType.Automatic,
                ActorId = null,
                ActorRole = null,
                Outcome = outcome,
                ErrorMessage = errorMessage,
                AttemptedAmount = attemptedAmount,
                Currency = currency ?? throw new ArgumentNullException(nameof(currency)),
                OccurredAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Crea una entrada de auditoría para un reembolso manual (Administrador).
        /// </summary>
        public static RefundAudit CreateManual(
            Guid returnRequestId,
            Guid customerOrderId,
            Guid? orderLineId,
            Guid paymentReceiptId,
            string ruleApplied,
            Guid actorId,
            UserRole actorRole,
            RefundAuditOutcome outcome,
            decimal attemptedAmount,
            string currency,
            string? errorMessage = null)
        {
            return new RefundAudit
            {
                Id = Guid.NewGuid(),
                ReturnRequestId = returnRequestId,
                CustomerOrderId = customerOrderId,
                OrderLineId = orderLineId,
                PaymentReceiptId = paymentReceiptId,
                RuleApplied = ruleApplied ?? throw new ArgumentNullException(nameof(ruleApplied)),
                DecisionType = RefundDecisionType.Manual,
                ActorId = actorId,
                ActorRole = actorRole,
                Outcome = outcome,
                ErrorMessage = errorMessage,
                AttemptedAmount = attemptedAmount,
                Currency = currency ?? throw new ArgumentNullException(nameof(currency)),
                OccurredAt = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Tipo de decisión de reembolso (ADR-0020).
    /// </summary>
    public enum RefundDecisionType
    {
        /// <summary>Decidido por el sistema aplicando una regla clara (ej. quiebre de stock).</summary>
        Automatic,

        /// <summary>Decidido por un Administrador (excepción, requiere dictamen).</summary>
        Manual
    }

    /// <summary>
    /// Resultado de la auditoría de reembolso.
    /// </summary>
    public enum RefundAuditOutcome
    {
        /// <summary>Crédito acreditado exitosamente.</summary>
        Credited,

        /// <summary>La regla lo permitía pero el comprobante no tenía saldo.</summary>
        InsufficientBalance,

        /// <summary>La variante no estaba en el pedido.</summary>
        VariantNotOnOrder,

        /// <summary>El comprobante no existe o no está aprobado.</summary>
        NoReceipt,

        /// <summary>El actor no tenía permiso (fallo de autorización).</summary>
        Unauthorized,

        /// <summary>Error interno inesperado.</summary>
        Error
    }
}