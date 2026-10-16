using Zentric.Domain.Payments;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Payments;

/// <summary>
/// ADR-0020 decision 7: un credito a favor por fila, inmutable y con regla.
/// </summary>
public sealed class RefundCreditTests
{
    [Fact]
    public void Constructor_DatosValidos_AsignaTodo()
    {
        var receiptId = Guid.NewGuid();
        var occurredAt = DateTime.UtcNow;

        var credit = new RefundCredit(
            receiptId, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            2, new Money(20000m, "COP"), "EXC-02", Guid.NewGuid(), occurredAt);

        Assert.NotEqual(Guid.Empty, credit.Id);
        Assert.Equal(receiptId, credit.PaymentReceiptId);
        Assert.Equal(2, credit.Quantity);
        Assert.Equal(new Money(20000m, "COP"), credit.Amount);
        Assert.Equal("EXC-02", credit.RuleApplied);
        Assert.Equal(occurredAt, credit.OccurredAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_CantidadNoPositiva_Lanza(int quantity)
    {
        Assert.Throws<ArgumentException>(() => new RefundCredit(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            quantity, new Money(100m, "COP"), "EXC-02", Guid.NewGuid(), DateTime.UtcNow));
    }

    [Fact]
    public void Constructor_MontoNulo_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => new RefundCredit(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            1, null!, "EXC-02", Guid.NewGuid(), DateTime.UtcNow));
    }

    [Fact]
    public void Constructor_MontoCero_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new RefundCredit(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            1, new Money(0m, "COP"), "EXC-02", Guid.NewGuid(), DateTime.UtcNow));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_ReglaVacia_Lanza(string rule)
    {
        Assert.Throws<ArgumentException>(() => new RefundCredit(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            1, new Money(100m, "COP"), rule, Guid.NewGuid(), DateTime.UtcNow));
    }
}
