using Zentric.Domain.Products.Enums;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Users;

/// <summary>
/// Pruebas de caracterización del agregado User.
/// Reglas protegidas: RG-01/RG-02 (usuario autenticado y rol único), un usuario
/// bloqueado no puede modificarse, solo un usuario activo puede autoeliminarse.
/// Referencias: backendSDD/Domain/01-models.md, sección 1; backendSDD/Domain/02-aggregates-and-entities.md, sección 1,
/// backendSDD/Domain/ZENTRIC.md, secciones 5 y 10.
/// </summary>
public sealed class UserTests
{
    private const string PasswordHash = "hashed-password";

    private static User CreateActiveUser(UserRole role = UserRole.Buyer)
        => new("1234567890", new FullName("Juan", "Perez"), new Email("juan.perez@zentric.com"), PasswordHash, role);

    [Fact]
    public void Constructor_ValidData_CreatesActiveUser()
    {
        var user = CreateActiveUser();

        Assert.NotEqual(Guid.Empty, user.Id);
        Assert.Equal(UserStatus.Active, user.Status);
        Assert.True(user.CanAuthenticate);
        Assert.False(user.IsDeleted);
    }

    [Fact]
    public void Constructor_EmptyPasswordHash_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new User("1234567890", new FullName("Juan", "Perez"), new Email("juan@zentric.com"), " ", UserRole.Buyer));

        Assert.Equal("passwordHash", exception.ParamName);
    }

    [Fact]
    public void Constructor_EmptyIdentityDocument_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new User(" ", new FullName("Juan", "Perez"), new Email("juan@zentric.com"), PasswordHash, UserRole.Buyer));

        Assert.Equal("identityDocument", exception.ParamName);
    }

    [Fact]
    public void Constructor_UndefinedRole_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => new User("1234567890", new FullName("Juan", "Perez"), new Email("juan@zentric.com"), PasswordHash, (UserRole)99));
    }

    [Fact]
    public void Block_ActiveUser_SetsStatusBlockedAndDisablesAuthentication()
    {
        var user = CreateActiveUser();

        user.Block();

        Assert.Equal(UserStatus.Blocked, user.Status);
        Assert.False(user.CanAuthenticate);
    }

    [Fact]
    public void Block_AlreadyBlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.Block());
    }

    [Fact]
    public void Activate_BlockedUser_SetsStatusActive()
    {
        var user = CreateActiveUser();
        user.Block();

        user.Activate();

        Assert.Equal(UserStatus.Active, user.Status);
        Assert.True(user.CanAuthenticate);
    }

    [Fact]
    public void UpdateFullName_BlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.UpdateFullName(new FullName("Ana", "Gomez")));
    }

    [Fact]
    public void UpdateEmail_BlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.UpdateEmail(new Email("ana.gomez@zentric.com")));
    }

    [Fact]
    public void UpdatePasswordHash_BlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.UpdatePasswordHash("another-hash"));
    }

    [Fact]
    public void UpdateEmail_ActiveUser_ReplacesEmail()
    {
        var user = CreateActiveUser();
        var newEmail = new Email("nuevo.correo@zentric.com");

        user.UpdateEmail(newEmail);

        Assert.Equal(newEmail, user.Email);
    }

    [Fact]
    public void UpdateRole_BlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.UpdateRole(UserRole.Seller));
    }

    [Fact]
    public void UpdateRole_ActiveUser_ReplacesRole()
    {
        var user = CreateActiveUser();

        user.UpdateRole(UserRole.Seller);

        Assert.Equal(UserRole.Seller, user.Role);
    }

    [Fact]
    public void Delete_ActiveUser_SetsDeletedStatusAndBlocksAuthentication()
    {
        var user = CreateActiveUser();

        user.Delete();

        Assert.True(user.IsDeleted);
        Assert.Equal(UserStatus.Deleted, user.Status);
        Assert.False(user.CanAuthenticate);
    }

    [Fact]
    public void Delete_BlockedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Block();

        Assert.Throws<InvalidOperationException>(() => user.Delete());
    }

    [Fact]
    public void Delete_AlreadyDeletedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.Delete();

        Assert.Throws<InvalidOperationException>(() => user.Delete());
    }

    [Fact]
    public void Restore_DeletedUser_ReactivatesUser()
    {
        var user = CreateActiveUser();
        user.Delete();

        user.Restore();

        Assert.False(user.IsDeleted);
        Assert.Equal(UserStatus.Active, user.Status);
        Assert.True(user.CanAuthenticate);
    }

    [Fact]
    public void Restore_NotDeletedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();

        Assert.Throws<InvalidOperationException>(() => user.Restore());
    }

    [Fact]
    public void DeleteByAdmin_BlockedUser_DeletesUser()
    {
        var user = CreateActiveUser();
        user.Block();

        user.DeleteByAdmin();

        Assert.True(user.IsDeleted);
        Assert.Equal(UserStatus.Deleted, user.Status);
    }

    [Fact]
    public void DeleteByAdmin_AlreadyDeletedUser_ThrowsInvalidOperationException()
    {
        var user = CreateActiveUser();
        user.DeleteByAdmin();

        Assert.Throws<InvalidOperationException>(() => user.DeleteByAdmin());
    }
}

