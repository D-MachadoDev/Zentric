namespace Zentric.Infrastructure.Payments
{
    // Opciones para seleccionar la pasarela de pago sin tocar Dominio.
    // Q-08: hoy el unico valor soportado es "simulated". Un valor distinto
    // exige que el Owner dicte el proveedor (PSE, Wompi, Stripe) y su adaptador.
    public sealed class PaymentGatewayOptions
    {
        public const string SectionName = "Payments";
        public string Provider { get; set; } = "simulated";
        public string ApiKey { get; set; } = string.Empty;
        public string WebhookSecret { get; set; } = string.Empty;
    }
}
