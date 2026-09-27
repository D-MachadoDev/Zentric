using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Domain.Warehouses
{
    public class Warehouse
    {
        public Guid Id { get; init; }
        public string Name { get; private set; }
        public string Location { get; private set; } // Value object GLOBAL
        public int Capacity { get; private set; }
        public WarehouseType Type { get; private set; }
        public Guid? VendorId { get; init; } // Opcional (nulo si es de Zentric)
        public bool IsActive { get; private set; } // puede ser un enum close open active inactive mantenimiento
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }

        public bool IsDeleted => DeletedAt.HasValue;

        // Para EF Core
        private Warehouse()
        {
            Name = null!;
            Location = null!;
        }

        public Warehouse(string name, string location, int capacity, WarehouseType type, Guid? vendorId)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Warehouse name is required.", nameof(name));
            }

            if (string.IsNullOrWhiteSpace(location))
            {
                throw new ArgumentException("Warehouse location is required.", nameof(location));
            }

            if (capacity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity cannot be negative.");
            }

            if (type == WarehouseType.Marketplace && vendorId.HasValue)
            {
                throw new InvalidOperationException("Marketplace warehouses cannot have a seller assigned.");
            }

            if (type == WarehouseType.Vendor && !vendorId.HasValue)
            {
                throw new InvalidOperationException("Seller warehouses must have the owner seller ID.");
            }

            Id = Guid.NewGuid();
            Name = name.Trim();
            Location = location.Trim();
            Capacity = capacity;
            Type = type;
                        this.VendorId = vendorId;
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
            DeletedAt = null;
        }

        public void Rename(string newName)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot rename a deleted warehouse.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot rename an inactive warehouse.");
            }

            if (string.IsNullOrWhiteSpace(newName))
            {
                throw new ArgumentException("Warehouse name is invalid.");
            }

            Name = newName.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void Relocate(string newLocation)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot move a deleted warehouse.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot change the location of an inactive warehouse.");
            }

            if (string.IsNullOrWhiteSpace(newLocation))
            {
                throw new ArgumentException("Warehouse location is invalid.");
            }

            Location = newLocation.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void ExpandCapacity(int addedCapacity) // Aunque son propias puede ir en la seccion servicios noe estoy seguro revisemos bien que es un servicio
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot expand the capacity of a deleted warehouse.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot expand the capacity of an inactive warehouse.");
            }

            if (addedCapacity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(addedCapacity), "Added capacity cannot be negative.");
            }

            Capacity += addedCapacity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void NewCapacity(int newCapacity)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot change the capacity of a deleted warehouse.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot change the capacity of an inactive warehouse.");
            }

            if (newCapacity < 0)
            {
                throw new ArgumentException("Warehouse capacity is invalid.");
            }

            Capacity = newCapacity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Activate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot activate a deleted warehouse.");
            }

            if (IsActive)
            {
                throw new InvalidOperationException("Warehouse is already active.");
            }

            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deactivate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot deactivate a deleted warehouse.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Warehouse is already inactive.");
            }

            IsActive = false;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Warehouse is already deleted.");
            }

            DeletedAt = DateTime.UtcNow;
            IsActive = false;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("Warehouse is not deleted.");
            }

            DeletedAt = null;
            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsDeleted()
        {
            Delete();
        }
    }
}



