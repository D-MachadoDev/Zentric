using System;
using Xunit;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Domain.Payments
{
    /// <summary>
    /// Invariante 14: el credito se ACUMULA en el comprobante y la suma de todos los
    /// creditos nunca supera lo cobrado. El comprobante pasa a Refunded solo cuando el
    /// acumulado iguala el total. Antes Refund() sobreescribia RefundedAmount y se
    /// salia en la segunda llamada, de modo que un segundo reembolso era imposible y el
    /// primero acreditaba de mas.
    /// </summary>
    public class PaymentReceiptAccumulatedRefundTests
    {
        private static PaymentReceipt ApprovedReceipt(decimal amount)
        {
            var receipt = PaymentReceipt.Create(Guid.NewGuid(), new Money(amount, "COP"));
            receipt.Approve("tx-1");
            return receipt;
        }

        [Fact(DisplayName = "CreditosParciales_SeAcumulanEnElComprobante")]
        public void Refund_PartialCredits_Accumulate()
        {
            var receipt = ApprovedReceipt(100m);

            receipt.Refund(new Money(30m, "COP"));
            receipt.Refund(new Money(20m, "COP"));

            Assert.Equal(50m, receipt.RefundedAmount.Amount);
        }

        [Fact(DisplayName = "CreditoParcial_NoCierraElComprobante")]
        public void Refund_PartialCredit_KeepsReceiptApproved()
        {
            var receipt = ApprovedReceipt(100m);

            receipt.Refund(new Money(30m, "COP"));

            Assert.Equal(PaymentStatus.Approved, receipt.Status);
        }

        [Fact(DisplayName = "AcumuladoIgualAlTotal_CierraElComprobante")]
        public void Refund_AccumulatedEqualsTotal_ClosesReceipt()
        {
            var receipt = ApprovedReceipt(100m);

            receipt.Refund(new Money(30m, "COP"));
            receipt.Refund(new Money(70m, "COP"));

            Assert.Equal(100m, receipt.RefundedAmount.Amount);
            Assert.Equal(PaymentStatus.Refunded, receipt.Status);
        }

        [Fact(DisplayName = "ElAcumuladoNuncaSuperaLoCobrado")]
        public void Refund_BeyondRemainingBalance_IsRejected()
        {
            var receipt = ApprovedReceipt(100m);
            receipt.Refund(new Money(60m, "COP"));

            // Solo quedan 40 por acreditar: 60 rebasan el saldo.
            var error = Assert.Throws<ArgumentException>(() => receipt.Refund(new Money(60m, "COP")));

            Assert.Contains("exceed", error.Message.ToLowerInvariant());
            Assert.Equal(60m, receipt.RefundedAmount.Amount);
        }

        [Fact(DisplayName = "UnComprobanteCerradoNoAceptaMasCredito")]
        public void Refund_WhenAlreadyFullyRefunded_IsRejected()
        {
            var receipt = ApprovedReceipt(100m);
            receipt.Refund(new Money(100m, "COP"));

            Assert.Throws<ArgumentException>(() => receipt.Refund(new Money(10m, "COP")));
            Assert.Equal(100m, receipt.RefundedAmount.Amount);
        }

        [Fact(DisplayName = "CreditoSuperiorAlTotalDesdeElPrincipio_EsRechazado")]
        public void Refund_MoreThanTotalFromTheStart_IsRejected()
        {
            var receipt = ApprovedReceipt(100m);

            Assert.Throws<ArgumentException>(() => receipt.Refund(new Money(150m, "COP")));
            Assert.Equal(0m, receipt.RefundedAmount.Amount);
        }
    }
}