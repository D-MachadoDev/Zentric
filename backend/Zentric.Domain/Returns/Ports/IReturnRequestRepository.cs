using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;

namespace Zentric.Domain.Returns.Ports
{
    public interface IReturnRequestRepository
    {
        Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Listado de devoluciones segun quien pregunta.
        ///
        /// Ni <paramref name="buyerId"/> ni <paramref name="vendorId"/> se guardan en la devolucion:
        /// hay que resolverlos por el pedido y por la variante respectivamente. Se resuelven AQUI, en
        /// la consulta, y no en el handler fila por fila: preguntar por cada devolucion seria un
        /// N+1 y, sobre todo, traeria al proceso las devoluciones ajenas que despues se descartarian.
        /// Descartar en memoria daria el mismo resultado visible y el mismo problema de superficie
        /// de datos que un listado sin filtrar.
        /// </summary>
        Task<IReadOnlyList<ReturnRequest>> GetListAsync(
            Guid? buyerId, Guid? vendorId, ReturnStatus? status, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<ReturnRequest>> GetByOrderIdAsync(Guid customerOrderId, CancellationToken cancellationToken = default);

        Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default);
        Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default);
    }
}