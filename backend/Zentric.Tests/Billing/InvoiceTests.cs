using Xunit;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;
using System;

namespace Zentric.Tests.Billing
{
    public class PlatformFeePolicyTests
    {
        [Fact]
        public void ApplyTo_ComputesPercentagePreservingCurrency()
        {
            var policy = new PlatformFeePolicy(0.05m);

            var fee = policy.ApplyTo(new Money(1000m, "COP"));

            Assert.Equal(new Money(50m, "COP"), fee);
        }

        [Fact]
        public void ApplyTo_RoundsToTwoDecimals()
        {
            var policy = new PlatformFeePolicy(0.05m);

            // 33.33 * 0.05 = 1.6665 -> 1.67 con redondeo hacia arriba.
            var fee = policy.ApplyTo(new Money(33.33m, "COP"));

            Assert.Equal(new Money(1.67m, "COP"), fee);
        }

        [Fact]
        public void ApplyTo_ZeroPercentage_ProducesZeroFee()
        {
            var policy = new PlatformFeePolicy(0m);

            var fee = policy.ApplyTo(new Money(9999m, "COP"));

            Assert.Equal(new Money(0m, "COP"), fee);
        }

        [Fact]
        public void Constructor_NegativePercentage_Throws()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new PlatformFeePolicy(-0.01m));
        }

        [Fact]
        public void Constructor_AboveOne_Throws()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new PlatformFeePolicy(1.01m));
        }

        [Fact]
        public void DefaultPercentage_IsFivePercent_ButUnratified()
        {
            // Este test documenta el SUPUESTO vigente, no una regla de la Ley.
            // ZENTRIC.md Dominio 9 no define el porcentaje de la comision. Cuando
            // el Owner dicte el valor, hay que actualizar esta prueba junto con
            // PlatformFeePolicy y la documentacion del SDD.
            Assert.Equal(0.05m, PlatformFeePolicy.DefaultPercentage);
            Assert.Equal(0.05m, PlatformFeePolicy.Current.Percentage);
        }

        [Fact]
        public void Current_IsNotCollectable_BecauseSplitIsUnratified()
        {
            // Q-15: sin reparto ratified, el cobro esta bloqueado.
            Assert.False(PlatformFeePolicy.Current.IsCollectable);
            Assert.Null(PlatformFeePolicy.Current.Split);
        }

        [Fact]
        public void Ratify_WithValidSplit_AllowsCollection()
        {
            var policy = PlatformFeePolicy.Ratify(0.05m, new FeeSplit(0.05m, 0.95m));

            Assert.True(policy.IsCollectable);
            Assert.Equal(0.05m, policy.Split!.PlatformShare);
            Assert.Equal(0.95m, policy.Split.VendorShare);
        }

        [Fact]
        public void FeeSplit_SharesNotSummingToOne_Throws()
        {
            Assert.Throws<ArgumentException>(() => new FeeSplit(0.05m, 0.50m));
        }

        [Fact]
        public void FeeSplit_ShareOutOfRange_Throws()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new FeeSplit(1.5m, -0.5m));
        }

        [Fact]
        public void Ratify_WithNullSplit_Throws()
        {
            Assert.Throws<ArgumentNullException>(() => PlatformFeePolicy.Ratify(0.05m, null!));
        }
    }

    public class InvoiceTests
    {
        [Fact]
        public void CreateMaster_Valid_CreatesMasterInvoice()
        {
            var invoice = Invoice.CreateMaster(Guid.NewGuid(), new Money(100, "COP"));
            Assert.Equal(InvoiceType.Master, invoice.Type);
            Assert.Null(invoice.VendorId);
        }

        [Fact]
        public void CreateVendorDetail_Valid_CreatesVendorInvoice()
        {
            var vendorId = Guid.NewGuid();
            var invoice = Invoice.CreateVendorDetail(Guid.NewGuid(), vendorId, new Money(50, "COP"));
            Assert.Equal(InvoiceType.VendorDetail, invoice.Type);
            Assert.Equal(vendorId, invoice.VendorId);
        }
    }
}
