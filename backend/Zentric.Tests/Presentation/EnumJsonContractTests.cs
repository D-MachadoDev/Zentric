using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Zentric.Api.Contracts;
using Zentric.Application.Users.Commands;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Presentation;

/// <summary>
/// Q-22 / ADR-0012: el contrato publico de los enum del cuerpo JSON es por nombre y solo por
/// nombre (dictado del Owner el 2026-09-29, forma estricta).
///
/// <remarks>
/// Estas pruebas ejercen la tuberia real de MVC (<c>AddControllers().AddZentricEnumContract()</c>),
/// no unas opciones fabricadas por separado: si el registro se desconecta de la tuberia, aqui se ve.
/// Lo que aqui no se puede probar es que <c>Program.cs</c> llame al extension; eso lo cubre la
/// comprobacion por HTTP de <c>backend/scripts/authorization-smoke.ps1</c> (dos capas, igual que
/// la matriz de autorizacion de Q-21).
/// </remarks>
/// </summary>
public class EnumJsonContractTests
{
    /// <summary>Cuerpo valido de POST /api/users con el enum en la forma que se le pase.</summary>
    private static string BuildUserBody(string roleJson) =>
        $$"""{"identityDocument":"Q22-0001","fullName":"Prueba Q22","email":"q22@zentric.test","password":"Clave123!","role":{{roleJson}}}""";

    /// <summary>
    /// Opciones con las que la API lee y escribe el JSON, obtenidas del contenedor de servicios.
    /// </summary>
    private static JsonSerializerOptions BuildPipelineOptions()
    {
        var services = new ServiceCollection();
        services.AddControllers().AddZentricEnumContract();

        using var provider = services.BuildServiceProvider();

        return provider.GetRequiredService<IOptions<JsonOptions>>().Value.JsonSerializerOptions;
    }

    [Fact]
    public void CuerpoConNombreDeRol_SeDeserializa()
    {
        var options = BuildPipelineOptions();

        var command = JsonSerializer.Deserialize<CreateUserCommand>(BuildUserBody("\"Seller\""), options);

        Assert.NotNull(command);
        Assert.Equal(UserRole.Seller, command.Role);
    }

    [Fact]
    public void CuerpoConEntero_FallaPorqueElContratoSoloAceptaNombres()
    {
        var options = BuildPipelineOptions();

        // Antes de Q-22 esto era un alta valida: 0 == Buyer. Con allowIntegerValues: false el
        // lector lanza y el pipeline de MVC responde 400, que es lo que dicto el Owner.
        var body = BuildUserBody("0");

        var exception = Record.Exception(() => JsonSerializer.Deserialize<CreateUserCommand>(body, options));

        Assert.IsAssignableFrom<JsonException>(exception);
    }

    [Fact]
    public void NombreInexistente_FallaEnLugarDeCrearUnRol()
    {
        var options = BuildPipelineOptions();

        // "Admin" no existe en UserRole (el nombre es "Administrator"). Un nombre equivocado no
        // puede degradarse a un valor por defecto: tiene que reventar en la lectura.
        var exception = Record.Exception(() => JsonSerializer.Deserialize<CreateUserCommand>(
            BuildUserBody("\"Admin\""), options));

        Assert.IsAssignableFrom<JsonException>(exception);
    }

    [Fact]
    public void NombreEnMinusculas_SeAcepta()
    {
        var options = BuildPipelineOptions();

        var command = JsonSerializer.Deserialize<CreateUserCommand>(BuildUserBody("\"seller\""), options);

        // Fijado a proposito: la lectura del converter de .NET es insensible a mayusculas, lo que
        // deja sin uso un converter propio (opcionalidad descartada). Si alguien cambia esto a
        // case-sensitive, el frontend y Postman se rompen y esta prueba lo avisa.
        Assert.NotNull(command);
        Assert.Equal(UserRole.Seller, command.Role);
    }

    [Fact]
    public void Escitura_DeElNombreExactoDelEnum()
    {
        var options = BuildPipelineOptions();

        // Las salidas del sistema ya eran texto porque los DTOs exponen string + .ToString().
        // Esto cubre el dia que un DTO exponga el enum directo: tiene que decir lo mismo.
        Assert.Equal("\"Seller\"", JsonSerializer.Serialize(UserRole.Seller, options));
        Assert.Equal("\"Physical\"", JsonSerializer.Serialize(ProductType.Physical, options));
    }
}
