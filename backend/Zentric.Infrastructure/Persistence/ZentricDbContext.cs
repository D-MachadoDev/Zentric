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
        
        public DbSet<UserDbModel> Users => Set<UserDbModel>();
        public DbSet<BuyerDbModel> Buyers => Set<BuyerDbModel>();
        public DbSet<ProductDbModel> Products => Set<ProductDbModel>();
        public DbSet<InventoryDbModel> Inventories => Set<InventoryDbModel>();
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

            modelBuilder.Entity<BuyerDbModel>().HasKey(b => b.UserId);
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
