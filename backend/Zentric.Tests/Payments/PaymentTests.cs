using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;
using Xunit;

namespace Zentric.Tests.Payments
{
    /// <summary>
    /// Pruebas del agregado Payment y del puerto de pago (Q-08).
    /// </summary>
    public class PaymentTests
    {
        private static Money Amount(decimal value) => new(value, "COP");

        [Fact]
        public void Create_WithPositiveAmount_IsPending()
        {
            var payment = Payment.Create(Guid.NewGuid(), Amount(10_000m));

            Assert.Equal(PaymentStatus.Pending, payment.Status);
            Assert.Null(payment.TransactionId);
        }

        [Fact]
        public void Create_WithZeroAmount_Throws()
        {
            // Un cobro de cero no es un pago: se rechaza en el dominio.
            Assert.Throws<ArgumentException>(() => Payment.Create(Guid.NewGuid(), Amount(0m)));
        }

        [Fact]
        public void Create_WithNegativeAmount_Throws()
        {
            // Money rechaza el importe negativo en su propio invariante, antes de
            // que el pago llegue a construirse. xUnit exige el tipo exacto, y
            // ArgumentOutOfRangeException es el que emite Money.
            Assert.Throws<ArgumentOutOfRangeException>(() => Amount(-5m));
        }

        [Fact]
        public void Approve_SetsStatusAndTransaction()
        {
            var payment = Payment.Create(Guid.NewGuid(), Amount(10_000m));

            payment.Approve("TX-1");

            Assert.Equal(PaymentStatus.Approved, payment.Status);
            Assert.Equal("TX-1", payment.TransactionId);
        }

        [Fact]
        public void Approve_Twice_KeepsOriginalTransaction()
        {
            // Idempotencia: un reintento de pasarela no debe reescribir el historico.
            var payment = Payment.Create(Guid.NewGuid(), Amount(10_000m));
            payment.Approve("TX-1");

            payment.Approve("TX-2");

            Assert.Equal("TX-1", payment.TransactionId);
        }

        [Fact]
        public void Decline_AfterApprove_DoesNotChangeStatus()
        {
            // Un pago confirmado no puede revertirse a rechazado desde el dominio.
            var payment = Payment.Create(Guid.NewGuid(), Amount(10_000m));
            payment.Approve("TX-1");

            payment.Decline("timeout");

            Assert.Equal(PaymentStatus.Approved, payment.Status);
        }

        [Fact]
        public void Approve_WithoutTransaction_Throws()
        {
            var payment = Payment.Create(Guid.NewGuid(), Amount(10_000m));

            Assert.Throws<ArgumentException>(() => payment.Approve("  "));
        }
    }
}