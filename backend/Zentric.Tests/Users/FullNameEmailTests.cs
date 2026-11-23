using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Users;

/// <summary>
/// Guardas y ramas no cubiertas de los value objects de identidad.
/// </summary>
public sealed class FullNameTests
{
    [Fact(DisplayName = "1. Nombre Completo: Normaliza mayúsculas y minúsculas por componente")]
    public void Constructor_PartesValidas_NormalizaCapitalizacion()
    {
        var name = new FullName("jUaN", "pEREZ");

        Assert.Equal("Juan", name.FirstName);
        Assert.Equal("Perez", name.LastName);
        Assert.Equal("Juan Perez", name.Value);
    }

    [Fact(DisplayName = "2. Apellidos Múltiples: Preserva y une apellidos compuestos")]
    public void Constructor_TextoCompleto_UneApellidosMultiples()
    {
        // La normalizacion capitaliza solo la primera letra del apellido
        // compuesto; es el comportamiento vigente, no un requisito nuevo.
        var name = new FullName("  Ana   Maria Torres  ");

        Assert.Equal("Ana", name.FirstName);
        Assert.Equal("Maria torres", name.LastName);
    }

    [Theory(DisplayName = "3. Validación de Vacío: Texto en blanco lanza ArgumentException")]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_TextoVacio_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new FullName(value));
    }

    [Fact(DisplayName = "4. Formato Incompleto: Una sola palabra sin apellido lanza ArgumentException")]
    public void Constructor_UnaSolaPalabra_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new FullName("Madonna"));
    }

    [Theory(DisplayName = "5. Partes Incompletas: Nombre o apellido vacío lanza ArgumentException")]
    [InlineData("", "Perez")]
    [InlineData("Juan", "")]
    [InlineData("   ", "Perez")]
    public void Constructor_ParteVacia_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Theory(DisplayName = "6. Longitud Mínima: Inicial o parte de una sola letra lanza ArgumentException")]
    [InlineData("J", "Perez")]
    [InlineData("Juan", "P")]
    public void Constructor_ParteDeUnaLetra_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Fact(DisplayName = "7. Longitud Máxima: Nombres o apellidos mayores a 80 caracteres lanzan ArgumentException")]
    public void Constructor_ParteMuyLarga_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new FullName(new string('a', 81), "Perez"));
        Assert.Throws<ArgumentException>(() => new FullName("Juan", new string('a', 81)));
    }

    [Theory(DisplayName = "8. Caracteres Válidos: Presencia de dígitos numéricos en nombre o apellido lanza ArgumentException")]
    [InlineData("Juan2", "Perez")]
    [InlineData("Juan", "P3rez")]
    public void Constructor_ConDigitos_Lanza(string first, string last)
    {
        Assert.Throws<ArgumentException>(() => new FullName(first, last));
    }

    [Fact(DisplayName = "9. Comparación con Nulo: Equals con nulo retorna false")]
    public void Equals_Null_RetornaFalse()
    {
        var name = new FullName("Juan Perez");

        Assert.False(name.Equals(null));
        Assert.False(name.Equals((object?)null));
        Assert.False(name.Equals("Juan Perez"));
    }

    [Fact(DisplayName = "10. Equivalencia: Equals es insensible a mayúsculas/minúsculas")]
    public void Equals_IgnoraMayusculas()
    {
        var left = new FullName("Juan Perez");
        var right = new FullName("JUAN PEREZ");

        Assert.True(left.Equals(right));
        Assert.True(left.Equals((object)right));
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact(DisplayName = "11. Representación String: ToString retorna el nombre completo normalizado")]
    public void ToString_RetornaValorCompleto()
    {
        Assert.Equal("Juan Perez", new FullName("Juan Perez").ToString());
    }
}

public sealed class EmailTests
{
    [Fact(DisplayName = "12. Normalización de Email: Trimea espacios y convierte a minúsculas")]
    public void Constructor_Valido_NormalizaAMinusculas()
    {
        var email = new Email("  Juan@Zentric.COM  ");

        Assert.Equal("juan@zentric.com", email.Value);
    }

    [Theory(DisplayName = "13. Email Vacío: Cadenas vacías o con espacios lanzan ArgumentException")]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_Vacio_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new Email(value));
    }

    [Fact(DisplayName = "14. Longitud Mínima de Email: Formatos extremadamente cortos lanzan ArgumentException")]
    public void Constructor_MuyCorto_Lanza()
    {
        Assert.Throws<ArgumentException>(() => new Email("a@b."));
    }

    [Theory(DisplayName = "15. Sintaxis de Email: Correos sin arroba, sin dominio o malformados lanzan ArgumentException")]
    [InlineData("juanzentric.com")]
    [InlineData("juan@zentric")]
    [InlineData("@zentric.com")]
    [InlineData("juan@")]
    [InlineData("juan@@zentric.com")]
    public void Constructor_SinFormato_Lanza(string value)
    {
        Assert.Throws<ArgumentException>(() => new Email(value));
    }

    [Fact(DisplayName = "16. Comparación con Nulo: Equals con nulo o tipo incompatible retorna false")]
    public void Equals_Null_RetornaFalse()
    {
        var email = new Email("juan@zentric.com");

        Assert.False(email.Equals(null));
        Assert.False(email.Equals((object?)null));
        Assert.False(email.Equals("juan@zentric.com"));
    }

    [Fact(DisplayName = "17. Equivalencia de Email: Equals es insensible a mayúsculas/minúsculas")]
    public void Equals_IgnoraMayusculas()
    {
        var left = new Email("juan@zentric.com");
        var right = new Email("JUAN@ZENTRIC.COM");

        Assert.True(left.Equals(right));
        Assert.True(left.Equals((object)right));
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact(DisplayName = "18. Representación String: ToString retorna el correo normalizado en minúsculas")]
    public void ToString_RetornaValorNormalizado()
    {
        Assert.Equal("juan@zentric.com", new Email("Juan@Zentric.com").ToString());
    }
}
