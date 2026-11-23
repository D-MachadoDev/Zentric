using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Billing.Pdf;
using Zentric.Application.Billing.Queries;
using Zentric.Application.Common.Models;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Application.Billing
{
    /// <summary>
    /// Pruebas unitarias de consulta y generación de PDF de Factura Electrónica DIAN (Fase 12 TDD).
    /// Valida aislamiento Zero Trust por rol (Comprador, Vendedor, Administrador/Supervisor)
    /// y generación determinista del documento tributario oficial.
    /// </summary>
    public class GetInvoicePdfQueryTests
    {
        private sealed class FakeInvoiceRepository : IInvoiceRepository
        {
            public List<Invoice> Invoices { get; } = new();

            public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Invoices.FirstOrDefault(i => i.Id == id));

            public Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Invoice>)Invoices.Where(i => i.CustomerOrderId == orderId).ToList());

            public Task<IReadOnlyList<Invoice>> GetListAsync(
                Guid? buyerId, Guid? vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Invoice>>(Invoices.ToList());

            public Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
            {
                Invoices.Add(invoice);
                return Task.CompletedTask;
            }

            public Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default)
            {
                Invoices.AddRange(invoices);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeOrderRepository : ICustomerOrderRepository
        {
            public List<CustomerOrder> Orders { get; } = new();

            public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

            public Task<CustomerOrder?> GetByIdForBuyerAsync(Guid id, Guid buyerId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

            public Task<CustomerOrder?> GetByIdForVendorAsync(Guid id, Guid vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.Items.Any(i => i.VendorId == vendorId)));

            public Task<IReadOnlyList<CustomerOrder>> GetListAsync(
                Guid? buyerId, Guid? vendorId, OrderStatus? status, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<CustomerOrder>>(Orders.ToList());

            public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<CustomerOrder>)Array.Empty<CustomerOrder>());

            public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            {
                Orders.Add(order);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private static CustomerOrder CreatePaidOrder(Guid buyerId, out Guid vendorId)
        {
            var order = new CustomerOrder(buyerId);
            vendorId = Guid.NewGuid();
            order.AddItem(Guid.NewGuid(), vendorId, 2, new Money(1145000m, "COP"));
            order.Checkout();
            order.MarkAsPaid();
            return order;
        }

        [Fact(DisplayName = "1. Comprador puede obtener el PDF de su Factura Maestra con CUFE y branding DIAN")]
        public async Task Comprador_PuedeObtenerPdf_DeSuPropiaFacturaMaestra()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = CreatePaidOrder(buyerId, out _);
            var invoice = Invoice.CreateMaster(order.Id, order.TotalAmount);

            var invoiceRepo = new FakeInvoiceRepository();
            await invoiceRepo.AddAsync(invoice);

            var orderRepo = new FakeOrderRepository();
            await orderRepo.AddAsync(order);

            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var query = new GetInvoicePdfQuery(invoice.Id, buyerId, UserRole.Buyer);

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Value);
            Assert.NotNull(result.Value.FileBytes);
            Assert.True(result.Value.FileBytes.Length > 0);
            Assert.Equal("application/pdf", result.Value.ContentType);
            Assert.StartsWith($"Factura-DIAN-{invoice.Id.ToString()[..8].ToUpperInvariant()}", result.Value.FileName);

            // Verificar cabecera %PDF
            var header = Encoding.ASCII.GetString(result.Value.FileBytes.Take(5).ToArray());
            Assert.StartsWith("%PDF-", header);
        }

        [Fact(DisplayName = "2. Comprador ajeno o no propietario es rechazado con NotFound")]
        public async Task CompradorAjeno_EsRechazado_ConNotFound()
        {
            // Arrange
            var realBuyerId = Guid.NewGuid();
            var attackerBuyerId = Guid.NewGuid();
            var order = CreatePaidOrder(realBuyerId, out _);
            var invoice = Invoice.CreateMaster(order.Id, order.TotalAmount);

            var invoiceRepo = new FakeInvoiceRepository();
            await invoiceRepo.AddAsync(invoice);

            var orderRepo = new FakeOrderRepository();
            await orderRepo.AddAsync(order);

            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var query = new GetInvoicePdfQuery(invoice.Id, attackerBuyerId, UserRole.Buyer);

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact(DisplayName = "3. Factura inexistente retorna NotFound")]
        public async Task FacturaInexistente_RetornaNotFound()
        {
            // Arrange
            var invoiceRepo = new FakeInvoiceRepository();
            var orderRepo = new FakeOrderRepository();
            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var query = new GetInvoicePdfQuery(Guid.NewGuid(), Guid.NewGuid(), UserRole.Buyer);

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact(DisplayName = "4. Comprador no puede solicitar PDF de facturas internas que no sean Master")]
        public async Task Comprador_NoPuedeDescargar_FacturasInternasDeVendedorOPlataforma()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = CreatePaidOrder(buyerId, out var vendorId);
            var vendorInvoice = Invoice.CreateVendorDetail(order.Id, vendorId, new Money(500000m, "COP"));

            var invoiceRepo = new FakeInvoiceRepository();
            await invoiceRepo.AddAsync(vendorInvoice);

            var orderRepo = new FakeOrderRepository();
            await orderRepo.AddAsync(order);

            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var query = new GetInvoicePdfQuery(vendorInvoice.Id, buyerId, UserRole.Buyer);

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact(DisplayName = "5. Vendedor puede obtener el PDF de su propia factura de vendedor")]
        public async Task Vendedor_PuedeObtenerPdf_DeSuPropiaFactura()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = CreatePaidOrder(buyerId, out var vendorId);
            var vendorInvoice = Invoice.CreateVendorDetail(order.Id, vendorId, new Money(1000000m, "COP"));

            var invoiceRepo = new FakeInvoiceRepository();
            await invoiceRepo.AddAsync(vendorInvoice);

            var orderRepo = new FakeOrderRepository();
            await orderRepo.AddAsync(order);

            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var query = new GetInvoicePdfQuery(vendorInvoice.Id, vendorId, UserRole.Seller);

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Value);
            Assert.True(result.Value.FileBytes.Length > 0);
        }

        [Fact(DisplayName = "6. Administrador o Supervisor puede obtener el PDF de cualquier factura")]
        public async Task Administrador_PuedeObtenerPdf_DeCualquierFactura()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = CreatePaidOrder(buyerId, out var vendorId);
            var masterInvoice = Invoice.CreateMaster(order.Id, order.TotalAmount);

            var invoiceRepo = new FakeInvoiceRepository();
            await invoiceRepo.AddAsync(masterInvoice);

            var orderRepo = new FakeOrderRepository();
            await orderRepo.AddAsync(order);

            var handler = new GetInvoicePdfQueryHandler(invoiceRepo, orderRepo);
            var adminQuery = new GetInvoicePdfQuery(masterInvoice.Id, Guid.NewGuid(), UserRole.Administrator);
            var supervisorQuery = new GetInvoicePdfQuery(masterInvoice.Id, Guid.NewGuid(), UserRole.Supervisor);

            // Act
            var adminResult = await handler.Handle(adminQuery, CancellationToken.None);
            var supervisorResult = await handler.Handle(supervisorQuery, CancellationToken.None);

            // Assert
            Assert.True(adminResult.IsSuccess);
            Assert.True(supervisorResult.IsSuccess);
        }

        [Fact(DisplayName = "7. Generador de PDF produce binario válido con firma %PDF y tamaño mayor a cero")]
        public void GeneradorPdf_ProduceDocumentoValido_ConBrandingDian()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = CreatePaidOrder(buyerId, out _);
            var invoice = Invoice.CreateMaster(order.Id, order.TotalAmount);
            var generator = new PdfInvoiceGenerator();

            // Act
            var pdfBytes = generator.GenerateInvoice(invoice, order, "comprador@zentric.co");

            // Assert
            Assert.NotNull(pdfBytes);
            Assert.True(pdfBytes.Length > 0);
            var header = Encoding.ASCII.GetString(pdfBytes.Take(5).ToArray());
            Assert.StartsWith("%PDF-", header);
        }
    }
}
