using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Zentric.Api.Contracts;

/// <summary>
/// Configuracion de serializacion JSON para serializar y deserializar enumeraciones estrictamente por nombre.
/// Enteros numericos son rechazados con 400 mediante <c>allowIntegerValues: false</c>.
/// </summary>
public static class EnumJsonContract
{
    /// <summary>
    /// Engancha el contrato a los controladores. Es el unico punto de registro: quien agregue
    /// un <c>AddJsonOptions</c> aparte vuelve a partir el contrato por la mitad.
    /// </summary>
    public static IMvcBuilder AddZentricEnumContract(this IMvcBuilder builder) =>
        builder.AddJsonOptions(options => Configure(options.JsonSerializerOptions));

    /// <summary>
    /// Aplica el contrato a unas opciones dadas. <c>allowIntegerValues: false</c> es la parte
    /// estricta del dictado: un numero en un campo de enum deja de ser un valor valido y el
    /// lector lanza, de modo que el pipeline de MVC responde 400 con Problem Details.
    /// </summary>
    /// <param name="options">Opciones de serializacion de la peticion en curso.</param>
    public static void Configure(JsonSerializerOptions options)
    {
        // namingPolicy en null = el nombre exacto del enum (PascalCase), que es lo que ya
        // producen las salidas al hacer .ToString(). La lectura es insensible a mayusculas
        // (verificado: "seller" y "Seller" pasan ambos), asi que no hace falta un converter propio.
        options.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
    }
}
