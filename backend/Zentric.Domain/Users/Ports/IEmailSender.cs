using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Users.Ports
{
    /// <summary>
    /// Puerto de dominio para el envío de notificaciones por correo electrónico transaccional.
    /// Desacopla la lógica de negocio del proveedor de mensajería (Resend, SMTP, etc.).
    /// </summary>
    public interface IEmailSender
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default);

        /// <summary>
        /// Envía al comprador el correo de confirmación de pago con la factura
        /// electrónica en PDF adjunta y un enlace para ver su pedido.
        /// </summary>
        Task SendInvoiceEmailAsync(
            string toEmail,
            string buyerName,
            string orderCode,
            byte[] invoicePdf,
            string invoiceUrl,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Envía al comprador el correo de entrega de un producto digital tras el
        /// pago. Si <paramref name="downloadUrl"/> tiene valor, el botón principal
        /// permite descargar el producto; en caso contrario enlaza al pedido.
        /// </summary>
        Task SendDigitalDeliveryEmailAsync(
            string toEmail,
            string buyerName,
            string productName,
            string? downloadUrl,
            string orderId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Notifica al comprador que el vendedor aprobo su devolucion, indicando
        /// que producto y que pedido exactamente se resolvieron.
        /// </summary>
        Task SendReturnApprovedEmailAsync(
            string toEmail,
            string buyerName,
            string productName,
            string orderShortId,
            int quantity,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Notifica al comprador que su pedido fue despachado, indicando el
        /// código del pedido y, cuando existan, la transportadora y el código
        /// de seguimiento.
        /// </summary>
        Task SendOrderShippedEmailAsync(
            string toEmail,
            string buyerName,
            string orderShortId,
            string? carrier,
            string? trackingCode,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Notifica al comprador que su reembolso fue procesado, indicando el
        /// producto, el pedido y el importe acreditado con su divisa.
        /// </summary>
        Task SendRefundProcessedEmailAsync(
            string toEmail,
            string buyerName,
            string productName,
            string orderShortId,
            decimal amount,
            string currency,
            CancellationToken cancellationToken = default);
    }
}
