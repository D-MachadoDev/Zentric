using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Enums;

namespace Zentric.Domain.Logistics.Ports
{
    public interface IFulfillmentOrderRepository
    {
        Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Despachos de UN pedido, en cualquier estado.
        ///
        /// Se necesita el conjunto completo para calcular el minimo comun de sus
        /// despachos y decidir si el pedido maestro avanza. No existe forma de obtenerlo
        /// con <see cref="GetListAsync"/>: sus filtros son por vendedor, comprador y
        /// estado, y ninguno de los tres devuelve "los despachos de este pedido".
        /// </summary>
        Task<IReadOnlyList<FulfillmentOrder>> GetByCustomerOrderIdAsync(
            Guid customerOrderId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Listado de despachos segun quien pregunta.
        ///
        /// Cada despacho pertenece a UN vendedor (a diferencia del pedido, que puede ser
        /// multi-vendedor), asi que el filtro por vendedor es directo por <c>VendorId</c>: sigue
        /// siendo un WHERE de igualdad y no un ANY sobre la coleccion de lineas.
        ///
        /// El filtro <paramref name="buyerId"/> no aplica sobre esta tabla directamente: el
        /// despacho no guarda al comprador, guarda el pedido. Se resuelve por el pedido, que es
        /// donde vive el BuyerId. Se incluye porque el detalle ya deja ver al Comprador sus
        /// propios despachos, y un listado mas restrictivo que el detalle seria incoherente: el
        /// usuario tendria que conocer un GUID para ver algo que su propia lista niega existir.
        ///
        /// Sin este metodo la cola operativa solo se podia recorrer probando GUIDs: no habia forma
        /// de saber que existia un despacho pendiente de empacar.
        /// </summary>
        Task<IReadOnlyList<FulfillmentOrder>> GetListAsync(
            Guid? vendorId, Guid? buyerId, FulfillmentStatus? status, CancellationToken cancellationToken = default);

        Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default);
        Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default);
    }
}
