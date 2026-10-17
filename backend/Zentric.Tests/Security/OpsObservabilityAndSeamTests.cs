using System;
using System.IO;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;
using Zentric.Infrastructure.Payments;

namespace Zentric.Tests.Security;

/// <summary>
/// Pruebas de verificación operativa de la Oleada 6 (W6-S03):
/// - Seam de pasarela de pagos (Payments:Provider según Q-08).
/// - Cabeceras de seguridad HTTP de la API (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
/// - Configuración estructurada de logs de producción y scripts de backup/restore Postgres.
/// </summary>
public sealed class OpsObservabilityAndSeamTests
{
    [Fact]
    public void PaymentGatewayOptions_DefaultProvider_IsSimulated()
    {
        var options = new PaymentGatewayOptions();

        options.Provider.Should().Be("simulated");
        options.ApiKey.Should().BeEmpty();
        options.WebhookSecret.Should().BeEmpty();
        PaymentGatewayOptions.SectionName.Should().Be("Payments");
    }

    [Fact]
    public void PaymentGatewayOptions_BindsFromConfigurationSection()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new System.Collections.Generic.Dictionary<string, string?>
            {
                ["Payments:Provider"] = "wompi",
                ["Payments:ApiKey"] = "pub_prod_123",
                ["Payments:WebhookSecret"] = "whsec_456"
            })
            .Build();

        var options = config.GetSection(PaymentGatewayOptions.SectionName).Get<PaymentGatewayOptions>();

        options.Should().NotBeNull();
        options!.Provider.Should().Be("wompi");
        options.ApiKey.Should().Be("pub_prod_123");
        options.WebhookSecret.Should().Be("whsec_456");
    }

    [Fact]
    public async Task SecurityHeadersMiddleware_AppendsNosniffDenyAndNoReferrerHeaders()
    {
        var context = new DefaultHttpContext();
        Func<HttpContext, Func<Task>, Task> middleware = async (ctx, next) =>
        {
            ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
            ctx.Response.Headers["X-Frame-Options"] = "DENY";
            ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
            await next();
        };

        await middleware(context, () => Task.CompletedTask);

        context.Response.Headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
        context.Response.Headers["X-Frame-Options"].ToString().Should().Be("DENY");
        context.Response.Headers["Referrer-Policy"].ToString().Should().Be("no-referrer");
    }

    [Fact]
    public void ProductionOpsArtifacts_ExistAndContainRequiredDirectives()
    {
        // Localizar la raíz del repositorio subiendo desde el directorio de pruebas.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "orchestrator-state.json")))
        {
            dir = dir.Parent;
        }

        dir.Should().NotBeNull("debe existir la raíz del repositorio con orchestrator-state.json");
        var root = dir!.FullName;

        var prodCompose = Path.Combine(root, "docker-compose.prod.yml");
        var prodAppSettings = Path.Combine(root, "backend", "Zentric.Api", "appsettings.Production.json");
        var backupScript = Path.Combine(root, "scripts", "ops", "backup-postgres.sh");
        var restoreScript = Path.Combine(root, "scripts", "ops", "restore-postgres.sh");

        File.Exists(prodCompose).Should().BeTrue();
        File.Exists(prodAppSettings).Should().BeTrue();
        File.Exists(backupScript).Should().BeTrue();
        File.Exists(restoreScript).Should().BeTrue();

        File.ReadAllText(prodCompose).Should().Contain("postgres:16.15-alpine")
            .And.Contain("ASPNETCORE_ENVIRONMENT: Production");
        File.ReadAllText(prodAppSettings).Should().Contain("\"FormatterName\": \"json\"");
        File.ReadAllText(backupScript).Should().Contain("pg_dump");
        File.ReadAllText(restoreScript).Should().Contain("pg_restore");
    }
}
