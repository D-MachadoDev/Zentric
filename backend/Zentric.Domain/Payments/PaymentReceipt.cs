using System;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments
{
    /// <summary>
    /// Raiz de agregado que representa el comprobante de un cobro.
    ///
    /// Invariante 9 (backendSDD/Domain/04-invariants-and-rules.md): el dominio
    /// avanza de estado con un simple comprobante que valida el exito o el fallo
    /// de la pasarela. NO se almacenan tarjetas de credito ni billeteras; este
    /// agregado guarda unicamente el resultado del cobro.
    ///
    /// Referencia: backendSDD/Domain/04-invariants-and-rules.md, invariante 9.
    /// </summary>
    public sealed class PaymentReceipt
    {
        public Guid Id { get; private set; }
        public Guid OrderId { get; private set; }
        public Money Amount { get; private set; }
        public PaymentStatus Status { get; private set; }
        public string? TransactionId { get; private set; }

        /// <summary>
        /// Monto acreditado como credito a favor del comprador. Es cero mientras
        /// el comprobante no haya sido saldado por una devolucion.
        /// </summary>
        public Money RefundedAmount { get; private set; }

        public DateTime CreatedAt { get; private set; }
        public DateTime? RefundedAt { get; private set; }

        /// <summary>
        /// Un registro por cada credito acreditado (ADR-0020 decision 7). El
        /// acumulado de <see cref="RefundedAmount"/> dice cuanto se devolvio en
        /// total; esto dice a quien, por que linea y bajo que regla. Son cosas
        /// distintas y se necesitan las dos para responder una disputa.
        ///
        /// Null en lugar de inicializado en el campo a proposito:
        /// <c>PaymentReceiptMapper</c> crea el agregado con
        /// <c>RuntimeHelpers.GetUninitializedObject</c>, que se salta el ctor, de
        /// modo que un inicializador de campo quedaria en null y <c>Refund()</c>
        /// volaria con NRE. Se inicializa al primer uso en vez de confiar en que
        /// el ctor corra.
        /// </summary>
        private List<RefundCredit>? _credits;

        public IReadOnlyCollection<RefundCredit> Credits =>
            _credits ?? (IReadOnlyCollection<RefundCredit>)Array.Empty<RefundCredit>();

        private List<RefundCredit> CreditsMutable => _credits ??= new List<RefundCredit>();

        private PaymentReceipt()
        {
            Amount = null!;
            RefundedAmount = new Money(0m, "COP");
        }

        /// <summary>Crea un comprobante pendiente. El importe debe ser positivo.</summary>
        public static PaymentReceipt Create(Guid orderId, Money amount)
        {
            if (amount is null) throw new ArgumentNullException(nameof(amount));
            if (amount.Amount <= 0m)
            {
                throw new ArgumentException("Payment amount must be positive.", nameof(amount));
            }

            return new PaymentReceipt
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                Amount = amount,
                RefundedAmount = new Money(0m, amount.Currency),
                Status = PaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Marca el comprobante como aprobado. Idempotente: un comprobante ya
        /// aprobado conserva su transaccion y no se vuelve a marcar, para que un
        /// reintento de la pasarela no cambie el historico.
        /// </summary>
        public void Approve(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
            {
                throw new ArgumentException("Transaction id is required.", nameof(transactionId));
            }

            if (Status == PaymentStatus.Approved) return;

            Status = PaymentStatus.Approved;
            TransactionId = transactionId;
        }

        /// <summary>
        /// Marca el comprobante como rechazado. Un comprobante aprobado nunca
        /// se rechaza.
        /// </summary>
        public void Decline()
        {
            if (Status == PaymentStatus.Approved) return;

            Status = PaymentStatus.Declined;
        }

        /// <summary>
        /// Salda el comprobante con un credito a favor del comprador.
        ///
        /// ADDENDUM - DICTADO POR OWNER (2026-09-27): el reembolso se
        /// materializa como credito a favor dentro de la plataforma, porque el
        /// sistema no custodia dinero. El pedido NO se revierte: ya fue
        /// entregado y facturado, y reabrirlo obligaria a deshacer logistica y
        /// facturacion cerradas.
        ///
        /// Idempotente: un comprobante ya reembolsado conserva su credito.
        /// </summary>
        public void Refund(Money creditAmount)
        {
            Accredit(creditAmount);
        }

        /// <summary>
        /// Acredita un importe dejando traza de a quien, por que linea y bajo que
        /// regla. Es la via que usa el caso de uso real: el reembolso que no deja
        /// registro no es auditable, y ADR-0020 lo prohibe expresamente.
        /// </summary>
        public void Refund(RefundCredit credit)
        {
            if (credit is null) throw new ArgumentNullException(nameof(credit));

            // El importe del registro y el que mueve el dinero tienen que ser el
            // mismo numero. Si divergieran, la traza contaria una historia y el
            // comprobante otra, y en una disputa gana la que se lee primero.
            if (credit.Amount.Currency != Amount.Currency)
            {
                throw new InvalidOperationException(
                    $"Refund credit currency {credit.Amount.Currency} does not match receipt currency {Amount.Currency}.");
            }

            Accredit(credit.Amount);
            CreditsMutable.Add(credit);
        }

        private void Accredit(Money creditAmount)
        {
            if (creditAmount is null) throw new ArgumentNullException(nameof(creditAmount));

            // Solo un comprobante efectivamente cobrado puede acreditarse. Un
            // comprobante ya cerrado (Refunded) tambien se acepta como entrada: su
            // saldo es cero y el control de saldo de mas abajo lo rechaza, que es el
            // mensaje correcto para "este comprobante ya esta liquidado".
            if (Status != PaymentStatus.Approved && Status != PaymentStatus.Refunded)
            {
                throw new InvalidOperationException(
                    "Only an approved payment receipt can be refunded.");
            }

            if (creditAmount.Currency != Amount.Currency)
            {
                throw new InvalidOperationException(
                    $"Refund currency {creditAmount.Currency} does not match receipt currency {Amount.Currency}.");
            }

            if (creditAmount.Amount <= 0m)
            {
                throw new ArgumentException("Refund must be greater than zero.", nameof(creditAmount));
            }

            // Invariante 14 (EXC-02): el credito se ACUMULA y la suma de todos los
            // creditos nunca supera lo cobrado. La comparacion es contra el SALDO
            // pendiente, no contra el total: comparar contra el total permitiria
            // acreditar dos veces la misma parte del dinero.
            var remaining = Amount.Amount - RefundedAmount.Amount;

            if (creditAmount.Amount > remaining)
            {
                throw new ArgumentException(
                    $"Refund of {creditAmount.Amount} would exceed the remaining balance of {remaining} on the receipt.",
                    nameof(creditAmount));
            }

            RefundedAmount = RefundedAmount.Add(creditAmount);
            RefundedAt = DateTime.UtcNow;

            // El comprobante se cierra solo cuando el acumulado iguala el total
            // cobrado. Un credito parcial lo deja Approved: el dinero pendiente de
            // devolver es la razon por la que sigue abierto.
            Status = RefundedAmount.Amount == Amount.Amount
                ? PaymentStatus.Refunded
                : PaymentStatus.Approved;
        }
    }
}