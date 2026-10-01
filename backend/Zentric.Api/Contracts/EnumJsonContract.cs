using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Zentric.Api.Contracts;

/// <summary>
/// Unica configuracion del contrato JSON de los enum (Q-22, ADR-0012).
///
/// <remarks>
/// Decision del Owner del 2026-09-29 (forma estricta): los enum del cuerpo JSON viajan
/// **solo como nombre** ("Buyer", "Physical"), nunca como entero. Antes de esto la API era
/// incoherente consigo misma: las salidas ya devolvian el nombre (<c>order.Status.ToString()</c>),
/// el binding de query ya aceptaba nombres (<c>GET /api/users?role=Seller</c>) y solo el cuerpo
/// exigia el numero. Con un contrato numerico, un <c>"role": 2</c> mal escrito era un
/// Administrador valido; ahora ese cuerpo responde 400.
///
/// Se registra en un sitio unico y testeable: <see cref="AddZentricEnumContract"/> lo engancha
/// a la tuberia de MVC, <c>EnumJsonContractTests</c> ejerce la tuberia real y
/// <c>backend/scripts/authorization-smoke.ps1</c> lo comprueba por HTTP contra la API levantada.
/// </remarks>
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
