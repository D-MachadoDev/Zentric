using System;
using System.Collections.Generic;
using System.Linq;

namespace Zentric.Domain.Products.ValueObjects
{
    /// <summary>
    /// Lista blanca de divisas que el sistema acepta.
    ///
    /// DECISION DEL OWNER (2026-09-27, Q-16): el sistema sigue siendo
    /// multi-moneda, pero solo admite las divisas declaradas aqui. Antes
    /// aceptaba cualquier codigo de 3 letras, lo que permitia inventar
    /// divisas como "ABC" y mezclarlas dentro de un mismo pedido.
    ///
    /// Para admitir una nueva divisa hay que agregarla explicitamente en
    /// SupportedCurrencies. No se deduce de la longitud del codigo.
    /// </summary>
    public static class SupportedCurrencies
    {
        /// <summary>Divisa por defecto del marketplace.</summary>
        public const string Default = "COP";

        private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
        {
            "COP",
        };

        /// <summary>Divisas habilitadas, en mayusculas.</summary>
        public static IReadOnlyCollection<string> Codes => Allowed.ToArray();

        public static bool IsSupported(string currency)
        {
            return !string.IsNullOrWhiteSpace(currency)
                   && Allowed.Contains(currency.Trim().ToUpperInvariant());
        }

        /// <summary>
        /// Normaliza y valida contra la lista blanca.
        /// Lanza si la divisa no esta habilitada.
        /// </summary>
        public static string Normalize(string currency)
        {
            if (string.IsNullOrWhiteSpace(currency))
            {
                throw new ArgumentException("Currency cannot be empty.", nameof(currency));
            }

            var normalized = currency.Trim().ToUpperInvariant();

            if (normalized.Length != 3)
            {
                throw new ArgumentException(
                    "Currency must be a valid ISO 4217 code, for example COP.", nameof(currency));
            }

            if (!Allowed.Contains(normalized))
            {
                throw new ArgumentException(
                    $"Currency '{normalized}' is not supported. Supported: {string.Join(", ", Allowed)}.",
                    nameof(currency));
            }

            return normalized;
        }
    }

    /// <summary>
    /// Excepcion de negocio para Mixing Currencies. Se distingue de una
    /// excepcion tecnica para que la capa de presentacion la traduzca a un
    /// error de negocio (HTTP 400) en lugar de a un 500.
    /// </summary>
    public sealed class MixedCurrencyException : InvalidOperationException
    {
        public MixedCurrencyException(string currency, string expected)
            : base($"Cannot mix currencies in the same operation: '{expected}' and '{currency}'.")
        {
            Currency = currency;
            Expected = expected;
        }

        public string Currency { get; }
        public string Expected { get; }
    }

    public sealed class Money : IEquatable<Money>
    {
        public decimal Amount { get; private set; }
        public string Currency { get; private set; }

        private Money() { Currency = ""; }

        public Money(decimal amount, string currency)
        {
            if (amount < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(amount), "Amount cannot be negative.");
            }

            // Valida contra la lista blanca de divisas soportadas (Q-16).
            var normalizedCurrency = SupportedCurrencies.Normalize(currency);

            Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
            Currency = normalizedCurrency;
        }

        public Money Add(Money other)
        {
            EnsureSameCurrency(other);
            return new Money(Amount + other.Amount, Currency);
        }

        public Money Subtract(Money other)
        {
            EnsureSameCurrency(other);
            return new Money(Amount - other.Amount, Currency);
        }

        public Money Multiply(int quantity)
        {
            if (quantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity cannot be negative.");
            }

            return new Money(Amount * quantity, Currency);
        }

        public bool Equals(Money? other)
        {
            if (other is null)
            {
                return false;
            }

            return Amount == other.Amount && string.Equals(Currency, other.Currency, StringComparison.OrdinalIgnoreCase);
        }

        public override bool Equals(object? obj)
        {
            return obj is Money other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Amount, StringComparer.OrdinalIgnoreCase.GetHashCode(Currency));
        }

        public override string ToString()
        {
            return $"{Amount:F2} {Currency}";
        }

        private void EnsureSameCurrency(Money other)
        {
            if (!string.Equals(Currency, other.Currency, StringComparison.OrdinalIgnoreCase))
            {
                // Excepcion de negocio: la capa de presentacion la traduce a
                // HTTP 400 con un mensaje accionable, no a un 500.
                throw new MixedCurrencyException(other.Currency, Currency);
            }
        }
    }
}
