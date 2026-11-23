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
        public DbSet<SellerProfileDbModel> SellerProfiles => Set<SellerProfileDbModel>();
        public DbSet<SellerBankAccountDbModel> SellerBankAccounts => Set<SellerBankAccountDbModel>();
        public DbSet<SellerPayoutDbModel> SellerPayouts => Set<SellerPayoutDbModel>();
        public DbSet<ReviewDbModel> Reviews => Set<ReviewDbModel>();
        public DbSet<BuyerFavoriteDbModel> BuyerFavorites => Set<BuyerFavoriteDbModel>();
        public DbSet<InventoryDbModel> Inventories => Set<InventoryDbModel>();
        public DbSet<StockAdjustmentDbModel> StockAdjustments => Set<StockAdjustmentDbModel>();
        public DbSet<WarehouseDbModel> Warehouses => Set<WarehouseDbModel>();
        public DbSet<UserRecentlyViewedDbModel> UserRecentlyViewed => Set<UserRecentlyViewedDbModel>();
        public DbSet<IdempotencyKeyDbModel> IdempotencyKeys => Set<IdempotencyKeyDbModel>();
        public DbSet<OutboxMessageDbModel> OutboxMessages => Set<OutboxMessageDbModel>();
        public DbSet<AuditLogDbModel> AuditLogs => Set<AuditLogDbModel>();

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

            modelBuilder.Entity<PasswordResetTokenDbModel>(b =>
            {
                b.HasKey(t => t.Id);
                b.HasIndex(t => t.TokenHash);
                b.HasIndex(t => t.UserId);
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

            // Credito a favor individual (ADdecision 7). El comprobante
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

            // Registro inmutable de ajuste fisico de inventario.
            modelBuilder.Entity<StockAdjustmentDbModel>(b =>
            {
                b.HasKey(c => c.Id);
                b.HasIndex(c => c.InventoryId);
                b.HasIndex(c => c.CountedBy);
            });

            // Auditoria de decisiones de reembolso (regla aplicada, actor y resultado).
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

            modelBuilder.Entity<UserRecentlyViewedDbModel>(b =>
            {
                b.HasKey(x => x.Id);
                b.HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
                b.HasIndex(x => x.UserId);
                b.HasIndex(x => x.ViewedAt);
            });

            modelBuilder.Entity<IdempotencyKeyDbModel>(b =>
            {
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.Key).IsUnique();
                b.HasIndex(x => x.ExpiresAt);
            });

            modelBuilder.Entity<OutboxMessageDbModel>(b =>
            {
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.ProcessedAt);
                b.HasIndex(x => x.OccurredAt);
                b.Property(x => x.EventType).HasMaxLength(200);
                b.Property(x => x.Payload).HasColumnType("text");
            });

            modelBuilder.Entity<AuditLogDbModel>(b =>
            {
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.EntityName);
                b.HasIndex(x => x.EntityId);
                b.HasIndex(x => x.OccurredAt);
                b.Property(x => x.EntityName).HasMaxLength(200);
                b.Property(x => x.Action).HasMaxLength(50);
            });
            
            modelBuilder.Entity<SellerProfileDbModel>(b =>
            {
                b.ToTable("seller_profiles");
                b.HasKey(s => s.Id);
                b.HasIndex(s => s.UserId).IsUnique();
                b.Property(s => s.StoreName).HasMaxLength(150).IsRequired();
                b.Property(s => s.LogoUrl).HasMaxLength(1000);
            });

            modelBuilder.Entity<SellerBankAccountDbModel>(b =>
            {
                b.ToTable("seller_bank_accounts");
                b.HasKey(a => a.Id);
                b.HasIndex(a => a.SellerId).IsUnique();
                b.Property(a => a.BankName).HasMaxLength(100).IsRequired();
                b.Property(a => a.AccountType).HasMaxLength(50).IsRequired();
                b.Property(a => a.AccountNumber).HasMaxLength(50).IsRequired();
                b.Property(a => a.AccountHolderName).HasMaxLength(150).IsRequired();
                b.Property(a => a.DocumentNumber).HasMaxLength(50).IsRequired();
            });

            modelBuilder.Entity<SellerPayoutDbModel>(b =>
            {
                b.ToTable("seller_payouts");
                b.HasKey(p => p.Id);
                b.HasIndex(p => p.SellerId);
                b.HasIndex(p => p.RequestedAt);
                b.Property(p => p.Amount).HasColumnType("numeric(18,2)");
                b.Property(p => p.Currency).HasMaxLength(10).IsRequired();
                b.Property(p => p.Status).HasMaxLength(30).IsRequired();
                b.Property(p => p.BankSummary).HasMaxLength(250).IsRequired();
                b.Property(p => p.ReferenceNumber).HasMaxLength(100).IsRequired();
            });

            modelBuilder.Entity<ReviewDbModel>(b =>
            {
                b.ToTable("reviews");
                b.HasKey(r => r.Id);
                b.HasIndex(r => new { r.ProductId, r.UserId }).IsUnique();
                b.HasIndex(r => r.ProductId);
                b.Property(r => r.Comment).HasMaxLength(2000);
                b.HasOne(r => r.Product)
                 .WithMany(p => p.Reviews)
                 .HasForeignKey(r => r.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<BuyerFavoriteDbModel>(b =>
            {
                b.ToTable("buyer_favorites");
                b.HasKey(f => f.Id);
                b.HasIndex(f => new { f.UserId, f.ProductId }).IsUnique();
                b.HasIndex(f => f.UserId);
                b.HasIndex(f => f.CreatedAt);
                b.HasOne(f => f.Product)
                 .WithMany()
                 .HasForeignKey(f => f.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ProductDbModel>(b =>
            {
                b.HasKey(p => p.Id);
                b.Property(p => p.AverageRating).HasColumnType("numeric(3,2)").HasDefaultValue(0.00m);
                b.Property(p => p.ReviewsCount).HasDefaultValue(0);
                b.OwnsOne(p => p.Price, u => 
                {
                    u.Property(x => x.Amount).HasColumnName("PriceAmount");
                    u.Property(x => x.Currency).HasColumnName("PriceCurrency");
                });
                b.HasMany(p => p.Variants)
                 .WithOne(v => v.Product)
                 .HasForeignKey(v => v.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
                b.HasMany(p => p.Reviews)
                 .WithOne(r => r.Product)
                 .HasForeignKey(r => r.ProductId)
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
            // Capture audit entries before saving.
            var auditEntries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added ||
                            e.State == EntityState.Modified ||
                            e.State == EntityState.Deleted)
                .Select(e => new AuditLogDbModel
                {
                    Id = Guid.NewGuid(),
                    EntityName = e.Entity.GetType().Name,
                    EntityId = e.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString() ?? "",
                    Action = e.State.ToString(),
                    OccurredAt = DateTime.UtcNow
                })
                .ToList();

            foreach (var audit in auditEntries)
            {
                AuditLogs.Add(audit);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
