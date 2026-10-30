using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;

namespace Zentric.Domain.Inventories.Services
{
    /// <summary>
    /// Servicio de Dominio que coordina la reserva transaccional de stock entre múltiples bodegas para un pedido.
    /// </summary>
    /// <remarks>
    /// En DDD, cuando una regla de negocio abarca múltiples agregados (<see cref="Inventory"/>, <see cref="CustomerOrder"/> y productos),
    /// coordina la reserva multialmacén y ejecuta compensaciones si algún ítem falla a mitad del checkout.
    /// Omite productos digitales automáticamente.
    /// </remarks>
    public class InventoryReservationService
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly Zentric.Domain.Products.Ports.IProductRepository _productRepository;

        public InventoryReservationService(
            IInventoryRepository inventoryRepository,
            Zentric.Domain.Products.Ports.IProductRepository productRepository)
        {
            _inventoryRepository = inventoryRepository;
            _productRepository = productRepository;
        }

        /// <summary>
        /// Ejecuta la reserva atómica de existencias para todas las líneas físicas de un pedido.
        /// </summary>
        /// <param name="order">Pedido en estado Carrito con sus ítems a reservar.</param>
        /// <param name="cancellationToken">Token de cancelación cooperativa.</param>
        /// <exception cref="InvalidOperationException">Se lanza si no hay suficiente stock consolidado, disparando compensación.</exception>
        public async Task ReserveForOrderAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            // La reserva ejecuta un UPDATE condicional atomico en persistencia.
            // Se rastrean las reservas aplicadas para compensar si una linea posterior falla.
            var applied = new List<(Guid InventoryId, int Quantity)>();

            foreach (var item in order.Items)
            {
                // Los productos digitales no consumen existencias en almacen.
                var product = await _productRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                if (product is null || product.Type == Zentric.Domain.Products.Enums.ProductType.Digital)
                {
                    continue;
                }

                // Find inventories for the given VariantId
                var inventories = await _inventoryRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                
                // V-02 (dictamen del Owner 2026-09-30): la reserva ordena por mayor
                // stock disponible y no distingue entre bodega Marketplace y bodega
                // del Vendedor. Ese invariante se retiro: `Inventory` no transporta el
                // tipo de bodega, y con `VendorId = User.Id` el dueno del
                // stock es el dueno del producto, no el de la bodega.
                // No se ordena por cercania geografica porque el sistema no modela
                // ubicacion y las especificaciones no la definen.
                // Desempate estable por Id para que dos ejecuciones con los mismos
                // datos reserven en el mismo orden.
                var ordered = inventories
                    .Where(i => i.AvailableQuantity > 0)
                    .OrderByDescending(i => i.AvailableQuantity)
                    .ThenBy(i => i.Id)
                    .ToList();

                int remainingToReserve = item.Quantity;
                foreach (var inventory in ordered)
                {
                    if (remainingToReserve == 0) break;

                    var toReserve = Math.Min(inventory.AvailableQuantity, remainingToReserve);

                    // La garantia vive en la sentencia, no en este bucle: si otra
                    // peticion se adelanto, el WHERE disponible >= n afecta cero filas,
                    // la base se niega y esta bodega queda descartada sin dejar jamas
                    // la fila negativa.
                    var reserved = await _inventoryRepository.TryReserveStockAsync(inventory.Id, toReserve, cancellationToken);
                    if (!reserved)
                    {
                        continue;
                    }

                    // El guard del dominio se mantiene como defensa en profundidad y
                    // como documentacion de la regla, pero NO es la garantia
                    // (AD, decision 3): valida el plan contra la copia en memoria
                    // justo tras confirmarlo la base.
                    inventory.ReserveStock(toReserve);
                    applied.Add((inventory.Id, toReserve));
                    remainingToReserve -= toReserve;
                }

                if (remainingToReserve > 0)
                {
                    await ReleaseAppliedAsync(applied, cancellationToken);
                    throw new InvalidOperationException($"Not enough stock available for variant {item.VariantId}. Needed {item.Quantity}, but only could reserve {item.Quantity - remainingToReserve}.");
                }
            }
        }

        /// <summary>
        /// Compensacion de ADlibera en orden inverso las reservas ya
        /// confirmadas para que un fallo a mitad de la orden no deje parciales.
        /// Equivale al rollback que antes hacia el SaveChanges diferido, pero en el
        /// mismo estilo atomico que la reserva.
        /// </summary>
        private async Task ReleaseAppliedAsync(List<(Guid InventoryId, int Quantity)> applied, CancellationToken cancellationToken)
        {
            foreach (var (inventoryId, quantity) in Enumerable.Reverse(applied))
            {
                await _inventoryRepository.ReleaseReservedStockAsync(inventoryId, quantity, cancellationToken);
            }

            applied.Clear();
        }
    }
}
