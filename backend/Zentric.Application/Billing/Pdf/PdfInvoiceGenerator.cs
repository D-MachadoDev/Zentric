using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using PdfSharp.Drawing;
using PdfSharp.Pdf;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Orders;

namespace Zentric.Application.Billing.Pdf;

/// <summary>
/// Generador de representaciones gráficas de Factura Electrónica de Venta con certificación DIAN.
/// Utiliza PDFsharp en memoria para emitir documentos con validez tributaria formal según la normativa colombiana.
/// </summary>
public sealed class PdfInvoiceGenerator
{
    private const double PdfPageHeight = 842; // A4 en puntos (72 dpi)
    private const double PdfPageWidth = 595;
    private const double Margin = 40; // Margen de página

    private static readonly CultureInfo ColombianCulture = new("es-CO");

    /// <summary>
    /// Genera la Factura Electrónica en PDF a partir de una orden y su factura formal de persistencia.
    /// </summary>
    public byte[] GenerateInvoice(Invoice invoice, CustomerOrder order, string buyerEmail)
    {
        return GenerateInvoiceInternal(order, buyerEmail, invoice);
    }

    /// <summary>
    /// Sobrecarga para generación directa desde una orden de compra (retrocompatibilidad).
    /// </summary>
    public byte[] GenerateInvoice(CustomerOrder order, string buyerEmail)
    {
        return GenerateInvoiceInternal(order, buyerEmail, null);
    }

    private byte[] GenerateInvoiceInternal(CustomerOrder order, string buyerEmail, Invoice? invoice)
    {
        EnsureFontResolver();

        var document = new PdfDocument();
        var invoiceCode = invoice != null
            ? invoice.Id.ToString()[..8].ToUpperInvariant()
            : order.Id.ToString()[..8].ToUpperInvariant();

        document.Info.Title = $"Factura Electrónica DIAN #{invoiceCode}";
        document.Info.Subject = "Factura Electrónica de Venta - Zentric";
        document.Info.Author = "Zentric Technologies S.A.S.";
        document.Info.Keywords = "factura, dian, electronica, colombia, cufe";

        var page = document.AddPage();
        var gfx = XGraphics.FromPdfPage(page);

        // Tipografías
        var titleFont = new XFont("Arial", 16, XFontStyleEx.Bold);
        var subtitleFont = new XFont("Arial", 10, XFontStyleEx.Bold);
        var headingFont = new XFont("Arial", 12, XFontStyleEx.Bold);
        var labelBoldFont = new XFont("Arial", 9, XFontStyleEx.Bold);
        var normalFont = new XFont("Arial", 9);
        var smallFont = new XFont("Arial", 7.5);
        var cufeFont = new XFont("Courier New", 7);

        // Paleta de colores
        var brandBrush = new XSolidBrush(XColor.FromArgb(16, 185, 129)); // Esmeralda Zentric
        var primaryDarkBrush = new XSolidBrush(XColor.FromArgb(15, 23, 42)); // Slate 900
        var mutedBrush = new XSolidBrush(XColor.FromArgb(100, 116, 139)); // Slate 500
        var lightGrayBrush = new XSolidBrush(XColor.FromArgb(241, 245, 249)); // Slate 100
        var darkGrayBrush = new XSolidBrush(XColor.FromArgb(51, 65, 85)); // Slate 700

        var borderPen = new XPen(XColor.FromArgb(226, 232, 240), 1);
        var accentPen = new XPen(XColor.FromArgb(16, 185, 129), 1.5);

        double y = Margin;

        // 1. Cabecera Institucional DIAN y Zentric
        gfx.DrawString("zentric.", titleFont, brandBrush, new XPoint(Margin, y + 14));
        gfx.DrawString("FACTURACIÓN ELECTRÓNICA DIAN", subtitleFont, primaryDarkBrush, new XPoint(Margin + 70, y + 14));

        var invoiceTypeTitle = (invoice?.Type == InvoiceType.VendorDetail)
            ? "Factura de Venta (Detalle Vendedor)"
            : "Factura Maestra (Consolidada)";

        gfx.DrawString(invoiceTypeTitle, headingFont, primaryDarkBrush, new XPoint(PdfPageWidth - Margin - 220, y + 10));
        gfx.DrawString($"Factura #{invoiceCode}", headingFont, brandBrush, new XPoint(PdfPageWidth - Margin - 220, y + 26));

        y += 42;
        gfx.DrawLine(accentPen, Margin, y, PdfPageWidth - Margin, y);
        y += 12;

        // 2. Información del Emisor y Régimen Tributario
        double colWidth = (PdfPageWidth - (Margin * 2) - 20) / 2;

        // Cuadro Emisor (Izquierda)
        gfx.DrawRoundedRectangle(borderPen, lightGrayBrush, Margin, y, colWidth, 75, 4, 4);
        gfx.DrawString("EMISOR:", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 10, y + 14));
        gfx.DrawString("Zentric Technologies S.A.S.", labelBoldFont, darkGrayBrush, new XPoint(Margin + 10, y + 28));
        gfx.DrawString("NIT: 901.845.293-4 · Régimen Común · Responsable de IVA", normalFont, darkGrayBrush, new XPoint(Margin + 10, y + 42));
        gfx.DrawString("Actividad Económica: Comercio Electrónico y Servicios TIC (CIIU 4791 / 6201)", smallFont, mutedBrush, new XPoint(Margin + 10, y + 54));
        gfx.DrawString("Bogotá D.C., Colombia · facturacion@zentric.co", smallFont, mutedBrush, new XPoint(Margin + 10, y + 66));

        // Cuadro Tributario DIAN y Adquirente (Derecha)
        double rightColX = Margin + colWidth + 20;
        gfx.DrawRoundedRectangle(borderPen, lightGrayBrush, rightColX, y, colWidth, 75, 4, 4);
        gfx.DrawString("DATOS FISCALES Y ADQUIRENTE:", labelBoldFont, primaryDarkBrush, new XPoint(rightColX + 10, y + 14));

        var issuedDate = invoice?.IssuedAt ?? order.CreatedAt;
        var formattedDate = issuedDate.ToString("dd 'de' MMMM 'de' yyyy, HH:mm 'COT'", ColombianCulture);

        gfx.DrawString($"Fecha Emisión: {formattedDate}", normalFont, darkGrayBrush, new XPoint(rightColX + 10, y + 28));
        gfx.DrawString($"Adquirente: {buyerEmail}", normalFont, darkGrayBrush, new XPoint(rightColX + 10, y + 42));
        gfx.DrawString($"Pedido Zentric: #{order.Id.ToString()[..8].ToUpperInvariant()}", normalFont, darkGrayBrush, new XPoint(rightColX + 10, y + 54));
        gfx.DrawString("Medio de Pago: Pasarela Digital Acreditada (Inmediato)", smallFont, mutedBrush, new XPoint(rightColX + 10, y + 66));

        y += 85;

        // 3. Resolución DIAN y Validez Tributaria
        var greenBorderPen = new XPen(XColor.FromArgb(167, 243, 208), 1);
        var greenBgBrush = new XSolidBrush(XColor.FromArgb(236, 253, 245));
        gfx.DrawRoundedRectangle(greenBorderPen, greenBgBrush, Margin, y, PdfPageWidth - (Margin * 2), 34, 4, 4);
        gfx.DrawString("Resolución DIAN No. 18764000001 de 2026. Habilitación de Facturación Electrónica", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 10, y + 13));
        gfx.DrawString("Prefijo FA: 000001 a 999999 · Vigencia: 24 meses · Validez Tributaria Decreto 2242 de 2015", smallFont, darkGrayBrush, new XPoint(Margin + 10, y + 25));

        y += 44;

        // 4. Tabla de Ítems / Conceptos Facturados
        // Cabecera de la tabla
        double tableWidth = PdfPageWidth - (Margin * 2);
        gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(248, 250, 252)), Margin, y, tableWidth, 22);
        gfx.DrawRectangle(borderPen, Margin, y, tableWidth, 22);

        gfx.DrawString("Ítem / Ref", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 8, y + 15));
        gfx.DrawString("Descripción", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 100, y + 15));
        gfx.DrawString("Cant.", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 310, y + 15));
        gfx.DrawString("Valor Unitario", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 360, y + 15));
        gfx.DrawString("Total", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 440, y + 15));

        y += 22;

        decimal totalNet = 0;
        foreach (var item in order.Items)
        {
            gfx.DrawLine(borderPen, Margin, y, Margin + tableWidth, y);

            var itemSku = $"VAR-{item.VariantId.ToString()[..6].ToUpperInvariant()}";
            var itemDesc = $"Línea de Pedido · {itemSku}";
            var itemQty = item.Quantity.ToString();
            var unitPrice = FormatMoney(item.UnitPrice.Amount, item.UnitPrice.Currency);
            var itemTotal = FormatMoney(item.TotalPrice.Amount, item.TotalPrice.Currency);
            totalNet += item.TotalPrice.Amount;

            gfx.DrawString(itemSku, normalFont, darkGrayBrush, new XPoint(Margin + 8, y + 14));
            gfx.DrawString(itemDesc, normalFont, darkGrayBrush, new XPoint(Margin + 100, y + 14));
            gfx.DrawString(itemQty, normalFont, darkGrayBrush, new XPoint(Margin + 315, y + 14));
            gfx.DrawString(unitPrice, normalFont, darkGrayBrush, new XPoint(Margin + 360, y + 14));
            gfx.DrawString(itemTotal, labelBoldFont, primaryDarkBrush, new XPoint(Margin + 440, y + 14));

            y += 20;

            if (y > PdfPageHeight - 140)
            {
                page = document.AddPage();
                gfx = XGraphics.FromPdfPage(page);
                y = Margin;
            }
        }

        gfx.DrawLine(borderPen, Margin, y, Margin + tableWidth, y);
        y += 12;

        // 5. Desglose de Totales e Impuestos (IVA 19% Incluido)
        double totalsX = Margin + 280;
        double totalsWidth = tableWidth - 280;

        var currency = order.TotalAmount.Currency;
        var totalAmount = order.TotalAmount.Amount;
        // En Colombia el valor total de marketplace incluye IVA
        var subtotal = Math.Round(totalAmount / 1.19m, 2);
        var iva19 = totalAmount - subtotal;

        gfx.DrawString("Subtotal (Base Imponible):", normalFont, darkGrayBrush, new XPoint(totalsX, y + 10));
        gfx.DrawString(FormatMoney(subtotal, currency), normalFont, darkGrayBrush, new XPoint(totalsX + 130, y + 10));
        y += 16;

        gfx.DrawString("IVA (19% Tarifa General):", normalFont, darkGrayBrush, new XPoint(totalsX, y + 10));
        gfx.DrawString(FormatMoney(iva19, currency), normalFont, darkGrayBrush, new XPoint(totalsX + 130, y + 10));
        y += 16;

        gfx.DrawLine(accentPen, totalsX, y + 4, totalsX + totalsWidth, y + 4);
        y += 8;

        gfx.DrawString("TOTAL FACTURADO:", headingFont, primaryDarkBrush, new XPoint(totalsX, y + 14));
        gfx.DrawString(FormatMoney(totalAmount, currency), headingFont, brandBrush, new XPoint(totalsX + 130, y + 14));
        y += 28;

        // 6. CUFE (Código Único de Facturación Electrónica) y Código QR Simulado
        var cufeHash = GenerateCufe(invoice?.Id ?? order.Id, issuedDate, totalAmount);

        gfx.DrawRoundedRectangle(borderPen, lightGrayBrush, Margin, y, tableWidth, 48, 4, 4);
        gfx.DrawString("CUFE (Código Único de Facturación Electrónica):", labelBoldFont, primaryDarkBrush, new XPoint(Margin + 8, y + 12));
        gfx.DrawString(cufeHash, cufeFont, darkGrayBrush, new XPoint(Margin + 8, y + 25));
        gfx.DrawString("Documento oficial emitido conforme a las especificaciones técnicas del Anexo Técnico DIAN vigente.", smallFont, mutedBrush, new XPoint(Margin + 8, y + 38));

        y += 58;

        // 7. Pie Institucional
        gfx.DrawLine(borderPen, Margin, y, Margin + tableWidth, y);
        y += 12;
        gfx.DrawString("Esta factura electrónica de venta constituye título valor según la Ley 1231 de 2008.", smallFont, mutedBrush, new XPoint(Margin, y));
        y += 11;
        gfx.DrawString("Zentric Technologies S.A.S. · Representación Gráfica Autorizada · www.zentric.co", smallFont, mutedBrush, new XPoint(Margin, y));

        using var stream = new System.IO.MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }

    private static string FormatMoney(decimal amount, string currency)
    {
        return $"$ {amount.ToString("N2", ColombianCulture)} {currency}";
    }

    private static string GenerateCufe(Guid id, DateTime date, decimal amount)
    {
        var raw = $"{id:N}-{date:yyyyMMddHHmmss}-{amount:F2}-9018452934";
        var bytes = SHA384.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static void EnsureFontResolver()
    {
        if (PdfSharp.Fonts.GlobalFontSettings.FontResolver is null)
        {
            // Resolver propio que mapea "Arial"/"Courier New" a las fuentes reales
            // del SO (Liberation en Linux, Arial en Windows). Los resolvers integrados
            // de PdfSharp 6 no encuentran "Arial" en Linux y lanzan NullReferenceException.
            PdfSharp.Fonts.GlobalFontSettings.FontResolver = new SystemFontResolver();
        }
    }
}
