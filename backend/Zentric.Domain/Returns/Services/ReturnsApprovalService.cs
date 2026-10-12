using System;
using Zentric.Domain.Returns;

namespace Zentric.Domain.Returns.Services
{
    public sealed class ReturnsApprovalService
    {
        public void ApproveReturn(ReturnRequest returnRequest, bool isSameWarehouseAndVendor)
        {
            if (returnRequest == null) throw new ArgumentNullException(nameof(returnRequest));

            returnRequest.ApproveByVendor(isSameWarehouseAndVendor);
        }
    }
}
