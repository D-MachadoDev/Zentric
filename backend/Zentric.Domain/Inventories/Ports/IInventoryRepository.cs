using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories;

namespace Zentric.Domain.Inventories.Ports
{
    public interface IInventoryRepository
    {
        Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default);
        Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default);
        Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Listado de existencias segun quien pregunta.
        ///
        /// El filtro por vendedor se resuelve por la variante: variante -> producto -> vendedor, el
        /// mismo criterio que usa el detalle. Va en la consulta y no en el handler fila por fila,
        /// porque traer todo y descartar en memoria daria el mismo resultado visible y traeria al
        /// proceso el stock de la competencia, que es justo la superficie que la propiedad oculta.
        /// </summary>
        Task<IReadOnlyList<Inventory>> GetListAsync(Guid? vendorId, CancellationToken cancellationToken = default);

        Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default);
        Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default);

        /// <summary>
        /// Carga el agregado con su historial de ajustes por conteo fisico
        /// (ADR-0021, decision 5). Sin el historial, la auditoria de
        /// reincidentes no puede responder quien ajusto que ni cuando.
        /// </summary>
        Task<Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Persiste el contador nuevo junto con su registro de auditoria en
        /// la misma unidad de trabajo. El agregado ya aplico el ajuste en
        /// memoria; aca solo se guarda.
        /// </summary>
        Task SaveAdjustmentAsync(Inventory inventory, StockAdjustmentRecord record, CancellationToken cancellationToken = default);

        /// <summary>
        /// Reserva de forma ATOMICA una cantidad de UNA fila de existencias
        /// (ADR-0025): un solo UPDATE condicional
        /// (disponible -= n, reservado += n WHERE Id = id AND disponible >= n).
        /// Devuelve false si no había stock suficiente (cero filas afectadas),
        /// que es el unico caso en que la base se niega; jamas deja la fila
        /// negativa aunque dos peticiones corran a la vez. El candado dura lo
        /// que dura la sentencia, no una transaccion larga (ADR-0025, decision 4).
        /// </summary>
        Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default);

        /// <summary>
        /// Libera una reserva ya aplicada (UPDATE inverso condicional:
        /// reservado -= n, disponible += n WHERE reservado >= n). Es la
        /// compensacion que exige ADR-0001 para que un fallo a mitad de la
        /// reserva no deje parciales confirmados, y se aplica en el mismo
        /// estilo atomico que la reserva. Ver backendSDD/Adr/0025.
        /// </summary>
        Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default);

    }
}
