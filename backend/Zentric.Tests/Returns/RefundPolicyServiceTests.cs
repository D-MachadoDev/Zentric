using Moq;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns.Services;

namespace Zentric.Tests.Returns;

/// <summary>
/// ADR-0020: el quiebre de stock es automatico si hay comprobante con saldo;
/// lo demas es excepcion con dictamen del Administrador.
/// </summary>
public sealed class RefundPolicyServiceTests
{
    private readonly Mock<IPaymentReceiptRepository> _receipts = new();
    private readonly Mock<ICustomerOrderRepository> _orders = new();

    private RefundPolicyService Service => new(_receipts.Object, _orders.Object);

    private static RefundContext Context(string reason) =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, reason);

    [Fact]
    public async Task DecideAsync_QuiebreSinComprobante_RetornaExcepcion()
    {
        _receipts.Setup(r => r.GetByOrderIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentReceipt?)null);

        var decision = await Service.DecideAsync(Context("stock_breakage"));

        Assert.False(decision.IsAuto);
    }

    [Fact]
    public async Task DecideAsync_QuiebreConComprobantePendiente_RetornaExcepcion()
    {
        var receipt = PaymentReceipt.Create(Guid.NewGuid(), new Money(10000m, "COP"));
        _receipts.Setup(r => r.GetByOrderIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(receipt);

        var decision = await Service.DecideAsync(Context("Stock Fantasma"));

        Assert.False(decision.IsAuto);
    }

    /// <summary>
    /// HALLAZGO (no se toca produccion en esta oleada): con comprobante
    /// aprobado y saldo, HasValidReceiptAndBalanceAsync lee Amount por
    /// reflexion y lo convierte a decimal, pero Amount es Money, asi que el
    /// cast explota con InvalidCastException en vez de decidir Auto. El test
    /// documenta el comportamiento real; la correccion requiere dictamen del
    /// Owner (cambia el camino del reembolso automatico por quiebre).
    /// </summary>
    [Fact]
    public async Task DecideAsync_QuiebreConSaldo_LanzaPorCastDeMoney()
    {
        var receipt = PaymentReceipt.Create(Guid.NewGuid(), new Money(10000m, "COP"));
        receipt.Approve("tx-1");
        _receipts.Setup(r => r.GetByOrderIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(receipt);

        await Assert.ThrowsAsync<InvalidCastException>(() => Service.DecideAsync(Context("stock_breakage")));
    }

    [Fact]
    public async Task DecideAsync_DevolucionAprobadaPorVendedor_RetornaExcepcion()
    {
        var decision = await Service.DecideAsync(Context("vendor_approved_return"));

        Assert.False(decision.IsAuto);
        Assert.StartsWith("EXCEPTION:", decision.RuleApplied);
    }

    [Fact]
    public async Task DecideAsync_RazonDesconocida_RetornaExcepcion()
    {
        var decision = await Service.DecideAsync(Context("motivo_raro"));

        Assert.False(decision.IsAuto);
    }
}
