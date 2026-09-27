namespace Zentric.Domain.Payments.Enums
{
    /// <summary>Estado de un pago. El rechazo comercial es un estado, no una excepcion.</summary>
    public enum PaymentStatus
    {
        Pending = 1,
        Approved = 2,
        Declined = 3
    }
}