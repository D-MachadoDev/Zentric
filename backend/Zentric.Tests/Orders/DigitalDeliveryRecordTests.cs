using Zentric.Domain.Orders.Entities;

namespace Zentric.Tests.Orders;

/// <summary>
/// CAT-02: el registro de entrega digital nace con el pago de un producto sin logistica.
/// </summary>
public sealed class DigitalDeliveryRecordTests
{
    [Fact]
    public void Constructor_DatosValidos_AsignaYRecorta()
    {
        var orderId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var variantId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var record = new DigitalDeliveryRecord(orderId, itemId, productId, variantId, "  Ebook  ", "  EBOOK-1  ");

        Assert.NotEqual(Guid.Empty, record.Id);
        Assert.Equal(orderId, record.OrderId);
        Assert.Equal(itemId, record.OrderItemId);
        Assert.Equal(productId, record.ProductId);
        Assert.Equal(variantId, record.VariantId);
        Assert.Equal("Ebook", record.ProductName);
        Assert.Equal("EBOOK-1", record.VariantSku);
        Assert.Equal("system", record.DeliveredBy);
        Assert.True(record.DeliveredAt >= before);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void Constructor_GuidVacio_Lanza(int emptyIndex)
    {
        var ids = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        ids[emptyIndex] = Guid.Empty;

        Assert.Throws<ArgumentException>(() =>
            new DigitalDeliveryRecord(ids[0], ids[1], ids[2], ids[3], "Ebook", "EBOOK-1"));
    }

    [Theory]
    [InlineData("", "EBOOK-1")]
    [InlineData("   ", "EBOOK-1")]
    [InlineData("Ebook", "")]
    [InlineData("Ebook", "   ")]
    public void Constructor_TextoVacio_Lanza(string name, string sku)
    {
        Assert.Throws<ArgumentException>(() =>
            new DigitalDeliveryRecord(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), name, sku));
    }
}
