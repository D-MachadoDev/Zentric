import { describe, expect, it } from 'vitest';
import { validateReturnRequest } from './returnValidation';

describe('validateReturnRequest', () => {
  it('rejects a quantity greater than the delivered line quantity', () => {
    expect(
      validateReturnRequest({
        orderId: 'order-1',
        variantId: 'variant-1',
        quantity: 3,
        purchasedQuantity: 2,
        acceptedTerms: true,
      }),
    ).toBe('La cantidad no puede superar las unidades entregadas en este pedido.');
  });

  it('requires a delivered order, an item, a positive quantity, and terms acceptance', () => {
    expect(
      validateReturnRequest({
        orderId: '',
        variantId: '',
        quantity: 0,
        purchasedQuantity: 0,
        acceptedTerms: false,
      }),
    ).toBe('Selecciona un pedido entregado y un artículo antes de continuar.');
  });

  it('accepts a valid request at the purchased quantity limit', () => {
    expect(
      validateReturnRequest({
        orderId: 'order-1',
        variantId: 'variant-1',
        quantity: 2,
        purchasedQuantity: 2,
        acceptedTerms: true,
      }),
    ).toBeNull();
  });
});
