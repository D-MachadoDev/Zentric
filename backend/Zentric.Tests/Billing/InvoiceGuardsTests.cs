using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Billing;

/// <summary>
/// Guardas de Factura no cubiertas: nulos, vacios y la matriz de anulacion (FAC-02).
/// </summary>
public sealed class InvoiceGuardsTests
{
    [Fact]
    public void CreateMaster_MontoNulo_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => Invoice.CreateMaster(Guid.NewGuid(), null!));
    }

    [Fact]
    public void CreateMaster_PedidoVacio_Lanza()
    {
        Assert.Throws<ArgumentException>(() => Invoice.CreateMaster(Guid.Empty, new Money(100m, "COP")));
    }

    [Fact]
    public void CreateVendorDetail_VendedorVacio_Lanza()
    {
        Assert.Throws<ArgumentException>(() =>
            Invoice.CreateVendorDetail(Guid.NewGuid(), Guid.Empty, new Money(50m, "COP")));
    }

    [Fact]
    public void CreateVendorDetail_MontoNulo_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() =>
            Invoice.CreateVendorDetail(Guid.NewGuid(), Guid.NewGuid(), null!));
    }

    [Fact]
    public void CreateZentricDetail_DatosValidos_CreaDetallePlataforma()
    {
        var orderId = Guid.NewGuid();

        var invoice = Invoice.CreateZentricDetail(orderId, new Money(5m, "COP"));

        Assert.Equal(InvoiceType.ZentricDetail, invoice.Type);
        Assert.Equal(orderId, invoice.CustomerOrderId);
        Assert.Null(invoice.VendorId);
        Assert.Equal(InvoiceStatus.Issued, invoice.Status);
    }

    [Fact]
    public void CreateZentricDetail_PedidoVacio_Lanza()
    {
        Assert.Throws<ArgumentException>(() =>
            Invoice.CreateZentricDetail(Guid.Empty, new Money(5m, "COP")));
    }

    [Fact]
    public void Annull_Maestra_RegistraMotivoYFecha()
    {
        var invoice = Invoice.CreateMaster(Guid.NewGuid(), new Money(100m, "COP"));
        var before = DateTime.UtcNow;

        invoice.Annull("  chargeback  ");

        Assert.Equal(InvoiceStatus.Anulled, invoice.Status);
        Assert.Equal("chargeback", invoice.AnulledReason);
        Assert.True(invoice.AnulledAt >= before);
    }

    [Fact]
    public void Annull_NoMaestra_Lanza()
    {
        var vendor = Invoice.CreateVendorDetail(Guid.NewGuid(), Guid.NewGuid(), new Money(50m, "COP"));

        Assert.Throws<InvalidOperationException>(() => vendor.Annull("chargeback"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Annull_MotivoVacio_Lanza(string reason)
    {
        var invoice = Invoice.CreateMaster(Guid.NewGuid(), new Money(100m, "COP"));

        Assert.Throws<ArgumentException>(() => invoice.Annull(reason));
    }

    [Fact]
    public void Annull_DosVeces_Lanza()
    {
        var invoice = Invoice.CreateMaster(Guid.NewGuid(), new Money(100m, "COP"));
        invoice.Annull("chargeback");

        Assert.Throws<InvalidOperationException>(() => invoice.Annull("chargeback"));
    }
}

/// <summary>
/// Ramas del reparto sin cubrir: cada parte fuera de rango por separado.
/// </summary>
public sealed class FeeSplitGuardsTests
{
    [Fact]
    public void Constructor_RepartoValido_AsignaPartes()
    {
        var split = new FeeSplit(0.05m, 0.95m);

        Assert.Equal(0.05m, split.PlatformShare);
        Assert.Equal(0.95m, split.VendorShare);
    }

    [Theory]
    [InlineData(-0.1)]
    [InlineData(1.1)]
    public void Constructor_PlataformaFueraDeRango_Lanza(decimal platform)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new FeeSplit(platform, 0.95m));
    }

    [Theory]
    [InlineData(-0.1)]
    [InlineData(1.1)]
    public void Constructor_VendedorFueraDeRango_Lanza(decimal vendor)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new FeeSplit(0.05m, vendor));
    }
}
