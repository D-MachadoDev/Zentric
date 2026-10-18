using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Api.Bootstrap
{
    /// <summary>
    /// Sembrado de catálogo rico, bodegas e inventarios asociados a Valeria Mendoza y el marketplace.
    /// Requisito R1 (ORIGINAL_REQUEST.md / Milestone M1):
    /// - Almacén Central Zentric (Marketplace) y Almacén Valeria - TechHub (Vendor).
    /// - Al menos 12 productos realistas en 5 categorías con variantes (RAM/Storage, Color, Licensing),
    ///   precios en COP, imágenes Unsplash de alta resolución e inventarios activos (20-50 unidades).
    /// - Perfil canónico de Comprador para Andrés Castillo (buyer@zentric.local).
    /// </summary>
    public static class CatalogSeeder
    {
        private sealed record VariantSeed(string Sku, (string Key, string Value)[] Attributes, int Stock);

        private sealed record ProductSeed(
            string Name,
            string Description,
            decimal PriceAmount,
            string Category,
            ProductType Type,
            string ImageUrl,
            VariantSeed[] Variants);

        private static readonly ProductSeed[] SeedProducts =
        [
            // ==========================================
            // Categoría: Computación & Laptops
            // ==========================================
            new(
                Name: "ThinkPad X1 Carbon Gen 11",
                Description: "Laptop empresarial ultraligera Lenovo ThinkPad X1 Carbon Gen 11 con procesador Intel Core i7 vPro, pantalla 14\" 2.8K OLED y chasis de fibra de carbono. Diseñada para alto rendimiento y portabilidad corporativa.",
                PriceAmount: 7850000m,
                Category: "computacion",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("TPX1-32-1TB", [("Memoria", "32GB RAM LPDDR5x"), ("Almacenamiento", "1TB SSD NVMe PCIe 4.0")], Stock: 35),
                    new("TPX1-64-2TB", [("Memoria", "64GB RAM LPDDR5x"), ("Almacenamiento", "2TB SSD NVMe PCIe 4.0")], Stock: 25)
                ]
            ),
            new(
                Name: "MacBook Pro 16\" M3 Max",
                Description: "Portátil Apple MacBook Pro de 16 pulgadas con chip M3 Max (CPU 16 núcleos, GPU 40 núcleos), pantalla Liquid Retina XDR de 120Hz con ProMotion y autonomía de hasta 22 horas para ingeniería pesada y desarrollo.",
                PriceAmount: 14200000m,
                Category: "computacion",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("MBP16-36-1TB-BLK", [("Configuracion", "36GB RAM / 1TB SSD"), ("Color", "Space Black")], Stock: 30),
                    new("MBP16-48-2TB-SLV", [("Configuracion", "48GB RAM / 2TB SSD"), ("Color", "Silver")], Stock: 20)
                ]
            ),
            new(
                Name: "Dell XPS 15 9530 OLED",
                Description: "Laptop para creadores y desarrolladores Dell XPS 15 con pantalla táctil 3.5K OLED InfinityEdge, procesador Intel Core i9-13900H, GPU NVIDIA RTX 4070 de 8GB y chasis de aluminio mecanizado CNC.",
                PriceAmount: 9400000m,
                Category: "computacion",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("XPS15-32-1TB-SLV", [("Memoria", "32GB DDR5"), ("Almacenamiento", "1TB SSD NVMe")], Stock: 30),
                    new("XPS15-64-2TB-SLV", [("Memoria", "64GB DDR5"), ("Almacenamiento", "2TB SSD NVMe")], Stock: 20)
                ]
            ),

            // ==========================================
            // Categoría: Audio & Monitores
            // ==========================================
            new(
                Name: "Dell UltraSharp 32\" 4K Thunderbolt (U3223QE)",
                Description: "Monitor profesional 4K UHD Dell UltraSharp de 32 pulgadas con tecnología IPS Black, hub Thunderbolt 4 de 90W para periféricos, cobertura de color 100% sRGB y calibración de fábrica Delta E < 2.",
                PriceAmount: 3950000m,
                Category: "audio",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("DELL-U3223QE-STD", [("Soporte", "Base Inclinable Estándar"), ("Color", "Platinum Silver")], Stock: 40),
                    new("DELL-U3223QE-ARM", [("Soporte", "Brazo Ergonómico MSA20"), ("Color", "Platinum Silver")], Stock: 25)
                ]
            ),
            new(
                Name: "LG UltraGear 34\" Curved OLED (34GS95QE)",
                Description: "Monitor curvo ultra-panorámico 21:9 LG UltraGear OLED de 34 pulgadas con curvatura 800R inmersiva, tasa de refresco 240Hz, tiempo de respuesta 0.03ms y compatibilidad NVIDIA G-Sync.",
                PriceAmount: 5200000m,
                Category: "audio",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("LG-34GS95QE-STD", [("Resolucion", "UWQHD 3440x1440"), ("Color", "Matte Black")], Stock: 30)
                ]
            ),
            new(
                Name: "Auriculares Sony WH-1000XM5 Noise Cancelling",
                Description: "Auriculares inalámbricos premium Sony WH-1000XM5 con tecnología Auto NC Optimizer de doble procesador, drivers de fibra de carbono de 30mm, audio de alta resolución LDAC y 30 horas de autonomía.",
                PriceAmount: 1650000m,
                Category: "audio",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("SONY-XM5-BLK", [("Color", "Negro Mate")], Stock: 40),
                    new("SONY-XM5-SIL", [("Color", "Plata Platino")], Stock: 30)
                ]
            ),
            new(
                Name: "Micrófono Shure SM7B Studio Cardioide",
                Description: "Micrófono dinámico cardioide profesional Shure SM7B para podcasting, streaming y grabación de voces en estudio, con respuesta de frecuencia plana y blindaje contra interferencias electromagnéticas.",
                PriceAmount: 2150000m,
                Category: "audio",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("SHURE-SM7B-STD", [("Kit", "Edición Estándar Studio")], Stock: 35),
                    new("SHURE-SM7B-VOCAL", [("Kit", "Pro Vocal con Preamplificador")], Stock: 25)
                ]
            ),

            // ==========================================
            // Categoría: Periféricos & Teclados / Ergonomía
            // ==========================================
            new(
                Name: "Teclado Mecánico Ergonómico Zentric Pro",
                Description: "Teclado mecánico ergonómico con distribución dividida split 75%, switches mecánicos lubricados hotswap, conectividad tri-modo inalámbrica (2.4GHz, Bluetooth 5.2, USB-C) y reposamuñecas magnético acolchado.",
                PriceAmount: 850000m,
                Category: "perifericos",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("ZENTRIC-KB-RED", [("Switches", "Gateron Red Lineal"), ("Color", "Carbon Black")], Stock: 45),
                    new("ZENTRIC-KB-BROWN", [("Switches", "Gateron Brown Tactil"), ("Color", "Retro White")], Stock: 40)
                ]
            ),
            new(
                Name: "Mouse Ergonómico Logitech MX Master 3S",
                Description: "Mouse ergonómico inalámbrico Logitech MX Master 3S de alta precisión con clics silenciosos Quiet Clicks, sensor óptico de 8000 DPI que funciona sobre vidrio y rueda MagSpeed electromagnetica.",
                PriceAmount: 520000m,
                Category: "perifericos",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("MX-M3S-GRAPHITE", [("Color", "Graphite")], Stock: 50),
                    new("MX-M3S-PALEGRAY", [("Color", "Pale Gray")], Stock: 35)
                ]
            ),
            new(
                Name: "Silla Ergonómica Herman Miller Embody",
                Description: "Silla ergonómica de ingeniería postural Herman Miller Embody con respaldo dinámico de matriz de píxeles que reduce la presión en la columna vertebral, soporte lumbar Sacral y brazos ajustables 4D.",
                PriceAmount: 6900000m,
                Category: "perifericos",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1580481077111-9a7f3dfd7e59?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("HM-EMBODY-BLK", [("Tapizado", "Sync Black"), ("Chasis", "Titanium")], Stock: 25),
                    new("HM-EMBODY-CYAN", [("Tapizado", "Balance Cyan"), ("Chasis", "Graphite")], Stock: 20)
                ]
            ),

            // ==========================================
            // Categoría: Componentes & Hardware
            // ==========================================
            new(
                Name: "Disco Sólido SSD Samsung 990 PRO 4TB NVMe PCIe 4.0",
                Description: "Unidad de almacenamiento sólido SSD Samsung 990 PRO de 4TB con interfaz NVMe PCIe 4.0 x4, velocidad de lectura secuencial de hasta 7450 MB/s, tecnología V-NAND y controlador térmico avanzado.",
                PriceAmount: 1450000m,
                Category: "hardware",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("SSD-990PRO-4TB-HS", [("Disipador", "Con Disipador Heatsink")], Stock: 40),
                    new("SSD-990PRO-4TB-RAW", [("Disipador", "Sin Disipador")], Stock: 35)
                ]
            ),

            // ==========================================
            // Categoría: Software Empresarial & Cloud
            // ==========================================
            new(
                Name: "Zentric ERP Suite Enterprise Cloud",
                Description: "Licencia corporativa anual de software ERP Zentric Suite en la nube con facturación electrónica automatizada, contabilidad multimoneda en COP, control de inventarios distribuidos y conciliación bancaria.",
                PriceAmount: 4800000m,
                Category: "software",
                Type: ProductType.Digital,
                ImageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("ZERP-ENT-1Y", [("Licencia", "Anual Corporativa 25 Usuarios")], Stock: 0),
                    new("ZERP-UNL-1Y", [("Licencia", "Anual Ilimitada Enterprise")], Stock: 0)
                ]
            ),
            new(
                Name: "Zentric SecOps Cloud Sentinel Pro",
                Description: "Suscripción anual de ciberseguridad en la nube Zentric SecOps Sentinel con análisis de vulnerabilidades continuo, detección de amenazas Zero Trust y telemetría de endpoints 24/7 para equipos de TI.",
                PriceAmount: 3600000m,
                Category: "software",
                Type: ProductType.Digital,
                ImageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("ZSEC-PRO-1Y", [("Nivel", "Sentinel Pro Cloud")], Stock: 0),
                    new("ZSEC-ULT-1Y", [("Nivel", "Sentinel Ultimate 24/7 SOC")], Stock: 0)
                ]
            ),
            new(
                Name: "JetBrains All Products Pack Anual",
                Description: "Suscripción comercial anual JetBrains All Products Pack para desarrolladores que incluye IntelliJ IDEA Ultimate, Rider, PyCharm Pro, WebStorm, CLion, DataGrip y herramientas avanzadas de profiling.",
                PriceAmount: 1950000m,
                Category: "software",
                Type: ProductType.Digital,
                ImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("JB-ALLPACK-1Y", [("Licencia", "Suscripción Comercial 1 Año")], Stock: 0)
                ]
            )
        ];

        public static void Seed(IServiceProvider services, ILogger logger)
        {
            var users = services.GetRequiredService<IUserRepository>();
            var warehouses = services.GetRequiredService<IWarehouseRepository>();
            var products = services.GetRequiredService<IProductRepository>();
            var inventories = services.GetRequiredService<IInventoryRepository>();
            var buyers = services.GetRequiredService<IBuyerRepository>();
            var unitOfWork = services.GetRequiredService<IUnitOfWork>();

            // 1. Identificar a Valeria Mendoza (vendedor canónico)
            var valeria = users.GetByEmailAsync(new Email("seller@zentric.local")).GetAwaiter().GetResult();
            var valeriaId = valeria?.Id ?? AdministratorBootstrapper.CanonicalSellerId;

            bool changed = false;

            // 2. Sembrar perfil de Comprador canónico para Andrés Castillo
            var buyerUser = users.GetByEmailAsync(new Email("buyer@zentric.local")).GetAwaiter().GetResult();
            if (buyerUser != null)
            {
                var existingBuyer = buyers.GetByIdAsync(buyerUser.Id).GetAwaiter().GetResult();
                if (existingBuyer is null)
                {
                    var mainAddress = new Address(
                        street: "Carrera 7 # 71-21, Torre B, Piso 8",
                        city: "Bogotá",
                        state: "Cundinamarca",
                        zipCode: "110221",
                        country: "Colombia");
                    var buyer = new Buyer(buyerUser.Id, mainAddress);
                    buyers.AddAsync(buyer).GetAwaiter().GetResult();
                    changed = true;
                    logger.LogInformation("Perfil de Comprador canónico creado para {Email} con ID {BuyerId}", buyerUser.Email.Value, buyer.UserId);
                }
            }

            // 3. Sembrar bodegas (Central Marketplace y Almacén Valeria)
            var existingWarehouses = warehouses.GetAllAsync().GetAwaiter().GetResult();

            var centralWarehouse = existingWarehouses.FirstOrDefault(w => w.Type == WarehouseType.Marketplace);
            if (centralWarehouse is null)
            {
                centralWarehouse = new Warehouse(
                    "Almacén Central Zentric",
                    "Calle 26 # 68C-61, Bogotá D.C., Colombia",
                    50000,
                    WarehouseType.Marketplace,
                    null);
                warehouses.AddAsync(centralWarehouse).GetAwaiter().GetResult();
                changed = true;
                logger.LogInformation("Almacén Central Zentric creado con ID {WarehouseId}", centralWarehouse.Id);
            }

            var valeriaWarehouse = existingWarehouses.FirstOrDefault(w => w.VendorId == valeriaId);
            if (valeriaWarehouse is null)
            {
                valeriaWarehouse = new Warehouse(
                    "Almacén Valeria - TechHub",
                    "Cra 43A # 1-50, Medellín, Antioquia, Colombia",
                    5000,
                    WarehouseType.Vendor,
                    valeriaId);
                warehouses.AddAsync(valeriaWarehouse).GetAwaiter().GetResult();
                changed = true;
                logger.LogInformation("Almacén Valeria - TechHub creado con ID {WarehouseId}", valeriaWarehouse.Id);
            }

            // 4. Sembrar catálogo e inventarios para Valeria Mendoza
            var existingProducts = products.GetAllAsync(vendorId: valeriaId).GetAwaiter().GetResult();

            foreach (var seed in SeedProducts)
            {
                var existing = existingProducts.FirstOrDefault(p => string.Equals(p.Name, seed.Name, StringComparison.OrdinalIgnoreCase));
                if (existing != null)
                {
                    continue;
                }

                var variantTuples = seed.Variants
                    .Select(v => (v.Sku, (IEnumerable<VariantAttribute>)v.Attributes.Select(a => new VariantAttribute(a.Key, a.Value)).ToList()))
                    .ToList();

                var product = new Product(
                    name: seed.Name,
                    description: seed.Description,
                    price: new Money(seed.PriceAmount, "COP"),
                    vendorId: valeriaId,
                    type: seed.Type,
                    variants: variantTuples,
                    imageUrl: seed.ImageUrl);

                // Configurar propiedad Category vía reflexión (retrocompatible con Slice 4)
                typeof(Product).GetProperty("Category")?.SetValue(product, seed.Category);

                products.AddAsync(product).GetAwaiter().GetResult();
                changed = true;

                // Para productos físicos, registrar inventario en el almacén de Valeria
                if (seed.Type == ProductType.Physical && valeriaWarehouse != null)
                {
                    foreach (var variant in product.Variants)
                    {
                        var seedVar = seed.Variants.FirstOrDefault(sv => string.Equals(sv.Sku, variant.Sku, StringComparison.OrdinalIgnoreCase));
                        int stock = seedVar?.Stock ?? 30;

                        var inventory = new Inventory(
                            variantId: variant.Id,
                            warehouseId: valeriaWarehouse.Id,
                            availableQuantity: stock,
                            reservedQuantity: 0,
                            damagedQuantity: 0,
                            usedQuantity: 0);

                        inventories.AddAsync(inventory).GetAwaiter().GetResult();
                    }
                }

                logger.LogInformation("Producto sembrado: {ProductName} ({Type}) con {VariantCount} variantes", product.Name, product.Type, product.Variants.Count);
            }

            if (changed)
            {
                unitOfWork.SaveChangesAsync().GetAwaiter().GetResult();
                logger.LogInformation("Sembrado de catálogo y bodegas persistido exitosamente en base de datos.");
            }
        }
    }
}
