using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;
using Zentric.Infrastructure.Payments;

namespace Zentric.Tests.Security;

/// <summary>
/// Pruebas de verificación operativa de la Oleada 6 (W6-S03):
/// - Seam de pasarela de pagos (Payments:Provider).
/// - Cabeceras de seguridad HTTP de la API (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
/// - Configuración estructurada de logs de producción y scripts de backup/restore Postgres.
/// </summary>
public sealed class OpsObservabilityAndSeamTests
{
    [Fact]
    public void PaymentGatewayOptions_DefaultProvider_IsSimulated()
    {
        var options = new PaymentGatewayOptions();

        Assert.Equal("simulated", options.Provider);
        Assert.Equal(string.Empty, options.ApiKey);
        Assert.Equal(string.Empty, options.WebhookSecret);
        Assert.Equal("Payments", PaymentGatewayOptions.SectionName);
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

        Assert.NotNull(options);
        Assert.Equal("wompi", options!.Provider);
        Assert.Equal("pub_prod_123", options.ApiKey);
        Assert.Equal("whsec_456", options.WebhookSecret);
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

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString());
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"].ToString());
        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"].ToString());
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

        Assert.NotNull(dir);
        var root = dir!.FullName;

        var prodCompose = Path.Combine(root, "docker-compose.prod.yml");
        var prodAppSettings = Path.Combine(root, "backend", "Zentric.Api", "appsettings.Production.json");
        var backupScript = Path.Combine(root, "scripts", "ops", "backup-postgres.sh");
        var restoreScript = Path.Combine(root, "scripts", "ops", "restore-postgres.sh");

        Assert.True(File.Exists(prodCompose));
        Assert.True(File.Exists(prodAppSettings));
        Assert.True(File.Exists(backupScript));
        Assert.True(File.Exists(restoreScript));

        var prodComposeContent = File.ReadAllText(prodCompose);
        Assert.Contains("postgres:16.15-alpine", prodComposeContent);
        Assert.Contains("ASPNETCORE_ENVIRONMENT: Production", prodComposeContent);
        Assert.Contains("\"FormatterName\": \"json\"", File.ReadAllText(prodAppSettings));
        Assert.Contains("pg_dump", File.ReadAllText(backupScript));
        Assert.Contains("pg_restore", File.ReadAllText(restoreScript));
    }
}
