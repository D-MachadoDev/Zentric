namespace Zentric.Domain.Payments.Enums
{
    /// <summary>
    /// Estado de un pago. El rechazo comercial es un estado, no una excepcion.
    /// Nombre del comprobante alineado con el invariante 9 del SDD: no se
    /// almacenan tarjetas ni billeteras, solo el resultado del cobro.
    /// </summary>
    public enum PaymentStatus
    {
        Pending = 1,
        Approved = 2,
        Declined = 3,

        /// <summary>
        /// Comprobante saldado por devolucion.
        /// ADDENDUM - DICTADO POR OWNER (2026-09-27): la devolucion se
        /// materializa como credito a favor y el pedido NO se revierte, porque
        /// ya fue entregado y facturado. El sistema no custodia dinero.
        /// </summary>
        Refunded = 4
    }
}