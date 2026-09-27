namespace Zentric.Domain.Products.ValueObjects
{
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

            if (string.IsNullOrWhiteSpace(currency))
            {
                throw new ArgumentException("Currency cannot be empty.", nameof(currency));
            }

            var normalizedCurrency = currency.Trim().ToUpperInvariant();

            if (normalizedCurrency.Length != 3)
            {
                throw new ArgumentException("Currency must be a valid ISO code like USD, EUR, COP.", nameof(currency));
            }

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
                throw new InvalidOperationException("Cannot operate with different currencies.");
            }
        }
    }
}
