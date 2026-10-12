using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments.Ports
{
    /// <summary>
    /// Puerto de salida para procesar un cobro. Define QUE necesita el dominio
    /// (autorizar un importe) sin afirmar COMO se cobra.
    ///
    /// Invariante 9 (04-invariants-and-rules.md): la pasarela nace simulada y
    /// escalable. No se integra ninguna pasarela real (PSE, Stripe, Wompi) porque
    /// la Ley no la define. El adaptador de infraestructura es intercambiable:
    /// sustituir la simulacion por una pasarela real exige un nuevo adaptador que
    /// implemente este mismo puerto, sin tocar Dominio ni los casos de uso.
    /// </summary>
    public interface IPaymentGatewayService
    {
        /// <summary>Solicita el cobro de <paramref name="amount"/> y devuelve el resultado.</summary>
        /// <param name="orderId">Pedido al que se imputa el cobro.</param>
        /// <param name="amount">Importe a cobrar.</param>
        /// <param name="cancellationToken">Token de cancelacion.</param>
        Task<PaymentResult> ChargeAsync(
            Guid orderId,
            Money amount,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Resultado de una solicitud de cobro. Un rechazo comercial se representa
    /// con <c>Approved = false</c>, no con una excepcion: el rechazo es un
    /// resultado previsto del negocio, no un fallo tecnico.
    /// </summary>
    public sealed record PaymentResult
    {
        public bool Approved { get; init; }
        public string? TransactionId { get; init; }

        /// <summary>Codigo o motivo de rechazo, para traza y diagnostico.</summary>
        public string? DeclineReason { get; init; }

        public static PaymentResult Success(string transactionId) =>
            new() { Approved = true, TransactionId = transactionId };

        public static PaymentResult Rejected(string reason) =>
            new() { Approved = false, DeclineReason = reason };
    }
}