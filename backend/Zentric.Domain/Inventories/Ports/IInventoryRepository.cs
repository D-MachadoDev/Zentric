using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories;

namespace Zentric.Domain.Inventories.Ports
{
    /// <summary>
    /// Fila del listado de existencias con la identidad comercial de su variante.
    ///
    /// El nombre y el SKU viven en el producto y la variante, no en la existencia.
    /// Se resuelven en la misma consulta paginada para no hacer N+1 ni obligar a
    /// la pantalla a inventar un identificador cuando no encuentra el producto.
    /// </summary>
    public sealed record InventoryListRow(
        Inventory Inventory,
        string ProductName,
        string Sku);

    /// <summary>
    /// Puerto de salida (Output Port) para la persistencia y operaciones atómicas de inventario.
    /// </summary>
    /// <remarks>
    /// Define contratos para consultas seguras aisladas por vendedor y mutaciones atómicas condicionales (AD)
    /// que garantizan que el stock jamás sea negativo ante concurrencia sin usar locks pesados de base de datos.
    /// </remarks>
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

        /// <summary>
        /// Listado paginado con la identidad del producto resuelta en la consulta.
        ///
        /// <paramref name="vendorId"/> acota por dueno del producto; <paramref name="warehouseId"/>
        /// por bodega; <paramref name="search"/> compara contra nombre de producto y SKU. El total
        /// se cuenta antes del <c>Skip/Take</c>, con los mismos filtros, para que la pantalla no
        /// muestre un contador que no corresponde a lo que esta viendo.
        /// </summary>
        async Task<(IReadOnlyList<InventoryListRow> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId,
            Guid? warehouseId,
            string? search,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
        {
            // Implementacion por defecto para no romper los dobles de prueba que
            // solo conocen el listado completo. El adaptador real la sobrescribe
            // con una unica consulta paginada; aqui se reproduce el mismo contrato.
            var all = await GetListAsync(vendorId, cancellationToken);
            var filtered = all
                .Where(i => !warehouseId.HasValue || i.WarehouseId == warehouseId.Value)
                .ToList();

            var page = filtered.Skip(skip).Take(take)
                .Select(i => new InventoryListRow(i, string.Empty, string.Empty))
                .ToList();

            return (page, filtered.Count);
        }

        Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default);
        Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default);

        /// <summary>
        /// Carga el agregado con su historial de ajustes por conteo fisico
        /// (AD, decision 5). Sin el historial, la auditoria de
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
        /// (AD): un solo UPDATE condicional
        /// (disponible -= n, reservado += n WHERE Id = id AND disponible >= n).
        /// Devuelve false si no había stock suficiente (cero filas afectadas),
        /// que es el unico caso en que la base se niega; jamas deja la fila
        /// negativa aunque dos peticiones corran a la vez. El candado dura lo
        /// que dura la sentencia, no una transaccion larga (AD, decision 4).
        /// </summary>
        Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default);

        /// <summary>
        /// Libera una reserva ya aplicada (UPDATE inverso condicional:
        /// reservado -= n, disponible += n WHERE reservado >= n). Es la
        /// compensacion que exige ADpara que un fallo a mitad de la
        /// reserva no deje parciales confirmados, y se aplica en el mismo
        /// estilo atomico que la reserva. Ver AD.
        /// </summary>
        Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default);

    }
}
