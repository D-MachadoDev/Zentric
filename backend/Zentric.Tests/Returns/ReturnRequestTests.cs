using Xunit;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Products.Enums;
using System;

namespace Zentric.Tests.Returns
{
    public class ReturnRequestTests
    {
        [Fact]
        public void Constructor_DigitalProduct_ThrowsInvalidOperationException()
        {
            Assert.Throws<InvalidOperationException>(() => 
                new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Digital));
        }

        [Fact]
        public void ApproveByVendor_WhenGoodCondition_Approves()
        {
            var req = new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            req.InspectByLogistics(true);
            req.ApproveByVendor(false);
            Assert.Equal(ReturnStatus.Approved, req.Status);
            Assert.True(req.VendorApproved);
        }

        [Fact]
        public void ApproveByVendor_WhenBadConditionAndNotSameWarehouse_Throws()
        {
            var req = new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            req.InspectByLogistics(false);
            Assert.Throws<InvalidOperationException>(() => req.ApproveByVendor(false));
        }

        [Fact]
        public void ApproveByVendor_WhenBadConditionButSameWarehouse_Approves()
        {
            var req = new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            req.InspectByLogistics(false);
            req.ApproveByVendor(true); // Overrides inspection because vendor and logistics are the same
            Assert.Equal(ReturnStatus.Approved, req.Status);
            Assert.True(req.VendorApproved);
        }
    }
}
