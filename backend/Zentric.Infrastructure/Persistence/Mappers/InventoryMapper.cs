using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Inventories;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class InventoryMapper
    {
        public static Inventory ToDomain(InventoryDbModel dbModel)
        {
            var inv = (Inventory)RuntimeHelpers.GetUninitializedObject(typeof(Inventory));
            
            typeof(Inventory).GetProperty("Id")?.SetValue(inv, dbModel.Id);
            typeof(Inventory).GetProperty("VariantId")?.SetValue(inv, dbModel.VariantId);
            typeof(Inventory).GetProperty("WarehouseId")?.SetValue(inv, dbModel.WarehouseId);
            typeof(Inventory).GetProperty("AvailableQuantity")?.SetValue(inv, dbModel.AvailableQuantity);
            typeof(Inventory).GetProperty("ReservedQuantity")?.SetValue(inv, dbModel.ReservedQuantity);
            typeof(Inventory).GetProperty("DamagedQuantity")?.SetValue(inv, dbModel.DamagedQuantity);
            typeof(Inventory).GetProperty("UsedQuantity")?.SetValue(inv, dbModel.UsedQuantity);
            typeof(Inventory).GetProperty("CreatedAt")?.SetValue(inv, dbModel.CreatedAt);
            typeof(Inventory).GetProperty("UpdatedAt")?.SetValue(inv, dbModel.UpdatedAt);

            return inv;
        }

        public static InventoryDbModel ToDbModel(Inventory domain)
        {
            return new InventoryDbModel
            {
                Id = domain.Id,
                VariantId = domain.VariantId,
                WarehouseId = domain.WarehouseId,
                AvailableQuantity = domain.AvailableQuantity,
                ReservedQuantity = domain.ReservedQuantity,
                DamagedQuantity = domain.DamagedQuantity,
                UsedQuantity = domain.UsedQuantity,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
