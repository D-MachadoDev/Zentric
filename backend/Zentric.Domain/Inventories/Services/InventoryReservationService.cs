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
    /// no debe forzarse dentro de una sola entidad. Este servicio orquesta la reserva atómica multialmacén (ADR-0025)
    /// y ejecuta transacciones de compensación (liberación inversa) si algún ítem falla a mitad del checkout (ADR-0001).
    /// Omite productos digitales automáticamente (CAT-02).
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
            // ADR-0025: la decision de reserva ya no es un calculo en memoria que
            // SaveChanges persiste al final, sino un UPDATE condicional ATOMICO en la
            // base. Por eso se lleva la cuenta de lo aplicado: la reserva escribe de
            // inmediato y un fallo en una linea posterior debe liberar explicitamente
            // los parciales (ADR-0001, fallo y compensacion), que antes hacia el
            // rollback diferido de SaveChanges.
            var applied = new List<(Guid InventoryId, int Quantity)>();

            foreach (var item in order.Items)
            {
                // CAT-02 / H-16: los productos digitales no pasan por almacen. Sin esta
                // comprobacion el checkout exigia existencias para un ebook y fallaba
                // con "Not enough stock" (o consumia stock de una bodega).
                var product = await _productRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                if (product is null || product.Type == Zentric.Domain.Products.Enums.ProductType.Digital)
                {
                    continue;
                }

                // Find inventories for the given VariantId
                var inventories = await _inventoryRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                
                // V-02 (dictamen del Owner 2026-09-30): la reserva ordena por MAYOR
                // stock disponible y NO distingue entre bodega Marketplace y bodega
                // del Vendedor. Ese invariante se retiro: `Inventory` no transporta el
                // tipo de bodega, y con `VendorId = User.Id` (Q-21b, P1) el dueno del
                // stock es el dueno del producto, no el de la bodega. Ver
                // backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md.
                // No se ordena por cercania geografica porque el sistema no modela
                // ubicacion y la Ley no la define (ADR-0008).
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

                    // La garantia INV-01 vive en la sentencia, no en este bucle: si otra
                    // peticion se adelanto, el WHERE disponible >= n afecta cero filas,
                    // la base se niega y esta bodega queda descartada sin dejar jamas
                    // la fila negativa (ADR-0025).
                    var reserved = await _inventoryRepository.TryReserveStockAsync(inventory.Id, toReserve, cancellationToken);
                    if (!reserved)
                    {
                        continue;
                    }

                    // El guard del dominio se mantiene como defensa en profundidad y
                    // como documentacion de la regla, pero NO es la garantia
                    // (ADR-0025, decision 3): valida el plan contra la copia en memoria
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
        /// Compensacion de ADR-0001: libera en orden inverso las reservas ya
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
