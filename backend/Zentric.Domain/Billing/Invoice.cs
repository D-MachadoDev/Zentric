using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Billing
{
    /// <summary>
    /// Policy de comision de la plataforma.
    ///
    /// DECISION DEL OWNER (2026-09-27, Q-15): la Ley funcional (ZENTRIC.md,
    /// Dominio 9) define que existe un "Detalle Zentric" y una "Factura de
    /// Vendedor" por split, pero NO fija el porcentaje NI el reparto entre
    /// plataforma y vendedor.
    ///
    /// Mientras el reparto no este definido, el sistema **calcula** la
    /// comision para poder mostrarla, pero **no la cobra**: el resultado queda
    /// marcado como estimado y bloqueado. Nadie paga un numero que invento el
    /// agente.
    ///
    /// Para habilitar el cobro hay que llamar a Ratify(), que exige un reparto
    /// explicito. Hasta entonces, IsCollectable es false.
    /// </summary>
    public sealed record PlatformFeePolicy
    {
        /// <summary>
        /// Porcentaje por defecto. SUPUESTO, no regla de la Ley.
        /// Se usa solo para estimar mientras el reparto no este ratificado.
        /// </summary>
        public const decimal DefaultPercentage = 0.05m;

        public decimal Percentage { get; }

        /// <summary>
        /// Reparto definido por el Owner entre plataforma y vendedor.
        /// Null mientras no exista dictamen.
        /// </summary>
        public FeeSplit? Split { get; }

        /// <summary>
        /// True solo cuando el Owner ratifico el reparto y el cobro es real.
        /// </summary>
        public bool IsCollectable => Split is not null;

        private PlatformFeePolicy(decimal percentage, FeeSplit? split)
        {
            if (percentage < 0m || percentage > 1m)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(percentage),
                    "Platform fee percentage must be between 0 and 1.");
            }

            Percentage = percentage;
            Split = split;
        }

        public PlatformFeePolicy(decimal percentage) : this(percentage, null) { }

        /// <summary>Politica vigente. Sin Split: el cobro esta bloqueado.</summary>
        public static PlatformFeePolicy Current { get; } = new(DefaultPercentage);

        /// <summary>
        /// Registra el reparto ratificado por el Owner y habilita el cobro.
        /// No usar hasta que exista el dictamen (Q-15).
        /// </summary>
        public static PlatformFeePolicy Ratify(decimal percentage, FeeSplit split)
            => new(percentage, split ?? throw new ArgumentNullException(nameof(split)));

        /// <summary>
        /// Calcula la comision sobre un importe, conservando la moneda y
        /// redondeando a dos decimales.
        /// </summary>
        public Money ApplyTo(Money amount)
        {
            ArgumentNullException.ThrowIfNull(amount);
            return new Money(Math.Round(amount.Amount * Percentage, 2, MidpointRounding.AwayFromZero),
                            amount.Currency);
        }
    }

    /// <summary>
    /// Reparto de una venta entre la plataforma y el vendedor.
    /// Invariante: las dos partes suman 1.
    /// </summary>
    public sealed record FeeSplit
    {
        public FeeSplit(decimal platformShare, decimal vendorShare)
        {
            if (platformShare < 0m || platformShare > 1m)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(platformShare), "Share must be between 0 and 1.");
            }

            if (vendorShare < 0m || vendorShare > 1m)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(vendorShare), "Share must be between 0 and 1.");
            }

            if (Math.Abs((platformShare + vendorShare) - 1m) > 0.0001m)
            {
                throw new ArgumentException("Platform and vendor shares must sum to 1.");
            }

            PlatformShare = platformShare;
            VendorShare = vendorShare;
        }

        public decimal PlatformShare { get; }
        public decimal VendorShare { get; }
    }

    public sealed class Invoice
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid? VendorId { get; private set; } // Null if it's the Master invoice
        public InvoiceType Type { get; private set; }
        public Money TotalAmount { get; private set; }
        public DateTime IssuedAt { get; private set; }

        private Invoice() { TotalAmount = null!; }

        // Factura Maestra para el cliente (Comprador)
        public static Invoice CreateMaster(Guid customerOrderId, Money totalAmount)
        {
            ArgumentNullException.ThrowIfNull(totalAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = null,
                Type = InvoiceType.Master,
                TotalAmount = totalAmount,
                IssuedAt = DateTime.UtcNow
            };
        }

        // Factura detalle/split para el vendedor específico
        public static Invoice CreateVendorDetail(Guid customerOrderId, Guid vendorId, Money vendorTotalAmount)
        {
            ArgumentNullException.ThrowIfNull(vendorTotalAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");
            if (vendorId == Guid.Empty) throw new ArgumentException("Vendor ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = vendorId,
                Type = InvoiceType.VendorDetail,
                TotalAmount = vendorTotalAmount,
                IssuedAt = DateTime.UtcNow
            };
        }

        // Factura detalle para la plataforma Zentric (Comisiones/Fees)
        public static Invoice CreateZentricDetail(Guid customerOrderId, Money zentricFeeAmount)
        {
            ArgumentNullException.ThrowIfNull(zentricFeeAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = null,
                Type = InvoiceType.ZentricDetail,
                TotalAmount = zentricFeeAmount,
                IssuedAt = DateTime.UtcNow
            };
        }
    }
}

