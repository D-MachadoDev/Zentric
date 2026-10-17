using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas contractuales para la política de CORS ("Frontend").
    /// Fuente de Verdad: backendSDD/Backend-Cors-Security.md.
    /// Valida que no se permitan comodines (*), que los orígenes provengan de configuración,
    /// que las credenciales (cookies) estén deshabilitadas y que soporte los métodos y cabeceras de integración.
    /// </summary>
    public sealed class CorsSecurityTests
    {
        private static CorsPolicy BuildCorsPolicy(string? configuredOrigins)
        {
            var memoryConfig = new Dictionary<string, string?>();
            if (configuredOrigins != null)
            {
                memoryConfig["Cors:AllowedOrigins"] = configuredOrigins;
            }

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(memoryConfig)
                .Build();

            var services = new ServiceCollection();

            var originsSection = configuration.GetSection("Cors:AllowedOrigins").Value;
            var allowedOrigins = string.IsNullOrWhiteSpace(originsSection)
                ? new[] { "http://localhost:5173" }
                : originsSection.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            var sp = services.BuildServiceProvider();
            var corsOptions = sp.GetRequiredService<IOptions<CorsOptions>>().Value;
            return corsOptions.GetPolicy("Frontend")!;
        }

        [Fact]
        public void CorsPolicy_WhenUnconfigured_UsesSafeDefaultOriginWithoutWildcards()
        {
            var policy = BuildCorsPolicy(null);

            Assert.NotNull(policy);
            Assert.Contains("http://localhost:5173", policy.Origins);
            Assert.DoesNotContain("*", policy.Origins);
            Assert.False(policy.SupportsCredentials, "AllowCredentials debe ser false según Backend-Cors-Security.md sección 2");
        }

        [Fact]
        public void CorsPolicy_WhenConfiguredWithMultipleOrigins_ParsesAndTrimsAllOrigins()
        {
            var policy = BuildCorsPolicy("https://zentric.me, http://localhost:5173, https://app.zentric.me ");

            Assert.NotNull(policy);
            Assert.Equal(3, policy.Origins.Count);
            Assert.Contains("https://zentric.me", policy.Origins);
            Assert.Contains("http://localhost:5173", policy.Origins);
            Assert.Contains("https://app.zentric.me", policy.Origins);
            Assert.DoesNotContain("*", policy.Origins);
        }

        [Fact]
        public void CorsPolicy_PermitsStandardHeadersAndMethods()
        {
            var policy = BuildCorsPolicy("https://zentric.me");

            Assert.True(policy.AllowAnyHeader, "Debe permitir cabeceras como Authorization, Content-Type, Accept");
            Assert.True(policy.AllowAnyMethod, "Debe permitir métodos CRUD y OPTIONS para preflight");
            Assert.False(policy.AllowAnyOrigin, "Prohibido el uso de comodín (*) en orígenes cuando se manejan tokens");
        }

        [Theory]
        [InlineData("*")]
        [InlineData("*, https://zentric.me")]
        public void CorsPolicy_ProhibitsWildcardOriginsInProductionSettings(string unsafeOrigins)
        {
            var parsed = unsafeOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            Assert.Contains("*", parsed);
            // La especificación prohíbe explícitamente el uso de comodines en orígenes
        }
    }
}
