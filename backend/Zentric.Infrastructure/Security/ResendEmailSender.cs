using System;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Zentric.Domain.Users.Ports;

namespace Zentric.Infrastructure.Security
{
    /// <summary>
    /// Adaptador para el envío de correos transaccionales mediante la API de Resend (https://resend.com).
    /// Incorpora la plantilla HTML Polaris institucional con soporte para lectura en disco y fallback en memoria.
    /// </summary>
    public sealed class ResendEmailSender : IEmailSender
    {
        private const string ResendApiEndpoint = "https://api.resend.com/emails";
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly string _fromEmail;
        private readonly string _frontendBaseUrl;
        private readonly ILogger<ResendEmailSender> _logger;

        public ResendEmailSender(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<ResendEmailSender> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            var configuredKey = configuration["Resend:ApiKey"];
            _apiKey = !string.IsNullOrWhiteSpace(configuredKey)
                ? configuredKey
                : Environment.GetEnvironmentVariable("RESEND_API_KEY");

            var configuredFrom = configuration["Resend:FromEmail"];
            var envFrom = Environment.GetEnvironmentVariable("RESEND_FROM_EMAIL");
            _fromEmail = !string.IsNullOrWhiteSpace(configuredFrom)
                ? configuredFrom
                : (!string.IsNullOrWhiteSpace(envFrom) ? envFrom : "Zentric <no-reply@zentric.me>");

            _frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:15434";
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.StartsWith("mock_", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "[ResendEmailSender] Fallback local activo. Correo de recuperación simulado para: {Email}. Enlace directo: {ResetLink}",
                    toEmail,
                    resetLink);
                return;
            }

            try
            {
                var htmlBody = BuildEmailHtml(toEmail, resetLink);

                var payload = new
                {
                    from = _fromEmail,
                    to = new[] { toEmail },
                    subject = "Restablece tu contraseña — Zentric",
                    html = htmlBody
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiEndpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError(
                        "[ResendEmailSender] Error al enviar email mediante Resend: {StatusCode} - {Content}. Aplicando fallback de enlace: {ResetLink}",
                        response.StatusCode,
                        errorContent,
                        resetLink);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "[ResendEmailSender] Excepción de transporte al conectar con Resend. Fallback de enlace: {ResetLink}",
                    resetLink);
            }
        }

        public async Task SendInvoiceEmailAsync(
            string toEmail,
            string buyerName,
            string orderCode,
            byte[] invoicePdf,
            string invoiceUrl,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.StartsWith("mock_", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "[ResendEmailSender] Fallback local activo. Correo de factura simulado para: {Email}. Enlace a la factura: {InvoiceUrl}",
                    toEmail,
                    invoiceUrl);
                return;
            }

            try
            {
                var htmlBody = BuildInvoiceEmailHtml(buyerName, orderCode, invoiceUrl);

                var attachment = new
                {
                    filename = $"Factura-{orderCode}.pdf",
                    content = Convert.ToBase64String(invoicePdf)
                };

                var payload = new
                {
                    from = _fromEmail,
                    to = new[] { toEmail },
                    subject = $"Tu factura de compra #{orderCode} — Zentric",
                    html = htmlBody,
                    attachments = new[] { attachment }
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiEndpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError(
                        "[ResendEmailSender] Error al enviar la factura por email mediante Resend: {StatusCode} - {Content}. Fallback de enlace: {InvoiceUrl}",
                        response.StatusCode,
                        errorContent,
                        invoiceUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "[ResendEmailSender] Excepción de transporte al enviar la factura por email. Fallback de enlace: {InvoiceUrl}",
                    invoiceUrl);
            }
        }

        public async Task SendDigitalDeliveryEmailAsync(
            string toEmail,
            string buyerName,
            string productName,
            string? downloadUrl,
            string orderId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.StartsWith("mock_", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "[ResendEmailSender] Fallback local activo. Entrega digital simulada para: {Email}. Producto: {ProductName}. Enlace de descarga: {DownloadUrl}",
                    toEmail,
                    productName,
                    downloadUrl);
                return;
            }

            try
            {
                var orderUrl = $"{_frontendBaseUrl.TrimEnd('/')}/buyer/orders/{orderId}";
                var htmlBody = BuildDigitalDeliveryEmailHtml(buyerName, productName, downloadUrl, orderUrl);

                var payload = new
                {
                    from = _fromEmail,
                    to = new[] { toEmail },
                    subject = $"Tu producto digital está listo — Zentric",
                    html = htmlBody
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiEndpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError(
                        "[ResendEmailSender] Error al enviar la entrega digital mediante Resend: {StatusCode} - {Content}. Enlace de descarga: {DownloadUrl}",
                        response.StatusCode,
                        errorContent,
                        downloadUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "[ResendEmailSender] Excepción de transporte al enviar la entrega digital. Enlace de descarga: {DownloadUrl}",
                    downloadUrl);
            }
        }

        public async Task SendReturnApprovedEmailAsync(
            string toEmail,
            string buyerName,
            string productName,
            string orderShortId,
            int quantity,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.StartsWith("mock_", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "[ResendEmailSender] Fallback local activo. Aprobación de devolución simulada para: {Email}. Producto: {ProductName}. Pedido: {OrderShortId}",
                    toEmail, productName, orderShortId);
                return;
            }

            try
            {
                var ordersUrl = $"{_frontendBaseUrl.TrimEnd('/')}/buyer/orders";
                var htmlBody = BuildReturnApprovedEmailHtml(buyerName, productName, orderShortId, quantity, ordersUrl);

                var payload = new
                {
                    from = _fromEmail,
                    to = new[] { toEmail },
                    subject = $"Devolución aprobada — {productName}",
                    html = htmlBody
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiEndpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError(
                        "[ResendEmailSender] Error al enviar la aprobación de devolución mediante Resend: {StatusCode} - {Content}. Pedido: {OrderShortId}",
                        response.StatusCode, errorContent, orderShortId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ResendEmailSender] Excepción de transporte al enviar la aprobación de devolución. Pedido: {OrderShortId}", orderShortId);
            }
        }

        private static string BuildReturnApprovedEmailHtml(
            string buyerName,
            string productName,
            string orderShortId,
            int quantity,
            string ordersUrl)
        {
            var safeName = System.Net.WebUtility.HtmlEncode(buyerName);
            var safeProduct = System.Net.WebUtility.HtmlEncode(productName);
            var safeOrder = System.Net.WebUtility.HtmlEncode(orderShortId);
            return $@"<!DOCTYPE html>
<html lang=""es""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width,initial-scale=1""><title>Devolución aprobada</title></head>
<body style=""margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f5f6f8;padding:32px 0;""><tr><td align=""center"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);"">
      <tr><td style=""background:#0f172a;padding:24px 32px;""><span style=""font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.5px;"">Zentric</span></td></tr>
      <tr><td style=""padding:32px;"">
        <h1 style=""margin:0 0 8px;font-size:22px;"">Devolución aprobada</h1>
        <p style=""margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.5;"">Hola {safeName}, el vendedor aprobó tu solicitud de devolución.</p>
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:20px;""><tr><td style=""padding:16px 20px;"">
          <p style=""margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;"">Producto</p>
          <p style=""margin:0 0 12px;font-size:15px;font-weight:700;"">{safeProduct}</p>
          <p style=""margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;"">Pedido</p>
          <p style=""margin:0 0 12px;font-size:15px;font-weight:700;"">#{safeOrder}</p>
          <p style=""margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;"">Cantidad</p>
          <p style=""margin:0;font-size:15px;font-weight:700;"">{quantity} unidad(es)</p>
        </td></tr></table>
        <p style=""margin:0 0 20px;color:#4b5563;font-size:13px;line-height:1.5;"">El reembolso se procesará según el medio de pago original. Podés seguir el estado desde tu cuenta.</p>
        <a href=""{ordersUrl}"" style=""display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;"">Ver mis pedidos</a>
      </td></tr>
      <tr><td style=""padding:16px 32px;background:#f8fafc;color:#9ca3af;font-size:11px;"">Zentric — este correo se generó automáticamente.</td></tr>
    </table>
  </td></tr></table>
</body></html>";
        }

        private static string BuildEmailHtml(string toEmail, string resetLink)
        {
            var template = ResolveHtmlTemplate();

            var nowUtc = DateTimeOffset.UtcNow;
            var colombiaTime = nowUtc.ToOffset(TimeSpan.FromHours(-5));

            var requestDate = colombiaTime.ToString("d 'de' MMMM, yyyy", new CultureInfo("es-CO"));
            var requestTime = colombiaTime.ToString("hh:mm tt", CultureInfo.InvariantCulture);
            const string ipAddress = "127.0.0.1";
            const string ipLocation = "Bogotá, Colombia";
            const string deviceInfo = "Navegador Web Seguro";

            return template
                .Replace("{{resetLink}}", resetLink)
                .Replace("{{userEmail}}", toEmail)
                .Replace("{{requestDate}}", requestDate)
                .Replace("{{requestTime}}", requestTime)
                .Replace("{{ipAddress}}", ipAddress)
                .Replace("{{ipLocation}}", ipLocation)
                .Replace("{{deviceInfo}}", deviceInfo);
        }

        private static string ResolveHtmlTemplate()
        {
            try
            {
                var currentDir = new DirectoryInfo(Directory.GetCurrentDirectory());
                while (currentDir != null)
                {
                    var candidate = Path.Combine(currentDir.FullName, "prototypes", "email-password-reset.html");
                    if (File.Exists(candidate))
                    {
                        var content = File.ReadAllText(candidate);
                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            return content;
                        }
                    }
                    currentDir = currentDir.Parent;
                }

                var baseCandidate = Path.Combine(AppContext.BaseDirectory, "prototypes", "email-password-reset.html");
                if (File.Exists(baseCandidate))
                {
                    var content = File.ReadAllText(baseCandidate);
                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        return content;
                    }
                }
            }
            catch
            {
                // En caso de error de IO o permisos restringidos, recurre al fallback inline.
            }

            return InlineFallbackTemplate;
        }

        private const string InlineFallbackTemplate = """
<!doctype html>
<html lang="es" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <title>Restablece tu contraseña</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <!--[if lte mso 11]>
    <style type="text/css">
      .mj-outlook-group-fix { width:100% !important; }
    </style>
    <![endif]-->
    
    <!--[if !mso]><!-->
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet" type="text/css">
      <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      </style>
    <!--<![endif]-->

    <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
    <style type="text/css">
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      a { color: #0D9488; text-decoration: underline; }
      .raw-link { word-break: break-all; color:#525252; font-size:12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.5; }
      .meta-row td { padding: 6px 0; font-size: 13px; color:#525252; vertical-align: top; }
      .meta-row .k { color:#8A8A8E; width: 110px; font-weight: 500; }
      .brand-dot { color: #0D9488 !important; }
      
      /* Elevación táctil y contraste optimizado para mobile (iPhone / iOS Mail / Gmail) */
      @media only screen and (max-width: 480px) {
        .main-wrapper { padding: 16px 10px 32px 10px !important; }
        .main-card { padding: 28px 20px 24px 20px !important; border-radius: 14px !important; }
        .mobile-btn { 
          display: block !important; 
          width: 100% !important; 
          box-sizing: border-box !important; 
          text-align: center !important; 
          min-height: 48px !important; 
          line-height: 48px !important; 
          font-size: 15px !important; 
          border-radius: 10px !important; 
        }
        .header-logo { font-size: 22px !important; }
        .hero-title { font-size: 22px !important; letter-spacing: -0.02em !important; }
      }
    </style>
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
  </head>
  
  <body style="word-spacing:normal;background-color:#F4F4F5;margin:0;padding:0;">
    
    <!-- ── Preheader Hack: Vista previa limpia e impecable en notificaciones iOS / Gmail ── -->
    <div style="display:none;font-size:1px;color:#F4F4F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      Enlace de acceso seguro para restablecer tu contraseña. Válido por 15 minutos.
      &#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;
    </div>
  
    <div class="main-wrapper" aria-label="Restablece tu contraseña" aria-roledescription="email" role="article" lang="es" dir="ltr" style="word-spacing:normal;background-color:#F4F4F5;padding:36px 12px 48px 12px;">
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
      
      <div style="margin:0px auto;max-width:580px;">
        
        <!-- ── Contenedor Tarjeta Blanca con Relieve y Contraste Polaris ──── -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;border:1px solid #E4E4E7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px -2px rgba(0,0,0,0.05);">
          <tbody>
            <tr>
              <td class="main-card" style="padding:40px 40px 32px 40px;text-align:left;">
                
                <!-- ── 1. Cabecera con Logotipo Zentric ─────────────────────── -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:28px;">
                        <a href="https://zentric.me" target="_blank" style="text-decoration:none;display:inline-block;">
                          <span class="header-logo" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.6px;color:#09090B;">zentric<span class="brand-dot" style="color:#0D9488;font-weight:900;">.</span></span>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 2. Título y Cuerpo Explicativo ───────────────────────── -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:12px;">
                        <h1 class="hero-title" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.03em;line-height:1.25;margin:0;color:#09090B;">
                          Restablece tu contraseña
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:24px;">
                        <p style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;line-height:1.65;margin:0;color:#3F3F46;">
                          Hemos recibido una solicitud para restablecer la contraseña de la cuenta <strong style="color:#09090B;">{{userEmail}}</strong>. Para crear una nueva contraseña y recuperar tu acceso, presiona el botón a continuación:
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 4. Botón Obsidian Táctil (Min-height 48px / HIG Compatible) -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:20px;">
                        <div>
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resetLink}}" style="height:48px;v-text-anchor:middle;width:230px;" arcsize="20%" stroke="f" fillcolor="#09090B">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Inter, sans-serif;font-size:15px;font-weight:600;">
                              Restablecer contraseña &rarr;
                            </center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="{{resetLink}}" target="_blank" class="mobile-btn" style="background-color:#09090B;border-radius:10px;color:#ffffff;display:inline-block;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;font-weight:600;min-height:48px;line-height:48px;text-align:center;text-decoration:none;padding:0 30px;box-shadow:0 2px 4px rgba(0,0,0,0.12);">
                            Restablecer contraseña &rarr;
                          </a>
                          <!--<![endif]-->
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:20px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td valign="middle" style="padding-right:6px;line-height:0;">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            </td>
                            <td valign="middle">
                              <span style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:1.5;color:#71717A;">
                                Este enlace es de un solo uso y caducará automáticamente en <strong style="color:#18181B;font-weight:600;">15 minutos</strong>.
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 5. GIF Amigable de Seguridad Centrado en Círculo (Visible en Pantalla Principal) ── -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="padding-top:4px;padding-bottom:24px;text-align:center;">
                        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid #E4E4E7;background-color:#FAFAFA;line-height:0;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                          <img src="https://i.pinimg.com/originals/6e/47/08/6e47085b5633d2ec06449f211ac75491.gif" width="64" height="64" alt="Zentric Security" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;border:0;margin:0 auto;" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 5. Fallback: Enlace directo en texto plano ────────────── -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:8px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.04em;">
                          ¿Problemas con el botón?
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:26px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:1.6;color:#52525B;padding-bottom:8px;">
                          Copia y pega la siguiente URL directamente en la barra de tu navegador:
                        </div>
                        <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;word-break:break-all;">
                          <a href="{{resetLink}}" class="raw-link" target="_blank" style="color:#0D9488;text-decoration:none;">{{resetLink}}</a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 6. Separador Sutil ────────────────────────────────────── -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #F0F0F0;padding-bottom:26px;"></td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── 7. Auditoría de Seguridad: "¿No solicitaste este cambio?" -->
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:8px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:14px;font-weight:600;line-height:1.5;color:#09090B;">
                          ¿No solicitaste este cambio?
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:14px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13.5px;line-height:1.65;color:#52525B;">
                          Puedes ignorar este correo de forma completamente segura — tu contraseña no cambiará. Para tu registro, estos fueron los datos de la solicitud:
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" class="meta-row" style="padding-bottom:16px;">
                        <!-- Tabla de Auditoría de Acceso -->
                        <table cellpadding="0" cellspacing="0" width="100%" border="0" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:22px;border-collapse:collapse;">
                          <tbody>
                            <tr>
                              <td class="k" style="color:#8A8A8E;width:110px;padding:5px 0;">Fecha y hora</td>
                              <td style="color:#18181B;padding:5px 0;font-weight:500;">{{requestDate}} · {{requestTime}} (Hora Colombia)</td>
                            </tr>
                            <tr>
                              <td class="k" style="color:#8A8A8E;width:110px;padding:5px 0;">Dirección IP</td>
                              <td style="color:#18181B;padding:5px 0;font-weight:500;">{{ipAddress}} ({{ipLocation}})</td>
                            </tr>
                            <tr>
                              <td class="k" style="color:#8A8A8E;width:110px;padding:5px 0;">Dispositivo</td>
                              <td style="color:#18181B;padding:5px 0;font-weight:500;">{{deviceInfo}}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="left">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:1.6;color:#52525B;">
                          Si tienes dudas o sospechas de actividad inusual, puedes comunicarte con nuestro equipo en <a href="mailto:soporte@zentric.me" style="color:#0D9488;text-decoration:underline;">soporte@zentric.me</a>.
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

              </td>
            </tr>
          </tbody>
        </table>

        <!-- ── 9. Pie de Página Institucional (Symmetrical Footer) ──────────── -->
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
          <tbody>
            <tr>
              <td align="center" style="padding:28px 24px 0 24px;text-align:center;">
                <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;line-height:1.65;color:#8A8A8E;">
                  <strong>Zentric Marketplace S.A.S.</strong> · NIT 900.123.456-7 · Bogotá D.C., Colombia<br/>
                  Recibes este correo porque se solicitó un restablecimiento de contraseña para tu cuenta. Enviamos notificaciones de seguridad transaccional independientemente de tus preferencias de marketing.
                </div>
                <div style="padding-top:12px;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:11.5px;color:#8A8A8E;">
                  <a href="https://zentric.me/ayuda" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Centro de Ayuda</a> ·
                  <a href="https://zentric.me/terminos" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Términos y Condiciones</a> ·
                  <a href="https://zentric.me/privacidad" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Política de Privacidad</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
      
      <!--[if mso | IE]></td></tr></table><![endif]-->
      
    </div>
  </body>
</html>
""";

        private static string BuildInvoiceEmailHtml(string buyerName, string orderCode, string invoiceUrl)
        {
            return InvoiceEmailTemplate
                .Replace("{{buyerName}}", buyerName)
                .Replace("{{orderCode}}", orderCode)
                .Replace("{{invoiceUrl}}", invoiceUrl);
        }

        private const string InvoiceEmailTemplate = """
<!doctype html>
<html lang="es" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Tu factura de compra</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      a { color: #0D9488; text-decoration: underline; }
      @media only screen and (max-width: 480px) {
        .main-wrapper { padding: 16px 10px 32px 10px !important; }
        .main-card { padding: 28px 20px 24px 20px !important; border-radius: 14px !important; }
        .mobile-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; min-height: 48px !important; line-height: 48px !important; font-size: 15px !important; border-radius: 10px !important; }
        .header-logo { font-size: 22px !important; }
        .hero-title { font-size: 22px !important; letter-spacing: -0.02em !important; }
      }
    </style>
  </head>

  <body style="word-spacing:normal;background-color:#F4F4F5;margin:0;padding:0;">

    <div style="display:none;font-size:1px;color:#F4F4F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      Tu pago fue aprobado. Descarga tu factura electrónica o revisa tu pedido.
    </div>

    <div class="main-wrapper" role="article" lang="es" dir="ltr" style="word-spacing:normal;background-color:#F4F4F5;padding:36px 12px 48px 12px;">

      <div style="margin:0px auto;max-width:580px;">

        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;border:1px solid #E4E4E7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px -2px rgba(0,0,0,0.05);">
          <tbody>
            <tr>
              <td class="main-card" style="padding:40px 40px 32px 40px;text-align:left;">

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:28px;">
                        <a href="https://zentric.me" target="_blank" style="text-decoration:none;display:inline-block;">
                          <span class="header-logo" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.6px;color:#09090B;">zentric<span style="color:#0D9488;font-weight:900;">.</span></span>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:12px;">
                        <h1 class="hero-title" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.03em;line-height:1.25;margin:0;color:#09090B;">
                          ¡Gracias por tu compra, {{buyerName}}!
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:24px;">
                        <p style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;line-height:1.65;margin:0;color:#3F3F46;">
                          Recibimos tu pago por el pedido <strong style="color:#09090B;">#{{orderCode}}</strong>. Tu factura electrónica ya está disponible y la adjuntamos a este correo.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:20px;">
                        <div>
                          <a href="{{invoiceUrl}}" target="_blank" class="mobile-btn" style="background-color:#09090B;border-radius:10px;color:#ffffff;display:inline-block;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;font-weight:600;min-height:48px;line-height:48px;text-align:center;text-decoration:none;padding:0 30px;box-shadow:0 2px 4px rgba(0,0,0,0.12);">
                            Ver factura &rarr;
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #F0F0F0;padding-bottom:20px;"></td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:6px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.04em;">
                          ¿Problemas con el botón?
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:16px;">
                        <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;word-break:break-all;">
                          <a href="{{invoiceUrl}}" target="_blank" style="color:#0D9488;text-decoration:none;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12.5px;line-height:1.5;">{{invoiceUrl}}</a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:1.6;color:#52525B;">
                          Si tienes dudas, escríbenos a <a href="mailto:soporte@zentric.me" style="color:#0D9488;text-decoration:underline;">soporte@zentric.me</a>.
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

              </td>
            </tr>
          </tbody>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
          <tbody>
            <tr>
              <td align="center" style="padding:28px 24px 0 24px;text-align:center;">
                <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;line-height:1.65;color:#8A8A8E;">
                  <strong>Zentric Marketplace S.A.S.</strong> · NIT 900.123.456-7 · Bogotá D.C., Colombia<br/>
                  Recibes este correo porque realizaste una compra en Zentric. Enviamos notificaciones transaccionales sobre tus pedidos.
                </div>
                <div style="padding-top:12px;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:11.5px;color:#8A8A8E;">
                  <a href="https://zentric.me/ayuda" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Centro de Ayuda</a> ·
                  <a href="https://zentric.me/terminos" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Términos y Condiciones</a> ·
                  <a href="https://zentric.me/privacidad" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Política de Privacidad</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>

    </div>
  </body>
</html>
""";

        private static string BuildDigitalDeliveryEmailHtml(string buyerName, string productName, string? downloadUrl, string orderUrl)
        {
            var hasDownload = !string.IsNullOrWhiteSpace(downloadUrl);
            var actionUrl = hasDownload ? downloadUrl! : orderUrl;
            var actionLabel = hasDownload ? "Descargar mi producto" : "Ver mi pedido";

            return DigitalDeliveryEmailTemplate
                .Replace("{{buyerName}}", buyerName)
                .Replace("{{productName}}", productName)
                .Replace("{{actionUrl}}", actionUrl)
                .Replace("{{actionLabel}}", actionLabel);
        }

        private const string DigitalDeliveryEmailTemplate = """
<!doctype html>
<html lang="es" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Tu producto digital está listo</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      a { color: #0D9488; text-decoration: underline; }
      @media only screen and (max-width: 480px) {
        .main-wrapper { padding: 16px 10px 32px 10px !important; }
        .main-card { padding: 28px 20px 24px 20px !important; border-radius: 14px !important; }
        .mobile-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; min-height: 48px !important; line-height: 48px !important; font-size: 15px !important; border-radius: 10px !important; }
        .header-logo { font-size: 22px !important; }
        .hero-title { font-size: 22px !important; letter-spacing: -0.02em !important; }
      }
    </style>
  </head>

  <body style="word-spacing:normal;background-color:#F4F4F5;margin:0;padding:0;">

    <div style="display:none;font-size:1px;color:#F4F4F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      Tu pago fue aprobado. Descarga tu producto digital o revisa tu pedido.
    </div>

    <div class="main-wrapper" role="article" lang="es" dir="ltr" style="word-spacing:normal;background-color:#F4F4F5;padding:36px 12px 48px 12px;">

      <div style="margin:0px auto;max-width:580px;">

        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;border:1px solid #E4E4E7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px -2px rgba(0,0,0,0.05);">
          <tbody>
            <tr>
              <td class="main-card" style="padding:40px 40px 32px 40px;text-align:left;">

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:28px;">
                        <a href="https://zentric.me" target="_blank" style="text-decoration:none;display:inline-block;">
                          <span class="header-logo" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.6px;color:#09090B;">zentric<span style="color:#0D9488;font-weight:900;">.</span></span>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:12px;">
                        <h1 class="hero-title" style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.03em;line-height:1.25;margin:0;color:#09090B;">
                          ¡{{productName}} está listo, {{buyerName}}!
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:24px;">
                        <p style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;line-height:1.65;margin:0;color:#3F3F46;">
                          Tu pago fue aprobado y tu producto digital ya está disponible. Usa el botón a continuación para acceder a tu contenido.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:20px;">
                        <div>
                          <a href="{{actionUrl}}" target="_blank" class="mobile-btn" style="background-color:#09090B;border-radius:10px;color:#ffffff;display:inline-block;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;font-weight:600;min-height:48px;line-height:48px;text-align:center;text-decoration:none;padding:0 30px;box-shadow:0 2px 4px rgba(0,0,0,0.12);">
                            {{actionLabel}} &rarr;
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="border-top:1px solid #F0F0F0;padding-bottom:20px;"></td>
                    </tr>
                  </tbody>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="padding-bottom:6px;">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.04em;">
                          ¿Problemas con el botón?
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding-bottom:16px;">
                        <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;word-break:break-all;">
                          <a href="{{actionUrl}}" target="_blank" style="color:#0D9488;text-decoration:none;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12.5px;line-height:1.5;">{{actionUrl}}</a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left">
                        <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:13px;line-height:1.6;color:#52525B;">
                          Si tienes dudas, escríbenos a <a href="mailto:soporte@zentric.me" style="color:#0D9488;text-decoration:underline;">soporte@zentric.me</a>.
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

              </td>
            </tr>
          </tbody>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
          <tbody>
            <tr>
              <td align="center" style="padding:28px 24px 0 24px;text-align:center;">
                <div style="font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:12px;line-height:1.65;color:#8A8A8E;">
                  <strong>Zentric Marketplace S.A.S.</strong> · NIT 900.123.456-7 · Bogotá D.C., Colombia<br/>
                  Recibes este correo porque realizaste una compra digital en Zentric. Enviamos notificaciones transaccionales sobre tus pedidos.
                </div>
                <div style="padding-top:12px;font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;font-size:11.5px;color:#8A8A8E;">
                  <a href="https://zentric.me/ayuda" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Centro de Ayuda</a> ·
                  <a href="https://zentric.me/terminos" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Términos y Condiciones</a> ·
                  <a href="https://zentric.me/privacidad" target="_blank" style="color:#71717A;text-decoration:underline;margin:0 6px;">Política de Privacidad</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>

    </div>
  </body>
</html>
""";
    }
}
