using PdfSharp.Drawing;
using PdfSharp.Pdf;
using Zentric.Application.Common.Models;
using Zentric.Domain.Orders;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Application.Billing.Pdf;

/// <summary>
/// Generates PDF invoices for paid orders using PDFsharp/MigraDoc.
/// Free, open-source PDF generation library (MIT/X11 license).
/// </summary>
public sealed class PdfInvoiceGenerator
{
    private const decimal PdfPageWidth = 595; // A4 width in points (1 pt = 1/72 inch)
    private const decimal PdfPageHeight = 842; // A4 height in points
    private const decimal Margin = 50; // Page margin in points

    /// <summary>
    /// Generates a PDF invoice for the specified order.
    /// </summary>
    /// <param name="order">The paid order to generate invoice for.</param>
    /// <param name="buyerEmail">The buyer's email address.</param>
    /// <returns>A PDF invoice as a byte array.</returns>
    public byte[] GenerateInvoice(CustomerOrder order, string buyerEmail)
    {
        // Create a PDF document
        var document = new PdfDocument
        {
            DocumentInfo = new PdfDocumentInfo
            {
                Title = $"Invoice - Order {order.Id}",
                Subject = "Zentric Invoice",
                Author = "Zentric System",
                Keywords = "invoice, order, payment"
            }
        };

        // Add a page
        var page = document.AddPage();
        var gfx = XGraphics.FromPdfPage(page);

        // Set up font objects
        var titleFont = new XFont("Georgia", 24, XFontStyle.Bold);
        var headingFont = new XFont("Georgia", 14, XFontStyle.Bold);
        var normalFont = new XFont("Georgia", 11);
        var smallFont = new XFont("Georgia", 9);
        var boldNormalFont = new XFont("Georgia", 11, XFontStyle.Bold);

        // Calculate available width
        var availableWidth = PdfPageWidth - 2 * Margin;

        // Helper to draw text and return the y position after
        void DrawLine(XGraphics g, string text, XFont font, XColor color, out decimal yPos)
        {
            var rect = new XRect(Margin, 0, availableWidth, PdfPageHeight);
            g.DrawString(text, font, new XSolidBrush(color), rect, new XStringFormat { LineAlignment = StringAlignment.Near });
            // For simplicity, just move down by font size + spacing
            // In a real implementation, would measure actual height
            yPos = rect.Y + font.Size + 5;
        }

        // Current Y position
        decimal y = Margin;

        // Company header
        gfx.DrawString("ZENTRIC", titleFont, XBrushes.DarkBlue, new XPoint(Margin, y));
        y += 40;

        // Invoice info
        gfx.DrawString($"Invoice #: {order.Id:N}", headingFont, XBrushes.Black, new XPoint(Margin, y));
        y += 20;
        gfx.DrawString($"Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm}", normalFont, XBrushes.Black, new XPoint(Margin, y));
        y += 20;
        gfx.DrawString($"Buyer Email: {buyerEmail}", normalFont, XBrushes.Black, new XPoint(Margin, y));
        y += 30;

        // Order items table header
        gfx.DrawString("Items", boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin, y));
        gfx.DrawString("Description", boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin + 100, y));
        gfx.DrawString("Qty", boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin + 300, y));
        gfx.DrawString("Price", boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin + 400, y));
        gfx.DrawString("Total", boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin + 480, y));
        y += 20;

        // Order items
        foreach (var item in order.Items)
        {
            // Get product info - we need to fetch this from the repository
            // For now, use placeholder data
            gfx.DrawString(item.VariantId.ToString(), normalFont, XBrushes.Black, new XPoint(Margin, y));
            gfx.DrawString($"Product Variant {item.VariantId:N}", normalFont, XBrushes.Black, new XPoint(Margin + 100, y));
            gfx.DrawString(item.Quantity.ToString(), normalFont, XBrushes.Black, new XPoint(Margin + 300, y));
            
            // Format price - assuming COP currency
            var priceString = item.UnitPrice.Amount.ToString("N0");
            gfx.DrawString(priceString, normalFont, XBrushes.Black, new XPoint(Margin + 400, y));
            
            var totalString = item.TotalPrice.Amount.ToString("N0");
            gfx.DrawString(totalString, normalFont, XBrushes.Black, new XPoint(Margin + 480, y));
            y += 18;

            if (y > PdfPageHeight - 100)
            {
                page = document.AddPage();
                gfx = XGraphics.FromPdfPage(page);
                y = Margin;
            }
        }

        // Total row
        gfx.DrawString("", normalFont, XBrushes.Black, new XPoint(Margin, y));
        gfx.DrawString("TOTAL", boldNormalFont, XBrushes.Black, new XPoint(Margin + 300, y));
        var totalStr = order.TotalAmount.Amount.ToString("N0");
        gfx.DrawString(totalStr, boldNormalFont, XBrushes.DarkBlue, new XPoint(Margin + 400, y));
        y += 20;

        // Payment info
        gfx.DrawString($"Payment Status: Paid", normalFont, XBrushes.Black, new XPoint(Margin, y));
        y += 20;
        gfx.DrawString($"Payment Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm}", normalFont, XBrushes.Black, new XPoint(Margin, y));
        y += 30;

        // Footer
        gfx.DrawString("Thank you for your purchase!", smallFont, XBrushes.Gray, new XPoint(Margin, y));
        y += 20;
        gfx.DrawString("Zentric Systems © 2026", smallFont, XBrushes.Gray, new XPoint(Margin, y));

        // Save to memory stream
        using var stream = new System.IO.MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }
}