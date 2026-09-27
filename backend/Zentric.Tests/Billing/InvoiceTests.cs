using Xunit;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;
using System;

namespace Zentric.Tests.Billing
{
    public class InvoiceTests
    {
        [Fact]
        public void CreateMaster_Valid_CreatesMasterInvoice()
        {
            var invoice = Invoice.CreateMaster(Guid.NewGuid(), new Money(100, "USD"));
            Assert.Equal(InvoiceType.Master, invoice.Type);
            Assert.Null(invoice.VendorId);
        }

        [Fact]
        public void CreateVendorDetail_Valid_CreatesVendorInvoice()
        {
            var vendorId = Guid.NewGuid();
            var invoice = Invoice.CreateVendorDetail(Guid.NewGuid(), vendorId, new Money(50, "USD"));
            Assert.Equal(InvoiceType.VendorDetail, invoice.Type);
            Assert.Equal(vendorId, invoice.VendorId);
        }
    }
}
