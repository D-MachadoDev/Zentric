import { describe, expect, it } from 'vitest';
import { ProductType, UserRole, WarehouseType } from '../../domain';
import {
  IngresarExistenciasSchema,
  RegistrarBodegaSchema,
  RegistrarProductoSchema,
  RegistrarUsuarioSchema,
} from './index';

describe('Esquemas de formulario (Q13)', () => {
  it('acepta un alta de usuario completa', () => {
    const resultado = RegistrarUsuarioSchema.safeParse({
      identityDocument: '12345678',
      fullName: 'Ana Vega',
      email: 'ana@zentric.dev',
      password: 'secret',
      role: UserRole.Buyer,
    });

    expect(resultado.success).toBe(true);
  });

  it('rechaza un rol que no sea un nombre de enum (ADR-0012)', () => {
    const resultado = RegistrarUsuarioSchema.safeParse({
      identityDocument: '12345678',
      fullName: 'Ana Vega',
      email: 'ana@zentric.dev',
      password: 'secret',
      // El backend sólo acepta el nombre; un entero responde 400.
      role: 1,
    });

    expect(resultado.success).toBe(false);
  });

  it('INV-01: rechaza una cantidad de existencias no positiva', () => {
    const resultado = IngresarExistenciasSchema.safeParse({
      variantId: 'v-1',
      warehouseId: 'w-1',
      quantity: 0,
    });

    expect(resultado.success).toBe(false);
  });

  it('acepta un producto Digital sin variantes (ADR-0003)', () => {
    const resultado = RegistrarProductoSchema.safeParse({
      name: 'Informe anual',
      description: 'PDF',
      priceAmount: 9.99,
      priceCurrency: 'USD',
      type: ProductType.Digital,
    });

    expect(resultado.success).toBe(true);
  });

  it('exige importe y moneda por separado, no un "precio" único', () => {
    const resultado = RegistrarProductoSchema.safeParse({
      name: 'Cafetera',
      description: 'Prensa',
      // Falta priceCurrency: el contrato del backend no admite un precio sin moneda.
      priceAmount: 49.9,
      type: ProductType.Physical,
    });

    expect(resultado.success).toBe(false);
  });

  it('CAT-03: un producto físico sin variantes se rechaza en el cliente (ADR-0003)', () => {
    const resultado = RegistrarProductoSchema.safeParse({
      name: 'Cafetera',
      description: 'Prensa',
      priceAmount: 49.9,
      priceCurrency: 'COP',
      type: ProductType.Physical,
    });

    expect(resultado.success).toBe(false);
  });

  it('CAT-03: un producto físico con una variante se acepta', () => {
    const resultado = RegistrarProductoSchema.safeParse({
      name: 'Camiseta',
      description: 'Algodón',
      priceAmount: 39.9,
      priceCurrency: 'COP',
      type: ProductType.Physical,
      variants: [{ sku: 'CAM-M', attributes: [{ name: 'Talla', value: 'M' }] }],
    });

    expect(resultado.success).toBe(true);
  });

  it('una bodega Vendor sin dueño se rechaza en el cliente (feedback del servidor)', () => {
    // `CreateWarehouseCommandValidator` responde 400 en este caso; aquí es sólo
    // feedback inmediato, la autoridad sigue siendo el backend.
    const resultado = RegistrarBodegaSchema.safeParse({
      name: 'Del vendedor',
      location: 'Medellín',
      capacity: 40,
      type: WarehouseType.Vendor,
      vendorId: null,
    });

    expect(resultado.success).toBe(false);
  });

  it('una bodega Marketplace no admite dueño', () => {
    const resultado = RegistrarBodegaSchema.safeParse({
      name: 'Central',
      location: 'Bogotá',
      capacity: 200,
      type: WarehouseType.Marketplace,
      vendorId: 'vendedor-1',
    });

    expect(resultado.success).toBe(false);
  });

  it('acepta una bodega Marketplace sin dueño, que es su forma natural', () => {
    const resultado = RegistrarBodegaSchema.safeParse({
      name: 'Central',
      location: 'Bogotá',
      capacity: 200,
      type: WarehouseType.Marketplace,
      vendorId: null,
    });

    expect(resultado.success).toBe(true);
  });
});
