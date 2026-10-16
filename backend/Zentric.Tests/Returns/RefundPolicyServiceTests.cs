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

    [Fact]
    public async Task DecideAsync_QuiebreConSaldo_RetornaAutomatico()
    {
        // Dictamen del Owner 2026-10-16: se eliminó la lectura por reflexion
        // (Amount es Money y el cast a decimal explotaba); la regla no cambia:
        // comprobante aprobado con saldo pendiente decide Auto.
        var receipt = PaymentReceipt.Create(Guid.NewGuid(), new Money(10000m, "COP"));
        receipt.Approve("tx-1");
        _receipts.Setup(r => r.GetByOrderIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(receipt);

        var decision = await Service.DecideAsync(Context("stock_breakage"));

        Assert.True(decision.IsAuto);
        Assert.StartsWith("EXC-02", decision.RuleApplied);
    }

    [Fact]
    public async Task DecideAsync_QuiebreConSaldoAgotado_RetornaExcepcion()
    {
        var receipt = PaymentReceipt.Create(Guid.NewGuid(), new Money(10000m, "COP"));
        receipt.Approve("tx-1");
        receipt.Refund(new Money(10000m, "COP"));
        _receipts.Setup(r => r.GetByOrderIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(receipt);

        var decision = await Service.DecideAsync(Context("stock_breakage"));

        Assert.False(decision.IsAuto);
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
