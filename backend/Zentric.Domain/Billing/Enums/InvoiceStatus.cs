namespace Zentric.Domain.Billing.Enums
{
    /// <summary>
    /// Estados de una factura.
    /// </summary>
    public enum InvoiceStatus
    {
        /// <summary>Factura emitida normalmente.</summary>
        Issued,

        /// <summary>Factura anulada por el Administrador (chargeback, pago rechazado a posteriori).</summary>
        Anulled
    }
}