using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Returns;

/// <summary>
/// ADR-0020: cada intento de reembolso deja traza de regla, decisor y resultado.
/// </summary>
public sealed class RefundAuditTests
{
    [Fact]
    public void CreateAuto_DatosValidos_MarcaDecisionAutomaticaSinActor()
    {
        var audit = RefundAudit.CreateAuto(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "EXC-02: frozen line price x returned units",
            RefundAuditOutcome.Credited, 10000m, "COP");

        Assert.NotEqual(Guid.Empty, audit.Id);
        Assert.Equal(RefundDecisionType.Automatic, audit.DecisionType);
        Assert.Null(audit.ActorId);
        Assert.Null(audit.ActorRole);
        Assert.Equal(RefundAuditOutcome.Credited, audit.Outcome);
        Assert.Equal(10000m, audit.AttemptedAmount);
        Assert.Equal("COP", audit.Currency);
        Assert.Null(audit.ErrorMessage);
    }

    [Fact]
    public void CreateAuto_ConLineaNulaYError_LosConserva()
    {
        var audit = RefundAudit.CreateAuto(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            "rule", RefundAuditOutcome.InsufficientBalance, 0m, "COP", "saldo insuficiente en comprobante");

        Assert.Null(audit.OrderLineId);
        Assert.Equal("saldo insuficiente en comprobante", audit.ErrorMessage);
    }

    [Fact]
    public void CreateManual_DatosValidos_RegistraActorYRol()
    {
        var actorId = Guid.NewGuid();

        var audit = RefundAudit.CreateManual(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            "dictamen manual", actorId, UserRole.Administrator,
            RefundAuditOutcome.Credited, 5000m, "COP");

        Assert.Equal(RefundDecisionType.Manual, audit.DecisionType);
        Assert.Equal(actorId, audit.ActorId);
        Assert.Equal(UserRole.Administrator, audit.ActorRole);
    }

    [Fact]
    public void CreateAuto_ReglaNula_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => RefundAudit.CreateAuto(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            null!, RefundAuditOutcome.Error, 0m, "COP"));
    }

    [Fact]
    public void CreateAuto_MonedaNula_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => RefundAudit.CreateAuto(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            "rule", RefundAuditOutcome.Error, 0m, null!));
    }

    [Fact]
    public void CreateManual_ReglaNula_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => RefundAudit.CreateManual(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            null!, Guid.NewGuid(), UserRole.Administrator,
            RefundAuditOutcome.Error, 0m, "COP"));
    }

    [Fact]
    public void CreateManual_MonedaNula_Lanza()
    {
        Assert.Throws<ArgumentNullException>(() => RefundAudit.CreateManual(
            Guid.NewGuid(), Guid.NewGuid(), null, Guid.NewGuid(),
            "rule", Guid.NewGuid(), UserRole.Administrator,
            RefundAuditOutcome.Error, 0m, null!));
    }
}
