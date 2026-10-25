using System;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Buyers.Ports
{
    /// <summary>
    /// Puerto de salida (Output Port) para la persistencia del agregado <see cref="Buyer"/>.
    /// </summary>
    /// <remarks>
    /// En Arquitectura Hexagonal, el Dominio define QUÉ necesita para persistir el comprador
    /// sin acoplarse a detalles de infraestructura como EF Core, SQL o bases de datos relacionales.
    /// Su adaptador concreto reside en <c>Zentric.Infrastructure.Persistence.Repositories</c>.
    /// </remarks>
    public interface IBuyerRepository
    {
        /// <summary>
        /// Obtiene un comprador por su identificador único (<c>UserId</c>).
        /// </summary>
        /// <param name="id">Identificador biunívoco del comprador.</param>
        /// <param name="cancellationToken">Token de cancelación cooperativa.</param>
        /// <returns>La entidad <see cref="Buyer"/> si existe; de lo contrario, <c>null</c>.</returns>
        Task<Buyer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Registra un nuevo comprador en el almacenamiento de persistencia.
        /// </summary>
        /// <param name="buyer">Instancia del agregado válida a persistir.</param>
        /// <param name="cancellationToken">Token de cancelación cooperativa.</param>
        Task AddAsync(Buyer buyer, CancellationToken cancellationToken = default);

        /// <summary>
        /// Actualiza el estado persistido del comprador (direcciones, perfil).
        /// </summary>
        /// <param name="buyer">Instancia modificada del comprador.</param>
        /// <param name="cancellationToken">Token de cancelación cooperativa.</param>
        Task UpdateAsync(Buyer buyer, CancellationToken cancellationToken = default);
    }
}
