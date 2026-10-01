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

        /// <summary>
        /// Busca un pedido verificando que contenga al menos una linea del
        /// vendedor indicado (Q-21b). Devuelve null si el pedido no existe o si
        /// el vendedor no participa, de modo que el llamante no pueda distinguir
        /// "no existe" de "no es suyo".
        /// </summary>
        Task<CustomerOrder?> GetByIdForVendorAsync(
            Guid id, Guid vendorId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Pedidos de carrito o con pago pendiente cuya ultima actividad es
        /// anterior al umbral. T-004 (H-06/R-06): el umbral llega como
        /// <see cref="DateTime"/> porque la columna <c>UpdatedAt</c> es sin zona
        /// horaria en PostgreSQL; el llamante lo calcula desde
        /// <see cref="Common.Ports.IClock"/> y esta firma no fija el reloj.
        /// </summary>
        Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default);
        Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default);
        Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default);
    }
}
