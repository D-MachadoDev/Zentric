using Xunit;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Models;
using System;

namespace Zentric.Tests.Billing
{
    /// <summary>
    /// Persistencia de la factura de vendedor (Q-18).
    ///
    /// Regresion: el mapper no transportaba <c>VendorId</c>, de modo que la
    /// factura se guardaba sin_dueno y todas las facturas de vendedor quedaban
    /// indistinguibles entre si. Estas pruebas fijan la ida y vuelta.
    /// </summary>
    public class InvoiceVendorPersistenceTests
    {
        [Fact]
        public void VendorInvoice_RoundTripThroughMapper_PreservesVendorId()
        {
            var vendorId = Guid.NewGuid();
            var invoice = Invoice.CreateVendorDetail(
                Guid.NewGuid(), vendorId, new Money(95_000m, "COP"));

            var dbModel = InvoiceMapper.ToDbModel(invoice);
            var reloaded = InvoiceMapper.ToDomain(dbModel);

            Assert.Equal(vendorId, dbModel.VendorId);
            Assert.Equal(vendorId, reloaded.VendorId);
            Assert.Equal(new Money(95_000m, "COP"), reloaded.TotalAmount);
            Assert.Equal(InvoiceType.VendorDetail, reloaded.Type);
        }

        [Fact]
        public void MasterInvoice_RoundTripThroughMapper_KeepsVendorIdNull()
        {
            // La maestra y el detalle de plataforma no pertenecen a ningun vendedor.
            var master = Invoice.CreateMaster(Guid.NewGuid(), new Money(400_000m, "COP"));
            var fee = Invoice.CreateZentricDetail(Guid.NewGuid(), new Money(20_000m, "COP"));

            Assert.Null(InvoiceMapper.ToDbModel(master).VendorId);
            Assert.Null(InvoiceMapper.ToDbModel(fee).VendorId);
            Assert.Null(InvoiceMapper.ToDomain(InvoiceMapper.ToDbModel(master)).VendorId);
        }

        [Fact]
        public void VendorInvoice_KeepsItsOwnVendorId_DistinguishableFromOthers()
        {
            // Dos vendedores del mismo pedido no deben confundirse al persistir.
            var orderId = Guid.NewGuid();
            var vendorA = Guid.NewGuid();
            var vendorB = Guid.NewGuid();

            var a = InvoiceMapper.ToDbModel(
                Invoice.CreateVendorDetail(orderId, vendorA, new Money(95_000m, "COP")));
            var b = InvoiceMapper.ToDbModel(
                Invoice.CreateVendorDetail(orderId, vendorB, new Money(285_000m, "COP")));

            Assert.NotEqual(a.VendorId, b.VendorId);
            Assert.Equal(vendorA, a.VendorId);
            Assert.Equal(vendorB, b.VendorId);
        }

        [Fact]
        public void DbModel_ExposesVendorIdColumn()
        {
            // Si la columna desaparece del DbModel, la facturacion por vendedor
            // vuelve a perderse en silencio.
            var property = typeof(InvoiceDbModel).GetProperty("VendorId");

            Assert.NotNull(property);
            Assert.Equal(typeof(Guid?), property!.PropertyType);
        }
    }

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
        public void DefaultPercentage_IsFivePercent_RatifiedByOwner()
        {
            // Q-15: el Owner ratifico el 5% de plataforma el 2026-09-27.
            // Este test documenta la decision vigente. Si el Owner cambia el
            // reparto, hay que actualizar PlatformFeePolicy.RatifiedSplit y aqui.
            Assert.Equal(0.05m, PlatformFeePolicy.DefaultPercentage);
            Assert.Equal(0.05m, PlatformFeePolicy.Current.Percentage);
        }

        [Fact]
        public void Current_IsCollectable_BecauseSplitWasRatified()
        {
            // El reparto 5/95 fue ratificado, asi que el cobro queda habilitado.
            Assert.True(PlatformFeePolicy.Current.IsCollectable);
            Assert.NotNull(PlatformFeePolicy.Current.Split);
        }

        [Fact]
        public void RatifiedSplit_UsesOwnerDecision()
        {
            var split = PlatformFeePolicy.Current.Split!;

            Assert.Equal(0.05m, split.PlatformShare);
            Assert.Equal(0.95m, split.VendorShare);
        }

        [Fact]
        public void UnratifiedPolicy_IsNotCollectable()
        {
            // Una politica sin reparto (por ejemplo una recien creada) no es cobrable.
            var policy = new PlatformFeePolicy(0.05m);

            Assert.False(policy.IsCollectable);
            Assert.Null(policy.Split);
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
