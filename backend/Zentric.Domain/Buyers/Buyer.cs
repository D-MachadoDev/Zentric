
namespace Zentric.Domain.Buyers
{
public sealed class Buyer
    {
        // El Id del Buyer será EXACTAMENTE EL MISMO que el Id del User.
        // Así los conectamos sin mezclar sus datos.
        public Guid UserId { get; init; }

        public string MainAddress { get; private set; } //! Value Object? Podría ser un Value Object de Address, pero por simplicidad lo dejamos como string.
        public List<string> AdditionalAddresses { get; private set; }
        public bool IsActiveForCommerce { get; private set; }
        
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private Buyer()
        {
            MainAddress = null!;
            AdditionalAddresses = new List<string>();
            
        }

        public Buyer(Guid userId, string mainAddress)
        {
            if (string.IsNullOrWhiteSpace(mainAddress))
            {
                throw new ArgumentException("Main address is required.");
            }

            if (userId == Guid.Empty)
            {
                throw new ArgumentException("UserId is required.", nameof(userId));
            }

            UserId = userId; // Vinculamos 1 a 1
            MainAddress = mainAddress;
            AdditionalAddresses = new List<string>();
            
            IsActiveForCommerce = true; // Empieza listo para comprar
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void AdditionalAddress(string address)
        {

            if (string.IsNullOrWhiteSpace(address))
            {
                throw new ArgumentException("Address cannot be empty.");
            }

            AdditionalAddresses.Add(address);
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerAdditionalAddressAdded
        }

        public void RemoveAdditionalAddress(string address)
        {

            if (!AdditionalAddresses.Remove(address))
            {
                throw new InvalidOperationException("Address not found in additional addresses.");
            }

            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerAdditionalAddressRemoved
        }

        public void UpdateMainAddress(string newAddress)
        {

            if (string.IsNullOrWhiteSpace(newAddress))
            {
                throw new ArgumentException("New main address cannot be empty.");
            }

            MainAddress = newAddress;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerMainAddressUpdated
        }

        public void SuspendCommerceActivity()
        {

            if (!IsActiveForCommerce)
            {
                throw new InvalidOperationException("Buyer is already inactive for commerce.");
            }

            IsActiveForCommerce = false;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerCommerceSuspended
        }
        public void ResumeCommerceActivity()
        {
            if (IsActiveForCommerce)
            {
                throw new InvalidOperationException("Buyer is already active for commerce.");
            }

            IsActiveForCommerce = true;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerCommerceResumed
        }

        

        

    }
}
