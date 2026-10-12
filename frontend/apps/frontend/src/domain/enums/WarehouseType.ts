/**
 * Naturaleza de una bodega: de la plataforma o del propio vendedor.
 *
 * Origen: `backend/Zentric.Domain/Warehouses/Enum/WarehouseType.cs`
 * (nota: la carpeta del backend es `Enum`, en singular). ADR-0012: en el JSON
 * viaja el NOMBRE, nunca el índice numérico.
 */
export const WarehouseType = {
  Marketplace: 'Marketplace',
  Vendor: 'Vendor',
} as const;

export type WarehouseType = (typeof WarehouseType)[keyof typeof WarehouseType];
