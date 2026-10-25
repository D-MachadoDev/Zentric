namespace Zentric.Infrastructure.Persistence.Models
{
    /// <summary>
    /// Un registro de auditoria por cada ajuste a la baja.
    ///
    /// ADR-0021 decision 5: todo ajuste deja actor, motivo escrito y fecha,
    /// siempre. Inmutable por construccion, igual que su contraparte de
    /// dominio: un registro de auditoria editable no audita nada.
    /// </summary>
    public class StockAdjustmentDbModel
    {
        public Guid Id { get; set; }
        public Guid InventoryId { get; set; }
        public int SystemQuantity { get; set; }
        public int PhysicalQuantity { get; set; }
        public Guid CountedBy { get; set; }
        public string Reason { get; set; } = null!;
        public DateTime CountedAt { get; set; }
    }
}
