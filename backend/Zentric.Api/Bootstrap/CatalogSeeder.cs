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
    /// Sembrado de catálogo multicategoría (Hogar, Moda, Supermercado, Deportes, Tecnología, Audio y Digital)
    /// con precios diferenciados por SKU, bodegas e inventarios asociados a Valeria Mendoza y el marketplace.
    /// </summary>
    public static class CatalogSeeder
    {
        private sealed record VariantSeed(string Sku, (string Key, string Value)[] Attributes, int Stock, decimal PriceAmount);

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
            // 1-3. Categoría: Hogar & Electrodomésticos
            // ==========================================
            new(
                Name: "Cafetera Espresso Barista Pro Acero Inoxidable",
                Description: "Cafetera espresso automática con molino cónico integrado de 15 niveles, bomba italiana de 15 bares y vaporizador profesional para latte art en casa.",
                PriceAmount: 1890000m,
                Category: "hogar",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("CAF-BARISTA-SLV", [("Color", "Acero Cepillado"), ("Capacidad", "Tanque 2.0L")], Stock: 35, PriceAmount: 1890000m),
                    new("CAF-BARISTA-BLK", [("Color", "Negro Obsidiana"), ("Capacidad", "Tanque 2.5L + Jarra Térmica")], Stock: 25, PriceAmount: 2150000m)
                ]
            ),
            new(
                Name: "Freidora de Aire Digital Dual Zone 9L Smart",
                Description: "Freidora sin aceite de doble canasta independiente con 8 programas inteligentes, ventana panorámica iluminada y recubrimiento cerámico antiadherente libre de PTFE.",
                PriceAmount: 649000m,
                Category: "hogar",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("AIRFRY-6L-STD", [("Capacidad", "6.5 Litros Familiar"), ("Color", "Negro Mate")], Stock: 45, PriceAmount: 649000m),
                    new("AIRFRY-9L-DUAL", [("Capacidad", "9.0 Litros Doble Zona"), ("Color", "Acero Grafito")], Stock: 30, PriceAmount: 829000m)
                ]
            ),
            new(
                Name: "Aspiradora Robot Inteligente LiDAR Mapping & Mop",
                Description: "Robot aspirador y trapeador con navegación láser LiDAR 360°, base de autovaciado de 60 días, potencia de succión de 6000 Pa y control multimapa por aplicación.",
                PriceAmount: 1590000m,
                Category: "hogar",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("ROBO-LIDAR-STD", [("Versión", "Robot + Base Carga Rápida"), ("Color", "Blanco Ártico")], Stock: 30, PriceAmount: 1590000m),
                    new("ROBO-LIDAR-DOCK", [("Versión", "Robot + Estación Autovaciado"), ("Color", "Negro Titanio")], Stock: 20, PriceAmount: 2290000m)
                ]
            ),

            // ==========================================
            // 4-5. Categoría: Moda, Calzado & Equipaje
            // ==========================================
            new(
                Name: "Tenis Running Ultralight Carbon Pulse",
                Description: "Calzado deportivo de alto retorno de energía con placa de propulsión en fibra de carbono, tejido transpirable engineered mesh y suela de tracción en asfalto húmedo.",
                PriceAmount: 489000m,
                Category: "moda",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("RUN-PULSE-40-RED", [("Talla", "EU 40 / US 8"), ("Color", "Rojo Carmesí")], Stock: 40, PriceAmount: 489000m),
                    new("RUN-PULSE-42-JADE", [("Talla", "EU 42 / US 9.5"), ("Color", "Jade Nocturno Edición Pro")], Stock: 35, PriceAmount: 539000m)
                ]
            ),
            new(
                Name: "Morral Urbano Impermeable Antirrobo Traveller",
                Description: "Mochila ergonómica impermeable con compartimento acolchado para portátil de hasta 16 pulgadas, cierre oculto TSA, puerto de carga integrado y espaldar termoformado.",
                PriceAmount: 279000m,
                Category: "moda",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("BAG-TRAV-20L-BLK", [("Capacidad", "20L Diario"), ("Color", "Negro Carbón")], Stock: 50, PriceAmount: 279000m),
                    new("BAG-TRAV-32L-OLV", [("Capacidad", "32L Expandible Viaje"), ("Color", "Verde Oliva")], Stock: 35, PriceAmount: 349000m)
                ]
            ),

            // ==========================================
            // 6-7. Categoría: Supermercado, Café & Despensa
            // ==========================================
            new(
                Name: "Café Especial de Origen Huila Reserva Tostión Media",
                Description: "Café 100% arábica de altura cultivado a 1.850 msnm en el sur del Huila, notas sensoriales a cacao dulce, panela y frutos rojos, recién tostado en lotes pequeños.",
                PriceAmount: 58000m,
                Category: "supermercado",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("CAFE-HUILA-500G-GRN", [("Presentación", "500g en Grano"), ("Tostión", "Media Balanceada")], Stock: 60, PriceAmount: 58000m),
                    new("CAFE-HUILA-1500G-MOL", [("Presentación", "1.5 Kg Molido Reserva"), ("Tostión", "Media Gourmet")], Stock: 45, PriceAmount: 149000m)
                ]
            ),
            new(
                Name: "Aceite de Oliva Extra Virgen Prensado en Frío",
                Description: "Aceite de oliva extra virgen de primera extracción en frío con acidez menor a 0.2%, ideal para aderezos mediterráneos, alta cocina y mesa gourmet.",
                PriceAmount: 69000m,
                Category: "supermercado",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("OLIVA-EV-750ML", [(" Contenido", "Botella Vidrio Oscuro 750ml")], Stock: 50, PriceAmount: 69000m),
                    new("OLIVA-EV-3L-TIN", [("Contenido", "Lata Familiar Cosecha 3 Litros")], Stock: 30, PriceAmount: 229000m)
                ]
            ),

            // ==========================================
            // 8-9. Categoría: Deportes & Fitness
            // ==========================================
            new(
                Name: "Set de Mancuernas Ajustables Pro Selectorized",
                Description: "Par de mancuernas de ajuste rápido por dial mecánico que reemplaza 15 pares tradicionales, recubrimiento silencioso de uretano y base ergonómica antideslizante.",
                PriceAmount: 790000m,
                Category: "deportes",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("GYM-DUMB-24KG", [("Rango de Peso", "2.5 a 24 Kg (Individual)"), ("Color", "Negro / Rojo")], Stock: 35, PriceAmount: 790000m),
                    new("GYM-DUMB-40KG-PAIR", [("Rango de Peso", "Set Doble 5 a 40 Kg + Rack"), ("Color", "Negro Acero")], Stock: 20, PriceAmount: 1680000m)
                ]
            ),
            new(
                Name: "Bicicleta Todoterreno MTB Aluminio 29\" Hidráulica",
                Description: "Bicicleta de montaña rin 29 con marco en aleación de aluminio hidroformado, transmisión de 12 velocidades, suspensión delantera con bloqueo remoto y frenos de disco hidráulicos.",
                PriceAmount: 2450000m,
                Category: "deportes",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("MTB-29-M-GRY", [("Talla Marco", "M (1.65m - 1.78m)"), ("Color", "Gris Titanio")], Stock: 25, PriceAmount: 2450000m),
                    new("MTB-29-L-PRO", [("Talla Marco", "L (1.78m - 1.90m) Suspensión Aire"), ("Color", "Verde Esmeralda")], Stock: 20, PriceAmount: 2890000m)
                ]
            ),

            // ==========================================
            // 10-12. Categoría: Tecnología, Computación & Audio
            // ==========================================
            new(
                Name: "MacBook Pro 16\" M3 Max Liquid Retina XDR",
                Description: "Portátil profesional Apple con chip M3 Max, pantalla Liquid Retina XDR de 120Hz con ProMotion, chasis de aluminio reciclado y batería de hasta 22 horas.",
                PriceAmount: 14200000m,
                Category: "tecnologia",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("MBP16-36-1TB-BLK", [("Configuración", "36GB RAM / 1TB SSD"), ("Color", "Space Black")], Stock: 30, PriceAmount: 14200000m),
                    new("MBP16-48-2TB-SLV", [("Configuración", "48GB RAM / 2TB SSD"), ("Color", "Plata Estelar")], Stock: 20, PriceAmount: 16900000m)
                ]
            ),
            new(
                Name: "Auriculares Sony WH-1000XM5 Noise Cancelling",
                Description: "Audífonos inalámbricos de diadema con cancelación activa de ruido de doble procesador, audio Hi-Res LDAC, carga ultrarrápida USB-C y 30 horas de batería.",
                PriceAmount: 1590000m,
                Category: "audio",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("SONY-XM5-BLK", [("Color", "Negro Mate"), ("Accesorios", "Estuche Estándar")], Stock: 40, PriceAmount: 1590000m),
                    new("SONY-XM5-SLV-DAC", [("Color", "Plata Platino"), ("Accesorios", "Estuche + Adaptador Hi-Res")], Stock: 30, PriceAmount: 1740000m)
                ]
            ),
            new(
                Name: "Smart TV 65\" 4K OLED Ambilight Cinema 120Hz",
                Description: "Televisor inteligente OLED 4K Ultra HD de 65 pulgadas con negros puros, Dolby Vision IQ, sonido envolvente Dolby Atmos de 60W y puertos HDMI 2.1.",
                PriceAmount: 5490000m,
                Category: "tecnologia",
                Type: ProductType.Physical,
                ImageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("TV-OLED-55-4K", [("Tamaño", "55 Pulgadas 4K 120Hz")], Stock: 30, PriceAmount: 4390000m),
                    new("TV-OLED-65-4K", [("Tamaño", "65 Pulgadas 4K 120Hz + Soporte Pared")], Stock: 25, PriceAmount: 5490000m)
                ]
            ),

            // ==========================================
            // 13-14. Categoría: Suscripciones & Productos Digitales
            // ==========================================
            new(
                Name: "Membresía Zentric Prime & Entretenimiento Anual",
                Description: "Suscripción digital con envíos prioritarios ilimitados, acceso a cine y series 4K en streaming, música sin anuncios y descuentos exclusivos todo el año.",
                PriceAmount: 189000m,
                Category: "digital",
                Type: ProductType.Digital,
                ImageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("ZPRIME-IND-1Y", [("Plan", "Individual 12 Meses (Entrega Inmediata)")], Stock: 0, PriceAmount: 189000m),
                    new("ZPRIME-FAM-1Y", [("Plan", "Familiar 6 Perfiles 12 Meses")], Stock: 0, PriceAmount: 299000m)
                ]
            ),
            new(
                Name: "Tarjeta de Regalo Digital Multi-Tienda Zentric",
                Description: "Bono digital redimible al instante en cualquier categoría del marketplace (Hogar, Moda, Supermercado, Deportes o Tecnología) con código enviado al correo.",
                PriceAmount: 200000m,
                Category: "digital",
                Type: ProductType.Digital,
                ImageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
                Variants:
                [
                    new("GIFT-ZENTRIC-200K", [("Cupo", "Bono Digital $200.000 COP")], Stock: 0, PriceAmount: 200000m),
                    new("GIFT-ZENTRIC-500K", [("Cupo", "Bono Digital $500.000 COP")], Stock: 0, PriceAmount: 500000m)
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
                    "Centro de Distribución Valeria Multicategoría",
                    "Cra 43A # 1-50, Medellín, Antioquia, Colombia",
                    5000,
                    WarehouseType.Vendor,
                    valeriaId);
                warehouses.AddAsync(valeriaWarehouse).GetAwaiter().GetResult();
                changed = true;
                logger.LogInformation("Almacén Valeria creado con ID {WarehouseId}", valeriaWarehouse.Id);
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
                    imageUrl: seed.ImageUrl,
                    category: seed.Category);

                // Configurar propiedad Category vía reflexión (retrocompatible con Slice 4)
                typeof(Product).GetProperty("Category")?.SetValue(product, seed.Category);

                // Asignar precio propio a cada SKU de la variante
                foreach (var variant in product.Variants)
                {
                    var seedVar = seed.Variants.FirstOrDefault(sv => string.Equals(sv.Sku, variant.Sku, StringComparison.OrdinalIgnoreCase));
                    if (seedVar != null && seedVar.PriceAmount > 0)
                    {
                        variant.SetPrice(seedVar.PriceAmount);
                    }
                }

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
