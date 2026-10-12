using System;

namespace Zentric.Domain.Buyers.ValueObjects
{
    /// <summary>
    /// Ubicacion geografica estandarizada de una direccion de entrega.
    ///
    /// Referencia: backendSDD/Domain/02-value-objects.md, seccion `Address`
    /// (propiedades Street, City, State, ZipCode, Country) y ZENTRIC.md
    /// Dominio 2, que exige direccion principal obligatoria.
    ///
    /// Inmutable: si el comprador cambia de casa se genera una nueva `Address`,
    /// nunca se muta la existente. No guarda coordenadas ni calcula distancias:
    /// el sistema no modela ubicacion geografica.
    /// </summary>
    public sealed class Address : IEquatable<Address>
    {
        public string Street { get; }
        public string City { get; }
        public string State { get; }
        public string ZipCode { get; }
        public string Country { get; }

        public Address(string street, string city, string state, string zipCode, string country)
        {
            Street = Required(street, nameof(street));
            City = Required(city, nameof(city));
            State = Required(state, nameof(state));
            ZipCode = Required(zipCode, nameof(zipCode));
            Country = Required(country, nameof(country));
        }

        private static string Required(string value, string paramName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Address fields cannot be empty.", paramName);
            }

            return value.Trim();
        }

        public bool Equals(Address? other)
        {
            if (other is null) return false;
            if (ReferenceEquals(this, other)) return true;

            return Street == other.Street
                && City == other.City
                && State == other.State
                && ZipCode == other.ZipCode
                && Country == other.Country;
        }

        public override bool Equals(object? obj) => Equals(obj as Address);

        public override int GetHashCode() => HashCode.Combine(Street, City, State, ZipCode, Country);

        public override string ToString() => $"{Street}, {City}, {State}, {ZipCode}, {Country}";
    }
}