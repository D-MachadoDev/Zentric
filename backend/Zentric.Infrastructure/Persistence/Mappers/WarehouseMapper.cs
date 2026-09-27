using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Warehouses;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class WarehouseMapper
    {
        public static Warehouse ToDomain(WarehouseDbModel dbModel)
        {
            var wh = (Warehouse)RuntimeHelpers.GetUninitializedObject(typeof(Warehouse));
            
            typeof(Warehouse).GetProperty("Id")?.SetValue(wh, dbModel.Id);
            typeof(Warehouse).GetProperty("Name")?.SetValue(wh, dbModel.Name);
            typeof(Warehouse).GetProperty("Location")?.SetValue(wh, dbModel.Location);
            typeof(Warehouse).GetProperty("Capacity")?.SetValue(wh, dbModel.Capacity);
            typeof(Warehouse).GetProperty("Type")?.SetValue(wh, dbModel.Type);
            typeof(Warehouse).GetProperty("VendorId")?.SetValue(wh, dbModel.VendorId);
            typeof(Warehouse).GetProperty("IsActive")?.SetValue(wh, dbModel.IsActive);
            typeof(Warehouse).GetProperty("CreatedAt")?.SetValue(wh, dbModel.CreatedAt);
            typeof(Warehouse).GetProperty("UpdatedAt")?.SetValue(wh, dbModel.UpdatedAt);
            typeof(Warehouse).GetProperty("DeletedAt")?.SetValue(wh, dbModel.DeletedAt);

            return wh;
        }

        public static WarehouseDbModel ToDbModel(Warehouse domain)
        {
            return new WarehouseDbModel
            {
                Id = domain.Id,
                Name = domain.Name,
                Location = domain.Location,
                Capacity = domain.Capacity,
                Type = domain.Type,
                VendorId = domain.VendorId,
                IsActive = domain.IsActive,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt,
                DeletedAt = domain.DeletedAt
            };
        }
    }
}
