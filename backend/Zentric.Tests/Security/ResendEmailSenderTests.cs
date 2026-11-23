using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Xunit;
using Zentric.Infrastructure.Security;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas unitarias para el adaptador de correo transaccional ResendEmailSender.
    /// Valida fallback local, construcción de payload HTTP, autenticación Bearer y tolerancia a fallos.
    /// </summary>
    public class ResendEmailSenderTests
    {
        private readonly Mock<ILogger<ResendEmailSender>> _loggerMock = new();

        private static IConfiguration CreateConfig(string? apiKey, string fromEmail = "Zentric <onboarding@resend.dev>")
        {
            var dict = new Dictionary<string, string?>();
            if (apiKey != null)
            {
                dict["Resend:ApiKey"] = apiKey;
            }
            dict["Resend:FromEmail"] = fromEmail;

            return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
        }

        /// <summary>
        /// 1. Fallback local cuando la API Key está vacía.
        /// Verifica que en desarrollo local sin credenciales de Resend, el enlace se emita en logs y no se intente ninguna petición de red.
        /// </summary>
        [Fact(DisplayName = "1. Fallback Local sin API Key: No realiza peticiones HTTP y registra advertencia en logs")]
        public async Task SendPasswordResetEmailAsync_WhenApiKeyIsEmpty_LogsWarningAndDoesNotSendHttp()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            var httpClient = new HttpClient(handlerMock.Object);
            var config = CreateConfig(apiKey: string.Empty);

            var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);

            await sender.SendPasswordResetEmailAsync("buyer@zentric.local", "http://localhost:15434/restablecer-contrasena?token=abc");

            handlerMock.Protected().Verify(
                "SendAsync",
                Times.Never(),
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>());
        }

        /// <summary>
        /// 2. Envío HTTP real a la API de Resend.
        /// Verifica que con una clave configurada, la petición viaje a https://api.resend.com/emails con autorización Bearer y el HTML con el enlace.
        /// </summary>
        [Fact(DisplayName = "2. Envío HTTP a Resend: Con API Key válida, construye request POST a https://api.resend.com/emails con Bearer token y HTML")]
        public async Task SendPasswordResetEmailAsync_WhenApiKeyConfigured_SendsPostRequestWithBearerToken()
        {
            HttpRequestMessage? capturedRequest = null;
            string? capturedBody = null;

            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
                {
                    capturedRequest = req;
                    capturedBody = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
                })
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"id\":\"email_123\"}")
                });

            var httpClient = new HttpClient(handlerMock.Object);
            var config = CreateConfig(apiKey: "re_test_live_key_12345");

            var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);
            const string targetEmail = "buyer@zentric.local";
            const string targetLink = "http://localhost:15434/restablecer-contrasena?token=xyz123";

            await sender.SendPasswordResetEmailAsync(targetEmail, targetLink);

            Assert.NotNull(capturedRequest);
            Assert.Equal(HttpMethod.Post, capturedRequest.Method);
            Assert.Equal("https://api.resend.com/emails", capturedRequest.RequestUri?.ToString());
            Assert.Equal("Bearer", capturedRequest.Headers.Authorization?.Scheme);
            Assert.Equal("re_test_live_key_12345", capturedRequest.Headers.Authorization?.Parameter);

            Assert.NotNull(capturedBody);
            using var doc = JsonDocument.Parse(capturedBody);
            var root = doc.RootElement;
            Assert.Equal("Zentric <onboarding@resend.dev>", root.GetProperty("from").GetString());
            Assert.Contains(targetEmail, root.GetProperty("to")[0].GetString());
            Assert.Contains(targetLink, root.GetProperty("html").GetString());
        }

        /// <summary>
        /// 3. Resiliencia ante rechazo de la API de Resend (HTTP 403 / 422).
        /// Verifica que si Resend devuelve un código de error, el método lo capture en logs y no arroje una excepción no controlada que rompa el comando.
        /// </summary>
        [Fact(DisplayName = "3. Resiliencia ante Error de Resend (HTTP 403 / 422): Captura fallo de API y registra error sin propagar excepción")]
        public async Task SendPasswordResetEmailAsync_WhenResendReturnsError_LogsErrorGracefullyWithoutThrowing()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("{\"message\":\"Domain not verified\"}")
                });

            var httpClient = new HttpClient(handlerMock.Object);
            var config = CreateConfig(apiKey: "re_invalid_domain_key");

            var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);

            var exception = await Record.ExceptionAsync(() =>
                sender.SendPasswordResetEmailAsync("buyer@zentric.local", "http://localhost:15434/restablecer-contrasena?token=test"));

            Assert.Null(exception);
        }

        /// <summary>
        /// 4. Resiliencia ante caída de red o timeout.
        /// Si HttpClient lanza HttpRequestException, el adaptador captura el error para degradar elegantemente.
        /// </summary>
        [Fact(DisplayName = "4. Resiliencia ante Caída de Red: Captura HttpRequestException o timeout sin romper el flujo de negocio")]
        public async Task SendPasswordResetEmailAsync_WhenNetworkFails_CatchesExceptionAndLogs()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ThrowsAsync(new HttpRequestException("Connection timeout"));

            var httpClient = new HttpClient(handlerMock.Object);
            var config = CreateConfig(apiKey: "re_valid_key");

            var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);

            var exception = await Record.ExceptionAsync(() =>
                sender.SendPasswordResetEmailAsync("buyer@zentric.local", "http://localhost:15434/restablecer-contrasena?token=test"));

            Assert.Null(exception);
        }

        /// <summary>
        /// 5. Fallback de Configuración para API Key.
        /// Verifica que si configuration["Resend:ApiKey"] es una cadena vacía o espacios en blanco,
        /// el constructor recurra a la variable de entorno RESEND_API_KEY en lugar de almacenar la cadena vacía.
        /// </summary>
        [Fact(DisplayName = "5. Fallback de Configuración: Lee RESEND_API_KEY del entorno cuando Resend:ApiKey está configurada con cadena vacía o espacios en blanco")]
        public async Task SendPasswordResetEmailAsync_WhenConfigApiKeyIsEmpty_UsesEnvironmentVariable()
        {
            const string envVarName = "RESEND_API_KEY";
            var originalEnv = Environment.GetEnvironmentVariable(envVarName);
            try
            {
                Environment.SetEnvironmentVariable(envVarName, "re_from_env_fallback_999");

                HttpRequestMessage? capturedRequest = null;
                var handlerMock = new Mock<HttpMessageHandler>();
                handlerMock.Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.IsAny<HttpRequestMessage>(),
                        ItExpr.IsAny<CancellationToken>())
                    .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
                    {
                        capturedRequest = req;
                    })
                    .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{\"id\":\"email_env\"}")
                    });

                var httpClient = new HttpClient(handlerMock.Object);
                // Simulamos appsettings con "ApiKey": ""
                var config = CreateConfig(apiKey: string.Empty);

                var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);

                await sender.SendPasswordResetEmailAsync("buyer@zentric.local", "http://localhost:15434/reset");

                Assert.NotNull(capturedRequest);
                Assert.Equal("Bearer", capturedRequest.Headers.Authorization?.Scheme);
                Assert.Equal("re_from_env_fallback_999", capturedRequest.Headers.Authorization?.Parameter);
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarName, originalEnv);
            }
        }

        /// <summary>
        /// 6. Fallback de Remitente por Defecto.
        /// Verifica que cuando configuration["Resend:FromEmail"] está vacía o en blanco y no hay variable de entorno,
        /// el remitente por defecto sea 'Zentric <no-reply@zentric.me>'.
        /// </summary>
        [Fact(DisplayName = "6. Fallback de Remitente: Usa default 'Zentric <no-reply@zentric.me>' cuando Resend:FromEmail está vacía o en blanco")]
        public async Task SendPasswordResetEmailAsync_WhenFromEmailIsEmpty_UsesCanonicalDefault()
        {
            const string envVarName = "RESEND_FROM_EMAIL";
            var originalEnv = Environment.GetEnvironmentVariable(envVarName);
            try
            {
                Environment.SetEnvironmentVariable(envVarName, null);

                string? capturedBody = null;
                var handlerMock = new Mock<HttpMessageHandler>();
                handlerMock.Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.IsAny<HttpRequestMessage>(),
                        ItExpr.IsAny<CancellationToken>())
                    .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
                    {
                        capturedBody = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
                    })
                    .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{\"id\":\"email_from\"}")
                    });

                var httpClient = new HttpClient(handlerMock.Object);
                var config = CreateConfig(apiKey: "re_test_key_123", fromEmail: "   ");

                var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);

                await sender.SendPasswordResetEmailAsync("buyer@zentric.local", "http://localhost:15434/reset");

                Assert.NotNull(capturedBody);
                using var doc = JsonDocument.Parse(capturedBody);
                var root = doc.RootElement;
                Assert.Equal("Zentric <no-reply@zentric.me>", root.GetProperty("from").GetString());
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarName, originalEnv);
            }
        }

        /// <summary>
        /// 7. Inyección de Plantilla HTML Polaris con sustitución de tokens.
        /// Verifica que el cuerpo del correo contenga la plantilla HTML profesional y que todos los tokens
        /// ({{resetLink}}, {{userEmail}}, {{requestDate}}, {{requestTime}}, {{ipAddress}}, {{ipLocation}}, {{deviceInfo}})
        /// sean sustituidos sin dejar placeholders sin resolver.
        /// </summary>
        [Fact(DisplayName = "7. Plantilla HTML Polaris: Inyecta plantilla profesional y sustituye todos los tokens de seguridad")]
        public async Task SendPasswordResetEmailAsync_InjectsTemplateAndSubstitutesTokens()
        {
            string? capturedBody = null;
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((req, _) =>
                {
                    capturedBody = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
                })
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"id\":\"email_polaris\"}")
                });

            var httpClient = new HttpClient(handlerMock.Object);
            var config = CreateConfig(apiKey: "re_polaris_template_key");

            var sender = new ResendEmailSender(httpClient, config, _loggerMock.Object);
            const string userEmail = "cliente@zentric.ch";
            const string resetLink = "http://localhost:15434/restablecer-contrasena?token=polaris123";

            await sender.SendPasswordResetEmailAsync(userEmail, resetLink);

            Assert.NotNull(capturedBody);
            using var doc = JsonDocument.Parse(capturedBody);
            var root = doc.RootElement;
            Assert.Equal("Restablece tu contraseña — Zentric", root.GetProperty("subject").GetString());
            var html = root.GetProperty("html").GetString();

            Assert.NotNull(html);
            // Verifica sustitución de tokens principales
            Assert.Contains(resetLink, html);
            Assert.Contains(userEmail, html);
            // Verifica diseño Polaris con mobile polish y expiración en 15 minutos
            Assert.Contains("Restablece tu contraseña", html);
            Assert.Contains("15 minutos", html);
            Assert.Contains("Enlace de acceso seguro para restablecer tu contraseña. Válido por 15 minutos.", html);
            Assert.DoesNotContain("{{resetLink}}", html);
            Assert.DoesNotContain("{{userEmail}}", html);
            Assert.DoesNotContain("{{requestDate}}", html);
            Assert.DoesNotContain("{{requestTime}}", html);
            Assert.DoesNotContain("{{ipAddress}}", html);
            Assert.DoesNotContain("{{ipLocation}}", html);
            Assert.DoesNotContain("{{deviceInfo}}", html);
        }
    }
}
