using System;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Entities;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class FulfillmentOrderMapper
    {
        public static FulfillmentOrder ToDomain(FulfillmentOrderDbModel dbModel)
        {
            var order = (FulfillmentOrder)RuntimeHelpers.GetUninitializedObject(typeof(FulfillmentOrder));
            
            typeof(FulfillmentOrder).GetProperty("Id")?.SetValue(order, dbModel.Id);
            typeof(FulfillmentOrder).GetProperty("CustomerOrderId")?.SetValue(order, dbModel.CustomerOrderId);
            typeof(FulfillmentOrder).GetProperty("VendorId")?.SetValue(order, dbModel.VendorId);
            typeof(FulfillmentOrder).GetProperty("Status")?.SetValue(order, dbModel.Status);
            typeof(FulfillmentOrder).GetProperty("CancellationReason")?.SetValue(order, dbModel.CancellationReason);
            typeof(FulfillmentOrder).GetProperty("CreatedAt")?.SetValue(order, dbModel.CreatedAt);
            typeof(FulfillmentOrder).GetProperty("UpdatedAt")?.SetValue(order, dbModel.UpdatedAt);

            var itemsField = typeof(FulfillmentOrder).GetField("_shipments", BindingFlags.NonPublic | BindingFlags.Instance);
            var itemsList = new System.Collections.Generic.List<Shipment>();
            if (dbModel.Shipments != null)
            {
                foreach (var itemDb in dbModel.Shipments)
                {
                    var item = (Shipment)RuntimeHelpers.GetUninitializedObject(typeof(Shipment));
                    typeof(Shipment).GetProperty("Id")?.SetValue(item, itemDb.Id);
                    typeof(Shipment).GetProperty("FulfillmentOrderId")?.SetValue(item, itemDb.FulfillmentOrderId);
                    typeof(Shipment).GetProperty("WarehouseId")?.SetValue(item, itemDb.WarehouseId);
                    typeof(Shipment).GetProperty("TrackingNumber")?.SetValue(item, itemDb.TrackingNumber);
                    itemsList.Add(item);
                }
            }
            itemsField?.SetValue(order, itemsList);
            return order;
        }

        public static FulfillmentOrderDbModel ToDbModel(FulfillmentOrder domain)
        {
            var dbModel = new FulfillmentOrderDbModel
            {
                Id = domain.Id,
                CustomerOrderId = domain.CustomerOrderId,
                VendorId = domain.VendorId,
                Status = domain.Status,
                CancellationReason = domain.CancellationReason,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };

            foreach (var item in domain.Shipments)
            {
                dbModel.Shipments.Add(new ShipmentDbModel
                {
                    Id = item.Id,
                    FulfillmentOrderId = item.FulfillmentOrderId,
                    WarehouseId = item.WarehouseId,
                    TrackingNumber = item.TrackingNumber
                });
            }
            return dbModel;
        }
    }
}
