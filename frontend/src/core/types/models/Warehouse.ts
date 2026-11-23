import type { WarehouseType } from '../enums';

/**
 * Bodega (`WarehouseDto`).
 *
 * Origen: `backend/Zentric.Application/Warehouses/Queries/GetWarehousesQuery.cs`.
 * `vendorId` es `Guid?`: las bodegas `Marketplace` no tienen dueño (`null`).
 */
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  type: WarehouseType;
  vendorId: string | null;
  isActive: boolean;
  /** ISO-8601 (DateTime). */
  createdAt: string;
}

/**
 * Alta de bodega (`CreateWarehouseCommand`).
 * `vendorId` es opcional: sólo aplica a bodegas `Vendor`.
 */
export interface CreateWarehouseInput {
  name: string;
  location: string;
  capacity: number;
  type: WarehouseType;
  vendorId: string | null;
}

/**
 * Edición de bodega (`UpdateWarehouseRequest`).
 */
export interface UpdateWarehouseInput {
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
}
