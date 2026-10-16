using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Users;

/// <summary>
/// Ramas de User sin cubrir: no-ops por igualdad, borrados, roles y la tasa
/// de stock fantasma (INV-05, ADR-0021).
/// </summary>
public sealed class UserBranchesTests
{
    private static User ActiveBuyer() => new(
        "DOC-1", new FullName("Juan Perez"), new Email("juan@zentric.com"), "hash", UserRole.Buyer);

    private static User ActiveSeller() => new(
        "DOC-2", new FullName("Ana Torres"), new Email("ana@zentric.com"), "hash", UserRole.Seller);

    [Fact]
    public void Constructor_RecortaDocumento()
    {
        var user = new User(
            "  DOC-9  ", new FullName("Juan Perez"), new Email("juan@zentric.com"), "hash", UserRole.Buyer);

        Assert.Equal("DOC-9", user.IdentityDocument);
        Assert.True(user.CanAuthenticate);
        Assert.False(user.IsDeleted);
    }

    [Fact]
    public void UpdateFullName_Igual_NoHaceNada()
    {
        var user = ActiveBuyer();

        user.UpdateFullName(new FullName("Juan Perez"));

        Assert.Equal("Juan Perez", user.FullName.Value);
    }

    [Fact]
    public void UpdateFullName_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.UpdateFullName(new FullName("Otro Nombre")));
    }

    [Fact]
    public void UpdateEmail_Igual_NoHaceNada()
    {
        var user = ActiveBuyer();

        user.UpdateEmail(new Email("juan@zentric.com"));

        Assert.Equal("juan@zentric.com", user.Email.Value);
    }

    [Fact]
    public void UpdateEmail_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.UpdateEmail(new Email("otro@zentric.com")));
    }

    [Fact]
    public void UpdatePasswordHash_Nuevo_Reemplaza()
    {
        var user = ActiveBuyer();

        user.UpdatePasswordHash("nuevo-hash");

        Assert.Equal("nuevo-hash", user.PasswordHash);
    }

    [Fact]
    public void UpdatePasswordHash_Igual_NoHaceNada()
    {
        var user = ActiveBuyer();

        user.UpdatePasswordHash("hash");

        Assert.Equal("hash", user.PasswordHash);
    }

    [Fact]
    public void UpdatePasswordHash_Vacio_Lanza()
    {
        var user = ActiveBuyer();

        Assert.Throws<ArgumentException>(() => user.UpdatePasswordHash("  "));
    }

    [Fact]
    public void UpdatePasswordHash_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.UpdatePasswordHash("otro"));
    }

    [Fact]
    public void UpdateRole_Igual_NoHaceNada()
    {
        var user = ActiveBuyer();

        user.UpdateRole(UserRole.Buyer);

        Assert.Equal(UserRole.Buyer, user.Role);
    }

    [Fact]
    public void UpdateRole_Invalido_Lanza()
    {
        var user = ActiveBuyer();

        Assert.Throws<ArgumentOutOfRangeException>(() => user.UpdateRole((UserRole)999));
    }

    [Fact]
    public void UpdateRole_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.UpdateRole(UserRole.Seller));
    }

    [Fact]
    public void Activate_YaActivo_Lanza()
    {
        var user = ActiveBuyer();

        Assert.Throws<InvalidOperationException>(() => user.Activate());
    }

    [Fact]
    public void Activate_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.Activate());
    }

    [Fact]
    public void Block_Borrado_Lanza()
    {
        var user = ActiveBuyer();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.Block());
    }

    [Fact]
    public void DeleteByAdmin_Activo_Elimina()
    {
        var user = ActiveBuyer();

        user.DeleteByAdmin();

        Assert.True(user.IsDeleted);
        Assert.Equal(UserStatus.Deleted, user.Status);
        Assert.False(user.CanAuthenticate);
    }

    [Fact]
    public void IncrementStockFantasmaRate_NoVendedor_NoHaceNada()
    {
        var user = ActiveBuyer();

        user.IncrementStockFantasmaRate();

        Assert.Equal(0m, user.StockFantasmaRate);
        Assert.False(user.ExceedsStockFantasmaThreshold());
    }

    [Fact]
    public void IncrementStockFantasmaRate_Vendedor_AcumulaConTope()
    {
        var user = ActiveSeller();

        user.IncrementStockFantasmaRate();
        user.IncrementStockFantasmaRate();
        user.IncrementStockFantasmaRate();

        Assert.Equal(0.3m, user.StockFantasmaRate);
        Assert.True(user.ExceedsStockFantasmaThreshold());

        for (var i = 0; i < 10; i++)
        {
            user.IncrementStockFantasmaRate();
        }

        // Tope en 1.0 aunque haya mas incidentes.
        Assert.Equal(1.0m, user.StockFantasmaRate);
        Assert.False(user.ExceedsStockFantasmaThreshold(threshold: 1.1m));
    }

    [Fact]
    public void ExceedsStockFantasmaThreshold_VendedorNuevo_RetornaFalse()
    {
        Assert.False(ActiveSeller().ExceedsStockFantasmaThreshold());
    }
}
