using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments.Ports
{
    /// <summary>
    /// Puerto de salida del comprobante de pago. Solo lectura y actualizacion:
    /// el comprobante nace en el caso de uso que cobra, no se crea aqui.
    ///
    /// Referencia: backendSDD/Domain/05-ports.md.
    /// </summary>
    public interface IPaymentReceiptRepository
    {
        Task<PaymentReceipt?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>Devuelve el comprobante asociado a un pedido, si ya fue emitido.</summary>
        Task<PaymentReceipt?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default);

        Task AddAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default);

        Task UpdateAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default);
    }
}