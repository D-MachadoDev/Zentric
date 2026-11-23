using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Returns
{
    /// <summary>
    /// Pedidos en memoria. La notificacion best-effort de una aprobacion
    /// busca el pedido por id y, con este doble vacio, devuelve null y la
    /// notificacion se convierte en un no-op.
    /// </summary>
    public class FakeCustomerOrderRepository : ICustomerOrderRepository
    {
        public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult<CustomerOrder?>(null);

        public Task<CustomerOrder?> GetByIdForBuyerAsync(Guid id, Guid buyerId, CancellationToken cancellationToken = default)
            => Task.FromResult<CustomerOrder?>(null);

        public Task<CustomerOrder?> GetByIdForVendorAsync(Guid id, Guid vendorId, CancellationToken cancellationToken = default)
            => Task.FromResult<CustomerOrder?>(null);

        public Task<IReadOnlyList<CustomerOrder>> GetListAsync(Guid? buyerId, Guid? vendorId, OrderStatus? status, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CustomerOrder>>(Array.Empty<CustomerOrder>());

        public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CustomerOrder>>(Array.Empty<CustomerOrder>());

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    /// <summary>
    /// Compradores en memoria. Devuelve null, de modo que el flujo de
    /// notificacion no encuentra al comprador y no envia correo.
    /// </summary>
    public class FakeBuyerRepository : IBuyerRepository
    {
        public Task<Buyer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult<Buyer?>(null);

        public Task AddAsync(Buyer buyer, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Buyer buyer, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    /// <summary>
    /// Usuarios en memoria. Devuelve null o vacio, de modo que el flujo de
    /// notificacion no resuelve un destinatario y no envia correo.
    /// </summary>
    public class FakeUserRepository : IUserRepository
    {
        public Task<User?> GetByIdAsync(Guid id) => Task.FromResult<User?>(null);

        public Task<User?> GetByEmailAsync(Email email) => Task.FromResult<User?>(null);

        public Task<IReadOnlyList<User>> GetAllAsync(UserRole? role = null, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<User>>(Array.Empty<User>());

        public Task<bool> IsEmailUniqueAsync(Email email, CancellationToken cancellationToken = default) => Task.FromResult(false);

        public Task<bool> IsIdentityDocumentUniqueAsync(string identityDocument, CancellationToken cancellationToken = default) => Task.FromResult(false);

        public Task AddAsync(User user) => Task.CompletedTask;
        public Task UpdateAsync(User user) => Task.CompletedTask;
    }

    /// <summary>
    /// Envio de correo en memoria. Registra los destinatarios de los correos de
    /// devolucion aprobada para poder afirmarlos mas adelante; el resto son no-ops.
    /// </summary>
    public class FakeEmailSender : IEmailSender
    {
        public List<string> ReturnApprovedEmails { get; } = new();

        public Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SendInvoiceEmailAsync(string toEmail, string buyerName, string orderCode, byte[] invoicePdf, string invoiceUrl, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SendDigitalDeliveryEmailAsync(string toEmail, string buyerName, string productName, string? downloadUrl, string orderId, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SendReturnApprovedEmailAsync(string toEmail, string buyerName, string productName, string orderShortId, int quantity, CancellationToken cancellationToken = default)
        {
            ReturnApprovedEmails.Add(toEmail);
            return Task.CompletedTask;
        }

        public Task SendOrderShippedEmailAsync(string toEmail, string buyerName, string orderShortId, string? carrier, string? trackingCode, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SendRefundProcessedEmailAsync(string toEmail, string buyerName, string productName, string orderShortId, decimal amount, string currency, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
