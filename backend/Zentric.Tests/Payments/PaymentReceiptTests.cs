using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;
using Xunit;

namespace Zentric.Tests.Payments
{
    /// <summary>
    /// Pruebas del agregado PaymentReceipt (invariante 9).
    /// </summary>
    public class PaymentReceiptTests
    {
        private static Money Amount(decimal value) => new(value, "COP");

        [Fact]
        public void Create_WithPositiveAmount_IsPending()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));

            Assert.Equal(PaymentStatus.Pending, receipt.Status);
            Assert.Null(receipt.TransactionId);
            Assert.Equal(0m, receipt.RefundedAmount.Amount);
        }

        [Fact]
        public void Create_WithZeroAmount_Throws()
        {
            // Un cobro de cero no es un pago: se rechaza en el dominio.
            Assert.Throws<ArgumentException>(() => PaymentReceipt.Create(Guid.NewGuid(), Amount(0m)));
        }

        [Fact]
        public void Create_WithNegativeAmount_Throws()
        {
            // Money rechaza el importe negativo en su propio invariante.
            Assert.Throws<ArgumentOutOfRangeException>(() => Amount(-5m));
        }

        [Fact]
        public void Approve_SetsStatusAndTransaction()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));

            receipt.Approve("TX-1");

            Assert.Equal(PaymentStatus.Approved, receipt.Status);
            Assert.Equal("TX-1", receipt.TransactionId);
        }

        [Fact]
        public void Approve_Twice_KeepsOriginalTransaction()
        {
            // Idempotencia: un reintento de pasarela no reescribe el historico.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));
            receipt.Approve("TX-1");

            receipt.Approve("TX-2");

            Assert.Equal("TX-1", receipt.TransactionId);
        }

        [Fact]
        public void Approve_WithoutTransaction_Throws()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));

            Assert.Throws<ArgumentException>(() => receipt.Approve("  "));
        }

        [Fact]
        public void Decline_MarksAsDeclined()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));

            receipt.Decline();

            Assert.Equal(PaymentStatus.Declined, receipt.Status);
        }

        [Fact]
        public void Decline_AfterApprove_DoesNotChangeStatus()
        {
            // Un comprobante confirmado no se puede revertir a rechazado.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(10_000m));
            receipt.Approve("TX-1");

            receipt.Decline();

            Assert.Equal(PaymentStatus.Approved, receipt.Status);
        }

        [Fact]
        public void Refund_OnApprovedReceipt_SetsCreditAndTimestamp()
        {
            // ADDENDUM del Owner: el reembolso es credito a favor y el comprobante
            // queda saldado, sin revertir el pedido.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));
            receipt.Approve("TX-1");

            receipt.Refund(Amount(100_000m));

            Assert.Equal(PaymentStatus.Refunded, receipt.Status);
            Assert.Equal(Amount(100_000m), receipt.RefundedAmount);
            Assert.NotNull(receipt.RefundedAt);
        }

        [Fact]
        public void Refund_OnPendingReceipt_Throws()
        {
            // No se acredita nada que nunca se cobró.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));

            Assert.Throws<InvalidOperationException>(() => receipt.Refund(Amount(100_000m)));
        }

        [Fact]
        public void Refund_ExceedingReceiptAmount_Throws()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));
            receipt.Approve("TX-1");

            Assert.Throws<ArgumentException>(() => receipt.Refund(Amount(100_001m)));
        }

        [Fact]
        public void Refund_CurrencyIsEnforcedByTheDomain_NotByTheReceipt()
        {
            // Con la lista blanca actual (solo COP) la comprobacion de moneda
            // del comprobante es inalcanzable: Money rechaza cualquier otra
            // divisa antes. Se deja constancia de esa dependencia para que,
            // si se habilita mas de una moneda, la guarda de Refund siga
            // teniendo un caso que la cubra.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));
            receipt.Approve("TX-1");

            // Una divisa no admitida se rechaza en Money, antes del comprobante.
            Assert.Throws<ArgumentException>(() => new Money(100_000m, "USD"));

            // Con la unica divisa admitida, el reembolso valido es el mismo.
            receipt.Refund(Amount(100_000m));

            Assert.Equal(PaymentStatus.Refunded, receipt.Status);
            Assert.Equal("COP", receipt.RefundedAmount.Currency);
        }

        [Fact]
        public void Refund_SameCurrency_Succeeds()
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));
            receipt.Approve("TX-1");

            receipt.Refund(Amount(100_000m));

            Assert.Equal(PaymentStatus.Refunded, receipt.Status);
        }

        [Fact]
        public void Refund_Twice_KeepsOriginalCredit()
        {
            // Idempotencia: reintentar el reembolso no duplica el credito.
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), Amount(100_000m));
            receipt.Approve("TX-1");
            receipt.Refund(Amount(50_000m));

            receipt.Refund(Amount(50_000m));

            Assert.Equal(Amount(50_000m), receipt.RefundedAmount);
        }
    }
}