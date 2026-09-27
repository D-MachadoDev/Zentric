using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Returns;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class ReturnRequestMapper
    {
        public static ReturnRequest ToDomain(ReturnRequestDbModel dbModel)
        {
            var returnReq = (ReturnRequest)RuntimeHelpers.GetUninitializedObject(typeof(ReturnRequest));
            
            typeof(ReturnRequest).GetProperty("Id")?.SetValue(returnReq, dbModel.Id);
            typeof(ReturnRequest).GetProperty("CustomerOrderId")?.SetValue(returnReq, dbModel.CustomerOrderId);
            typeof(ReturnRequest).GetProperty("VariantId")?.SetValue(returnReq, dbModel.VariantId);
            typeof(ReturnRequest).GetProperty("WarehouseId")?.SetValue(returnReq, dbModel.WarehouseId);
            typeof(ReturnRequest).GetProperty("Quantity")?.SetValue(returnReq, dbModel.Quantity);
            typeof(ReturnRequest).GetProperty("Status")?.SetValue(returnReq, dbModel.Status);
            typeof(ReturnRequest).GetProperty("IsGoodCondition")?.SetValue(returnReq, dbModel.IsGoodCondition);
            typeof(ReturnRequest).GetProperty("VendorApproved")?.SetValue(returnReq, dbModel.VendorApproved);
            typeof(ReturnRequest).GetProperty("CreatedAt")?.SetValue(returnReq, dbModel.CreatedAt);
            typeof(ReturnRequest).GetProperty("UpdatedAt")?.SetValue(returnReq, dbModel.UpdatedAt);

            return returnReq;
        }

        public static ReturnRequestDbModel ToDbModel(ReturnRequest domain)
        {
            return new ReturnRequestDbModel
            {
                Id = domain.Id,
                CustomerOrderId = domain.CustomerOrderId,
                VariantId = domain.VariantId,
                WarehouseId = domain.WarehouseId,
                Quantity = domain.Quantity,
                Status = domain.Status,
                IsGoodCondition = domain.IsGoodCondition,
                VendorApproved = domain.VendorApproved,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
