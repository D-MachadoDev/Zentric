import { describe, expect, it } from 'vitest';
import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
  ProductStatus,
  ProductType,
  ReturnStatus,
  UserRole,
  WarehouseType,
} from './enums';
import { ApiError, isApiError } from './models';

// Estos tests fijan el contrato de ADR-0012 como red de seguridad. Un enum
// publicado con índices numéricos en vez de nombres, o con un valor de menos,
// no falla en compilación: el backend responde 400 o, peor, se da de alta el
// rol equivocado en silencio. Aquí el fallo es inmediato y evidente.

const allEnums = {
  UserRole,
  OrderStatus,
  ProductType,
  ProductStatus,
  WarehouseType,
  FulfillmentStatus,
  ReturnStatus,
  InvoiceType,
};

describe('Enums del dominio (ADR-0012)', () => {
  it('transporta NOMBRES de texto y jamas índices numéricos', () => {
    for (const [name, enumObject] of Object.entries(allEnums)) {
      for (const value of Object.values(enumObject)) {
        expect(typeof value, `${name} debe ser texto, no número`).toBe('string');
      }
    }
  });

  it('UserRole declara los cinco roles exactos del backend', () => {
    expect(Object.values(UserRole)).toEqual([
      'Buyer',
      'Seller',
      'Administrator',
      'Supervisor',
      'LogisticsOperator',
    ]);
  });

  it('OrderStatus declara los seis estados exactos del backend', () => {
    expect(Object.values(OrderStatus)).toEqual([
      'Cart',
      'PendingPayment',
      'Paid',
      'Dispatched',
      'Delivered',
      'Cancelled',
    ]);
  });

  it('ReturnStatus usa los literales del backend, no la prosa "Solicitada"', () => {
    expect(Object.values(ReturnStatus)).toEqual([
      'Requested',
      'Approved',
      'Rejected',
      'Refunded',
    ]);
  });

  it('ProductStatus cubre los tres estados de ZENTRIC.md Dominio 5', () => {
    expect(Object.values(ProductStatus)).toEqual([
      'Published',
      'Suspended',
      'Discontinued',
    ]);
  });

  it('InvoiceType refleja el split de facturación Q-18', () => {
    expect(Object.values(InvoiceType)).toEqual([
      'Master',
      'ZentricDetail',
      'VendorDetail',
    ]);
  });

  it('WarehouseType distingue bodega de la plataforma de la del vendedor', () => {
    expect(Object.values(WarehouseType)).toEqual(['Marketplace', 'Vendor']);
  });

  it('ProductType separa lo físico de lo digital', () => {
    expect(Object.values(ProductType)).toEqual(['Physical', 'Digital']);
  });

  it('FulfillmentStatus cubre el ciclo del ADDENDUM Dominio 8', () => {
    expect(Object.values(FulfillmentStatus)).toEqual([
      'PendingPack',
      'Packed',
      'Dispatched',
      'Delivered',
      'Cancelled',
    ]);
  });
});

describe('ApiError (Frontend-Architecture §5)', () => {
  it('expone el ProblemDetails del servidor como mensaje apto para el usuario', () => {
    const error = new ApiError(409, 'El documento ya está registrado.');

    expect(error.userMessage).toBe('El documento ya está registrado.');
    expect(error.status).toBe(409);
    expect(error.traceId).toBeUndefined();
  });

  it('conserva el traceId para soporte cuando el servidor lo envía (5xx)', () => {
    const error = new ApiError(500, 'Fallo interno.', 'abc-123');

    expect(error.traceId).toBe('abc-123');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
  });

  it('distingue un ApiError de un error genérico', () => {
    expect(isApiError(new ApiError(401, 'Sesión expirada.'))).toBe(true);
    expect(isApiError(new Error('Sesión expirada.'))).toBe(false);
  });
});
