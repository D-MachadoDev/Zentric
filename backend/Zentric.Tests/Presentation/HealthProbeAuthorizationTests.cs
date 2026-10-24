using System;
using System.IO;
using Xunit;

namespace Zentric.Tests.Presentation;

/// <summary>
/// Las sondas de salud deben ser ANONIMAS.
/// </summary>
/// <remarks>
/// La politica de reserva de la API (<c>FallbackPolicy</c> en <c>Program.cs</c>)
/// exige token en TODA ruta, incluidos los endpoints minimales. Una sonda sin
/// <c>AllowAnonymous</c> respondia 401 en vez de informar su estado: el
/// orquestador leia "no autorizado" como "caido" y retiraba la replica sin
/// motivo, mientras el proceso estaba perfectamente vivo.
///
/// La comprobacion es sobre el fuente porque el fallo aparece en el
/// ENSAMBLADO de la ruta (endpoint minimal + politica de reserva), que solo
/// se puede observar levantando la API contra PostgreSQL. El patron de
/// archivo ya lo usa <c>OpsObservabilityAndSeamTests</c> para los artefactos
/// de operacion, y aqui protege la misma clase de defecto: una sonda
/// operativa que no responde lo que debe.
/// </remarks>
public sealed class HealthProbeAuthorizationTests
{
    private static string ReadProgramSource()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        // El marcador `orchestrator-state.json` fue retirado por la limpieza
        // de metodologia (S9), asi que se usa `ZENTRIC.md`, que es la Ley del
        // proyecto y esta en la raiz del repositorio.
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "ZENTRIC.md")))
        {
            dir = dir.Parent;
        }

        Assert.NotNull(dir);

        var programPath = Path.Combine(dir!.FullName, "backend", "Zentric.Api", "Program.cs");
        Assert.True(File.Exists(programPath), $"No se encontro {programPath}");

        return File.ReadAllText(programPath);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/ready")]
    public void HealthProbe_IsMappedAsAnonymous(string route)
    {
        var source = ReadProgramSource();

        var mapIndex = source.IndexOf($"MapHealthChecks(\"{route}\"", StringComparison.Ordinal);
        Assert.True(mapIndex >= 0, $"La sonda {route} no esta mapeada.");

        // El bloque va desde el MapHealthChecks hasta el siguiente Map* o el
        // final del archivo: es donde vive su configuracion de autorizacion.
        var nextMap = source.IndexOf("\napp.Map", mapIndex, StringComparison.Ordinal);
        var block = nextMap < 0 ? source[mapIndex..] : source[mapIndex..nextMap];

        Assert.Contains(".AllowAnonymous()", block, StringComparison.Ordinal);
    }

    [Fact]
    public void HealthProbe_DoesNotRequireTheDatabase()
    {
        var source = ReadProgramSource();

        var mapIndex = source.IndexOf("MapHealthChecks(\"/health\"", StringComparison.Ordinal);
        Assert.True(mapIndex >= 0);

        var nextMap = source.IndexOf("\napp.Map", mapIndex, StringComparison.Ordinal);
        var block = nextMap < 0 ? source[mapIndex..] : source[mapIndex..nextMap];

        // La sonda de VIVENCIA no puede depender de PostgreSQL: si la base cae,
        // el proceso sigue vivo y debe decirlo, no reportarse caido.
        Assert.Contains("Predicate = _ => false", block, StringComparison.Ordinal);
    }

    [Fact]
    public void ReadinessProbe_VerifiesTheDatabase()
    {
        var source = ReadProgramSource();

        var mapIndex = source.IndexOf("MapHealthChecks(\"/ready\"", StringComparison.Ordinal);
        Assert.True(mapIndex >= 0);

        var nextMap = source.IndexOf("\napp.Map", mapIndex, StringComparison.Ordinal);
        var block = nextMap < 0 ? source[mapIndex..] : source[mapIndex..nextMap];

        // La sonda de PREPARACION si debe verificar la base: sin ella, el
        // orquestador enviaria trafico a una replica que no puede servir.
        Assert.Contains("Tags.Contains(\"ready\")", block, StringComparison.Ordinal);
    }
}
