using Microsoft.EntityFrameworkCore;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence
{
    public class ZentricDbContext : DbContext
    {
        public DbSet<CustomerOrderDbModel> CustomerOrders => Set<CustomerOrderDbModel>();
        public DbSet<FulfillmentOrderDbModel> FulfillmentOrders => Set<FulfillmentOrderDbModel>();
        public DbSet<ReturnRequestDbModel> ReturnRequests => Set<ReturnRequestDbModel>();
        public DbSet<InvoiceDbModel> Invoices => Set<InvoiceDbModel>();
        public DbSet<PaymentReceiptDbModel> PaymentReceipts => Set<PaymentReceiptDbModel>();
        public DbSet<RefundCreditDbModel> RefundCredits => Set<RefundCreditDbModel>();
        public DbSet<DigitalDeliveryRecordDbModel> DigitalDeliveries => Set<DigitalDeliveryRecordDbModel>();
        public DbSet<RefundAuditDbModel> RefundAudits => Set<RefundAuditDbModel>();
        
        public DbSet<UserDbModel> Users => Set<UserDbModel>();
        public DbSet<BuyerDbModel> Buyers => Set<BuyerDbModel>();
        public DbSet<ProductDbModel> Products => Set<ProductDbModel>();
        public DbSet<InventoryDbModel> Inventories => Set<InventoryDbModel>();
        public DbSet<StockAdjustmentDbModel> StockAdjustments => Set<StockAdjustmentDbModel>();
        public DbSet<WarehouseDbModel> Warehouses => Set<WarehouseDbModel>();

        public ZentricDbContext(DbContextOptions<ZentricDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<CustomerOrderDbModel>(b =>
            {
                b.HasKey(o => o.Id);
                b.HasMany(o => o.Items)
                 .WithOne(i => i.CustomerOrder)
                 .HasForeignKey(i => i.CustomerOrderId)
                 .OnDelete(DeleteBehavior.Cascade);
                b.HasMany(o => o.DigitalDeliveries)
                 .WithOne(d => d.Order)
                 .HasForeignKey(d => d.OrderId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<OrderItemDbModel>(b =>
            {
                b.HasKey(o => o.Id);
                b.OwnsOne(o => o.UnitPrice, u => 
                {
                    u.Property(p => p.Amount).HasColumnName("UnitPriceAmount");
                    u.Property(p => p.Currency).HasColumnName("UnitPriceCurrency");
                });
            });

            modelBuilder.Entity<DigitalDeliveryRecordDbModel>(b =>
            {
                b.HasKey(d => d.Id);
                b.HasIndex(d => d.OrderId);
                b.HasIndex(d => d.OrderItemId);
            });

            modelBuilder.Entity<FulfillmentOrderDbModel>(b =>
            {
                b.HasKey(f => f.Id);
                b.HasMany(f => f.Shipments)
                 .WithOne(s => s.FulfillmentOrder)
                 .HasForeignKey(s => s.FulfillmentOrderId)
                 .OnDelete(DeleteBehavior.Cascade);
            });
            
            modelBuilder.Entity<ShipmentDbModel>().HasKey(s => s.Id);

            modelBuilder.Entity<InvoiceDbModel>(b => 
            {
                b.HasKey(i => i.Id);
                b.OwnsOne(i => i.TotalAmount, a => 
                {
                    a.Property(p => p.Amount).HasColumnName("TotalAmount");
                    a.Property(p => p.Currency).HasColumnName("Currency");
                });
            });

            modelBuilder.Entity<UserDbModel>(b => 
            {
                b.HasKey(u => u.Id);
            });

            // Comprobante de pago (invariante 9). No guarda datos de tarjeta: solo
            // el resultado del cobro y, si aplica, el credito a favordevuelto.
            modelBuilder.Entity<PaymentReceiptDbModel>(b =>
            {
                b.HasKey(p => p.Id);
                b.HasIndex(p => p.OrderId);
                b.OwnsOne(p => p.Amount, a =>
                {
                    a.Property(x => x.Amount).HasColumnName("Amount");
                    a.Property(x => x.Currency).HasColumnName("Currency");
                });
                b.OwnsOne(p => p.RefundedAmount, a =>
                {
                    a.Property(x => x.Amount).HasColumnName("RefundedAmount");
                    a.Property(x => x.Currency).HasColumnName("RefundedCurrency");
                });

                // Relacion explicita de la coleccion de creditos. La convencion
                // detecta la navegacion y la FK, pero en esta entidad ya hay un
                // OwnsOne debajo y la combinacion convencion+owned es el sitio
                // tipico donde EF se queda sin saber quien es el dueño.
                b.HasMany(p => p.Credits)
                    .WithOne()
                    .HasForeignKey(c => c.PaymentReceiptId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Credito a favor individual (ADR-0020 decision 7). El comprobante
            // guarda el acumulado; esta tabla dice de quien, de que linea y bajo
            // que regla. Un registro por credito y no uno por comprobante.
            modelBuilder.Entity<RefundCreditDbModel>(b =>
            {
                b.HasKey(c => c.Id);
                b.HasIndex(c => c.PaymentReceiptId);
                b.HasIndex(c => c.CustomerOrderId);
                b.OwnsOne(c => c.Amount, a =>
                {
                    a.Property(x => x.Amount).HasColumnName("Amount");
                    a.Property(x => x.Currency).HasColumnName("Currency");
                });
            });

            // Registro de ajuste a la baja (ADR-0021 decision 5). El inventario
            // guarda los contadores; esta tabla dice cuanto habia, cuanto hay,
            // quien conto y por que. Un registro por ajuste, inmutable.
            modelBuilder.Entity<StockAdjustmentDbModel>(b =>
            {
                b.HasKey(c => c.Id);
                b.HasIndex(c => c.InventoryId);
                b.HasIndex(c => c.CountedBy);
            });

            // Auditoría de reembolso (ADR-0020 decision 7). Cada intento de reembolso
            // deja traza: regla aplicada, tipo de decisión (auto/manual), actor, resultado.
            modelBuilder.Entity<RefundAuditDbModel>(b =>
            {
                b.HasKey(a => a.Id);
                b.HasIndex(a => a.ReturnRequestId);
                b.HasIndex(a => a.CustomerOrderId);
                b.HasIndex(a => a.PaymentReceiptId);
                b.HasIndex(a => a.OccurredAt);
                b.Property(a => a.RuleApplied).HasMaxLength(500);
                b.Property(a => a.ErrorMessage).HasMaxLength(1000);
            });

            modelBuilder.Entity<BuyerDbModel>(b =>
            {
                b.HasKey(x => x.UserId);

                // La direccion se guarda descompuesta en columnas propias.
                b.OwnsOne(x => x.MainAddress, a =>
                {
                    a.Property(p => p.Street).HasColumnName("MainAddressStreet");
                    a.Property(p => p.City).HasColumnName("MainAddressCity");
                    a.Property(p => p.State).HasColumnName("MainAddressState");
                    a.Property(p => p.ZipCode).HasColumnName("MainAddressZipCode");
                    a.Property(p => p.Country).HasColumnName("MainAddressCountry");
                });
            });
            modelBuilder.Entity<ReturnRequestDbModel>().HasKey(r => r.Id);
            modelBuilder.Entity<InventoryDbModel>().HasKey(i => i.Id);
            modelBuilder.Entity<WarehouseDbModel>().HasKey(w => w.Id);
            
            modelBuilder.Entity<ProductDbModel>(b =>
            {
                b.HasKey(p => p.Id);
                b.OwnsOne(p => p.Price, u => 
                {
                    u.Property(x => x.Amount).HasColumnName("PriceAmount");
                    u.Property(x => x.Currency).HasColumnName("PriceCurrency");
                });
                b.HasMany(p => p.Variants)
                 .WithOne(v => v.Product)
                 .HasForeignKey(v => v.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ProductVariantDbModel>(b => 
            {
                b.HasKey(v => v.Id);
                b.OwnsMany(v => v.Attributes, a => 
                {
                    a.WithOwner().HasForeignKey("VariantId");
                    a.HasKey("VariantId", "Name");
                });
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
