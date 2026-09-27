using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Infrastructure.Payments
{
    /// <summary>
    /// Adaptador de salida SIMULADO para <see cref="IPaymentGateway"/>.
    ///
    /// Q-08 (ratificado por el Owner el 2026-09-27): no existe pasarela real
    /// integrada. Este adaptador aprueba siempre el cobro y genera un
    /// identificador de transaccion local, de modo que los casos de uso de pago
    /// se puedan ejecutar y probar de punta a punta.
    ///
    /// Para conectar una pasarela real basta con registrar otro adaptador de este
    /// mismo puerto en el Composition Root; Dominio y casos de uso no cambian.
    /// </summary>
    public sealed class SimulatedPaymentGateway : IPaymentGateway
    {
        public Task<PaymentResult> ChargeAsync(
            Guid orderId,
            Money amount,
            CancellationToken cancellationToken = default)
        {
            if (amount is null) throw new ArgumentNullException(nameof(amount));

            // Se simula un cobro aprobado con referencia local trazable al pedido.
            var transactionId = $"SIM-{orderId:N}";
            return Task.FromResult(PaymentResult.Success(transactionId));
        }
    }
}