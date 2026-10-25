using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Users;

/// <summary>
/// Guardas y ramas no cubiertas de los value objects de identidad.
/// </summary>
public sealed class FullNameTests
{
    [Fact]
    public void Constructor_PartesValidas_NormalizaCapitalizacion()
    {
        var name = new FullName("jUaN", "pEREZ");

        Assert.Equal("Juan", name.FirstName);
        Assert.Equal("Perez", name.LastName);
        Assert.Equal("Juan Perez", name.Value);
    }

    [Fact]
    public void Constructor_TextoCompleto_UneApellidosMultiples()
    {
        // La normalizacion capitaliza solo la primera letra del apellido
        // compuesto; es el comportamiento vigente, no un requisito nuevo.
        var name = new FullName("  Ana   Maria Torres  ");

        Assert.Equal("Ana", name.FirstName);
        Assert.Equal("Maria torres", name.LastName);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_TextoVacio_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new FullName(value));
    }

    [Fact]
    public void Constructor_UnaSolaPalabra_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new FullName("Madonna"));
    }

    [Theory]
    [InlineData("", "Perez")]
    [InlineData("Juan", "")]
    [InlineData("   ", "Perez")]
    public void Constructor_ParteVacia_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Theory]
    [InlineData("J", "Perez")]
    [InlineData("Juan", "P")]
    public void Constructor_ParteDeUnaLetra_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Fact]
    public void Constructor_ParteMuyLarga_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new FullName(new string('a', 81), "Perez"));
        Assert.Throws<ArgumentException>(() => new FullName("Juan", new string('a', 81)));
    }

    [Theory]
    [InlineData("Juan2", "Perez")]
    [InlineData("Juan", "P3rez")]
    public void Constructor_ConDigitos_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Fact]
    public void Equals_Null_RetornaFalse()
    {
        var name = new FullName("Juan Perez");

        Assert.False(name.Equals(null));
        Assert.False(name.Equals((object?)null));
        Assert.False(name.Equals("Juan Perez"));
    }

    [Fact]
    public void Equals_IgnoraMayusculas()
    {
        var left = new FullName("Juan Perez");
        var right = new FullName("JUAN PEREZ");

        Assert.True(left.Equals(right));
        Assert.True(left.Equals((object)right));
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact]
    public void ToString_RetornaValorCompleto()
    {
        Assert.Equal("Juan Perez", new FullName("Juan Perez").ToString());
    }
}

public sealed class EmailTests
{
    [Fact]
    public void Constructor_Valido_NormalizaAMinusculas()
    {
        var email = new Email("  Juan@Zentric.COM  ");

        Assert.Equal("juan@zentric.com", email.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_Vacio_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new Email(value));
    }

    [Fact]
    public void Constructor_MuyCorto_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new Email("a@b."));
    }

    [Theory]
    [InlineData("juanzentric.com")]
    [InlineData("juan@zentric")]
    [InlineData("@zentric.com")]
    [InlineData("juan@")]
    [InlineData("juan@@zentric.com")]
    public void Constructor_SinFormato_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new Email(value));
    }

    [Fact]
    public void Equals_Null_RetornaFalse()
    {
        var email = new Email("juan@zentric.com");

        Assert.False(email.Equals(null));
        Assert.False(email.Equals((object?)null));
        Assert.False(email.Equals("juan@zentric.com"));
    }

    [Fact]
    public void Equals_IgnoraMayusculas()
    {
        var left = new Email("juan@zentric.com");
        var right = new Email("JUAN@ZENTRIC.COM");

        Assert.True(left.Equals(right));
        Assert.True(left.Equals((object)right));
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact]
    public void ToString_RetornaValorNormalizado()
    {
        Assert.Equal("juan@zentric.com", new Email("Juan@Zentric.com").ToString());
    }
}
