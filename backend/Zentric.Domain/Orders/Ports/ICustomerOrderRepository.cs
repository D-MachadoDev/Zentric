using Zentric.Domain.Orders;

namespace Zentric.Domain.Orders.Ports
{
    public interface ICustomerOrderRepository
    {
        Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Busca un pedido verificando que pertenezca al comprador indicado.
        /// Devuelve null si el pedido existe pero es de otro comprador, de modo
        /// que el llamante no pueda distinguir "no existe" de "no es suyo".
        /// </summary>
        Task<CustomerOrder?> GetByIdForBuyerAsync(
            Guid id, Guid buyerId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default);
        Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default);
        Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default);
    }
}
