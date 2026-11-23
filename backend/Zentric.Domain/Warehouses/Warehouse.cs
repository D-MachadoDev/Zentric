using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Domain.Warehouses
{
    public class Warehouse
    {
        public Guid Id { get; init; }
        public string Name { get; private set; }
        public string Location { get; private set; }
        public int Capacity { get; private set; }
        public WarehouseType Type { get; private set; }
        public Guid? VendorId { get; init; } // Opcional (nulo si es de Zentric)
        public bool IsActive { get; private set; }
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
                throw new ArgumentException("El nombre de la bodega es obligatorio.", nameof(name));
            }

            if (string.IsNullOrWhiteSpace(location))
            {
                throw new ArgumentException("La ubicación de la bodega es obligatoria.", nameof(location));
            }

            if (capacity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(capacity), "La capacidad no puede ser negativa.");
            }

            if (type == WarehouseType.Marketplace && vendorId.HasValue)
            {
                throw new InvalidOperationException("Las bodegas del marketplace no pueden tener un vendedor asignado.");
            }

            if (type == WarehouseType.Vendor && !vendorId.HasValue)
            {
                throw new InvalidOperationException("Las bodegas de vendedor deben tener el identificador del vendedor propietario.");
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
                throw new InvalidOperationException("No se puede renombrar una bodega eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("No se puede renombrar una bodega inactiva.");
            }

            if (string.IsNullOrWhiteSpace(newName))
            {
                throw new ArgumentException("El nombre de la bodega es inválido.");
            }

            Name = newName.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void Relocate(string newLocation)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede mover una bodega eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("No se puede cambiar la ubicación de una bodega inactiva.");
            }

            if (string.IsNullOrWhiteSpace(newLocation))
            {
                throw new ArgumentException("La ubicación de la bodega es inválida.");
            }

            Location = newLocation.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void ExpandCapacity(int addedCapacity)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede ampliar la capacidad de una bodega eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("No se puede ampliar la capacidad de una bodega inactiva.");
            }

            if (addedCapacity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(addedCapacity), "La capacidad agregada no puede ser negativa.");
            }

            Capacity += addedCapacity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void NewCapacity(int newCapacity)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede cambiar la capacidad de una bodega eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("No se puede cambiar la capacidad de una bodega inactiva.");
            }

            if (newCapacity < 0)
            {
                throw new ArgumentException("La capacidad de la bodega es inválida.");
            }

            Capacity = newCapacity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Activate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede activar una bodega eliminada.");
            }

            if (IsActive)
            {
                throw new InvalidOperationException("La bodega ya está activa.");
            }

            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deactivate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede desactivar una bodega eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("La bodega ya está inactiva.");
            }

            IsActive = false;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("La bodega ya está eliminada.");
            }

            DeletedAt = DateTime.UtcNow;
            IsActive = false;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("La bodega no está eliminada.");
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



