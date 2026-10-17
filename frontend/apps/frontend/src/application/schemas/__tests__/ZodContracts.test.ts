import { describe, expect, it } from 'vitest';
import {
  AddCartItemSchema,
  AddStockSchema,
  AdjustInventorySchema,
  AnnulInvoiceSchema,
  CancelGhostStockSchema,
  CreateFulfillmentSchema,
  CreateProductSchema,
  CreateUserSchema,
  CreateWarehouseSchema,
  InspectReturnSchema,
  LoginSchema,
  RequestReturnSchema,
} from '../index';
import { ProductType, UserRole, WarehouseType } from '../../../domain';

describe('Zod Contracts Derived 1:1 from OpenAPI / FluentValidation', () => {
  describe('LoginSchema', () => {
    it('valida credenciales correctas', () => {
      const res = LoginSchema.safeParse({ email: 'admin@zentric.test', password: 'secretpassword' });
      expect(res.success).toBe(true);
    });

    it('rechaza email o password vacíos', () => {
      expect(LoginSchema.safeParse({ email: '', password: 'pwd' }).success).toBe(false);
      expect(LoginSchema.safeParse({ email: 'admin@zentric.test', password: '' }).success).toBe(false);
    });
  });

  describe('CreateUserSchema', () => {
    it('valida datos de alta completos', () => {
      const res = CreateUserSchema.safeParse({
        identityDocument: '1098765432',
        fullName: 'Juan Pérez',
        email: 'juan@test.com',
        password: 'Password123!',
        role: UserRole.Seller,
      });
      expect(res.success).toBe(true);
    });

    it('rechaza roles inexistentes o no permitidos', () => {
      const res = CreateUserSchema.safeParse({
        identityDocument: '1098765432',
        fullName: 'Juan',
        email: 'juan@test.com',
        password: 'Password123!',
        role: 'SuperAdmin' as unknown as UserRole,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('CreateWarehouseSchema', () => {
    it('acepta bodega Marketplace con vendorId nulo', () => {
      const res = CreateWarehouseSchema.safeParse({
        name: 'Bodega Central',
        location: 'Bogotá',
        capacity: 1000,
        type: WarehouseType.Marketplace,
        vendorId: null,
      });
      expect(res.success).toBe(true);
    });

    it('rechaza bodega Marketplace con vendorId asignado', () => {
      const res = CreateWarehouseSchema.safeParse({
        name: 'Bodega Central',
        location: 'Bogotá',
        capacity: 1000,
        type: WarehouseType.Marketplace,
        vendorId: 'vendor-123',
      });
      expect(res.success).toBe(false);
    });

    it('acepta bodega Vendor con vendorId válido', () => {
      const res = CreateWarehouseSchema.safeParse({
        name: 'Bodega Vendedor',
        location: 'Medellín',
        capacity: 500,
        type: WarehouseType.Vendor,
        vendorId: 'vendor-123',
      });
      expect(res.success).toBe(true);
    });

    it('rechaza bodega Vendor sin vendorId', () => {
      const res = CreateWarehouseSchema.safeParse({
        name: 'Bodega Vendedor',
        location: 'Medellín',
        capacity: 500,
        type: WarehouseType.Vendor,
        vendorId: null,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('AddStockSchema', () => {
    it('acepta cantidades enteras positivas', () => {
      const res = AddStockSchema.safeParse({
        variantId: 'var-1',
        warehouseId: 'wh-1',
        quantity: 50,
      });
      expect(res.success).toBe(true);
    });

    it('rechaza cantidades cero o negativas (ZENTRIC.md Dominio 6)', () => {
      expect(AddStockSchema.safeParse({ variantId: 'v-1', warehouseId: 'w-1', quantity: 0 }).success).toBe(false);
      expect(AddStockSchema.safeParse({ variantId: 'v-1', warehouseId: 'w-1', quantity: -5 }).success).toBe(false);
    });
  });

  describe('AdjustInventorySchema', () => {
    it('acepta conteos físicos no negativos con motivo', () => {
      const res = AdjustInventorySchema.safeParse({
        countedQuantity: 0,
        reason: 'Pérdida por rotura en estantería',
      });
      expect(res.success).toBe(true);
    });

    it('rechaza conteos negativos o motivos vacíos', () => {
      expect(AdjustInventorySchema.safeParse({ countedQuantity: -1, reason: 'Test' }).success).toBe(false);
      expect(AdjustInventorySchema.safeParse({ countedQuantity: 10, reason: '   ' }).success).toBe(false);
    });
  });

  describe('CreateProductSchema', () => {
    it('acepta producto físico con variante obligatoria (ADR-0003)', () => {
      const res = CreateProductSchema.safeParse({
        name: 'Teclado Mecánico',
        description: 'Switches rojos',
        priceAmount: 89.99,
        priceCurrency: 'USD',
        type: ProductType.Physical,
        variants: [
          {
            sku: 'TEC-RED-01',
            attributes: [{ name: 'Color', value: 'Negro' }],
          },
        ],
      });
      expect(res.success).toBe(true);
    });

    it('rechaza producto físico sin variantes', () => {
      const res = CreateProductSchema.safeParse({
        name: 'Teclado Mecánico',
        description: 'Switches rojos',
        priceAmount: 89.99,
        priceCurrency: 'USD',
        type: ProductType.Physical,
        variants: [],
      });
      expect(res.success).toBe(false);
    });

    it('acepta producto digital sin variantes', () => {
      const res = CreateProductSchema.safeParse({
        name: 'E-book de Arquitectura',
        description: 'Guía DDD',
        priceAmount: 19.99,
        priceCurrency: 'USD',
        type: ProductType.Digital,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('AddCartItemSchema', () => {
    it('valida parámetros correctos para carrito', () => {
      const res = AddCartItemSchema.safeParse({
        orderId: 'order-1',
        variantId: 'var-1',
        quantity: 2,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('CreateFulfillmentSchema', () => {
    it('valida orden de compra y vendorId', () => {
      const res = CreateFulfillmentSchema.safeParse({
        customerOrderId: 'order-1',
        vendorId: 'vendor-1',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('CancelGhostStockSchema', () => {
    it('valida parámetros de cancelación por quiebre', () => {
      const res = CancelGhostStockSchema.safeParse({
        fulfillmentOrderId: 'ful-1',
        variantId: 'var-1',
        warehouseId: 'wh-1',
        quantityToCancel: 1,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('RequestReturnSchema & InspectReturnSchema', () => {
    it('valida solicitud de devolución', () => {
      const res = RequestReturnSchema.safeParse({
        customerOrderId: 'order-1',
        variantId: 'var-1',
        warehouseId: 'wh-1',
        quantity: 1,
      });
      expect(res.success).toBe(true);
    });

    it('valida dictamen técnico booleano', () => {
      expect(InspectReturnSchema.safeParse({ isGoodCondition: true }).success).toBe(true);
      expect(InspectReturnSchema.safeParse({ isGoodCondition: false }).success).toBe(true);
      expect(InspectReturnSchema.safeParse({ isGoodCondition: 'si' as unknown as boolean }).success).toBe(false);
    });
  });

  describe('AnnulInvoiceSchema', () => {
    it('exige motivo de anulación no vacío', () => {
      expect(AnnulInvoiceSchema.safeParse({ reason: 'Facturación errónea' }).success).toBe(true);
      expect(AnnulInvoiceSchema.safeParse({ reason: '   ' }).success).toBe(false);
    });
  });
});
