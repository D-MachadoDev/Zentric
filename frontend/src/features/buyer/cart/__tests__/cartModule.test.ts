import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ZentricApiPort } from '../../../../core';
import {
  GuestCartItemSchema,
  type GuestCartItem,
  GUEST_CART_KEY,
  getGuestCartItems,
  getGuestCartCount,
  saveGuestCartItems,
  addGuestCartItem,
  updateGuestCartItemQuantity,
  removeGuestCartItem,
  clearGuestCart,
  setPendingGuestCheckout,
  hasPendingGuestCheckout,
  consumePendingGuestCheckout,
  subscribeGuestCart,
  syncGuestCartToBackend,
} from '../index';

describe('cartModule - Architecture & Validation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const validItem: GuestCartItem = {
    variantId: 'var-123',
    productId: 'prod-456',
    productName: 'Teclado Mecánico Zentric',
    sku: 'ZENT-KB-01',
    unitPrice: 120.5,
    currency: 'USD',
    quantity: 2,
    imageUrl: 'https://example.com/keyboard.jpg',
    vendorName: 'Zentric Tech',
  };

  describe('GuestCartItemSchema (Zod validation)', () => {
    it('valida un ítem completo y trimea cadenas con espacios', () => {
      const input = {
        ...validItem,
        productName: '  Teclado Mecánico Zentric  ',
        sku: '  ZENT-KB-01 ',
      };
      const result = GuestCartItemSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productName).toBe('Teclado Mecánico Zentric');
        expect(result.data.sku).toBe('ZENT-KB-01');
      }
    });

    it('permite ítems sin campos opcionales imageUrl y vendorName', () => {
      const minimalItem = {
        variantId: 'var-min',
        productId: 'prod-min',
        productName: 'Minimal Product',
        sku: 'MIN-01',
        unitPrice: 10,
        currency: 'USD',
        quantity: 1,
      };
      const result = GuestCartItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
    });

    it('rechaza cantidad menor o igual a cero', () => {
      const zeroQty = { ...validItem, quantity: 0 };
      const negQty = { ...validItem, quantity: -5 };
      expect(GuestCartItemSchema.safeParse(zeroQty).success).toBe(false);
      expect(GuestCartItemSchema.safeParse(negQty).success).toBe(false);
    });

    it('rechaza cantidades no enteras', () => {
      const floatQty = { ...validItem, quantity: 1.5 };
      expect(GuestCartItemSchema.safeParse(floatQty).success).toBe(false);
    });

    it('rechaza cantidad superior a 999', () => {
      const overQty = { ...validItem, quantity: 1000 };
      expect(GuestCartItemSchema.safeParse(overQty).success).toBe(false);
    });

    it('rechaza precio unitario negativo', () => {
      const negPrice = { ...validItem, unitPrice: -0.01 };
      expect(GuestCartItemSchema.safeParse(negPrice).success).toBe(false);
    });

    it('rechaza cuando faltan identificadores requeridos o están vacíos', () => {
      expect(GuestCartItemSchema.safeParse({ ...validItem, variantId: '' }).success).toBe(false);
      expect(GuestCartItemSchema.safeParse({ ...validItem, productId: '   ' }).success).toBe(false);
      expect(GuestCartItemSchema.safeParse({ ...validItem, productName: '' }).success).toBe(false);
      expect(GuestCartItemSchema.safeParse({ ...validItem, sku: '' }).success).toBe(false);
      expect(GuestCartItemSchema.safeParse({ ...validItem, currency: '' }).success).toBe(false);
    });
  });

  describe('Storage & Anti-Corruption layer', () => {
    it('devuelve array vacío si sessionStorage no tiene datos o contiene JSON corrupto', () => {
      expect(getGuestCartItems()).toEqual([]);
      expect(getGuestCartCount()).toBe(0);

      sessionStorage.setItem(GUEST_CART_KEY, 'not-json-{{{');
      expect(getGuestCartItems()).toEqual([]);
    });

    it('filtra elementos corruptos de un array preservando únicamente los válidos', () => {
      const mixedData = [
        validItem,
        { variantId: '', quantity: 0 }, // Inválido
        { ...validItem, variantId: 'var-999', quantity: 3 }, // Válido
        'cadena-basura', // Inválido
      ];
      sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(mixedData));

      const items = getGuestCartItems();
      expect(items).toHaveLength(2);
      expect(items[0]?.variantId).toBe('var-123');
      expect(items[1]?.variantId).toBe('var-999');
      expect(getGuestCartCount()).toBe(5);
    });

    it('guarda únicamente ítems conformes al schema con saveGuestCartItems', () => {
      const mixed = [
        validItem,
        { ...validItem, variantId: '', quantity: -1 },
      ];
      saveGuestCartItems(mixed as GuestCartItem[]);

      const stored = JSON.parse(sessionStorage.getItem(GUEST_CART_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]?.variantId).toBe(validItem.variantId);
    });

    it('agrega un nuevo ítem y acumula cantidad respetando límite de 999', () => {
      addGuestCartItem(validItem);
      expect(getGuestCartItems()).toHaveLength(1);
      expect(getGuestCartCount()).toBe(2);

      // Agregar más unidades del mismo variantId
      addGuestCartItem({ ...validItem, quantity: 3 });
      expect(getGuestCartItems()).toHaveLength(1);
      expect(getGuestCartCount()).toBe(5);

      // Acumular sobrepasando el límite de 999 clamplea a 999
      addGuestCartItem({ ...validItem, quantity: 1500 });
      expect(getGuestCartItems()[0]?.quantity).toBe(999);
      expect(getGuestCartCount()).toBe(999);
    });

    it('actualiza la cantidad de un ítem con clamp entre 1 y 999', () => {
      addGuestCartItem(validItem);

      updateGuestCartItemQuantity(validItem.variantId, 10);
      expect(getGuestCartItems()[0]?.quantity).toBe(10);

      updateGuestCartItemQuantity(validItem.variantId, -5);
      expect(getGuestCartItems()[0]?.quantity).toBe(1);

      updateGuestCartItemQuantity(validItem.variantId, 2000);
      expect(getGuestCartItems()[0]?.quantity).toBe(999);
    });

    it('elimina un ítem específico y limpia el carrito', () => {
      addGuestCartItem(validItem);
      addGuestCartItem({ ...validItem, variantId: 'var-other', sku: 'OTHER-01' });
      expect(getGuestCartItems()).toHaveLength(2);

      removeGuestCartItem(validItem.variantId);
      expect(getGuestCartItems()).toHaveLength(1);
      expect(getGuestCartItems()[0]?.variantId).toBe('var-other');

      clearGuestCart();
      expect(getGuestCartItems()).toEqual([]);
      expect(getGuestCartCount()).toBe(0);
    });

    it('gestiona el flag de pending checkout correctamente con consumo atómico', () => {
      expect(hasPendingGuestCheckout()).toBe(false);

      setPendingGuestCheckout(true);
      expect(hasPendingGuestCheckout()).toBe(true);

      const consumed = consumePendingGuestCheckout();
      expect(consumed).toBe(true);
      expect(hasPendingGuestCheckout()).toBe(false);

      expect(consumePendingGuestCheckout()).toBe(false);
    });
  });

  describe('Events Pub/Sub system', () => {
    it('notifica a los suscriptores en operaciones de mutación y permite desuscribirse', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeGuestCart(listener);

      addGuestCartItem(validItem);
      expect(listener).toHaveBeenCalledTimes(1);

      updateGuestCartItemQuantity(validItem.variantId, 4);
      expect(listener).toHaveBeenCalledTimes(2);

      removeGuestCartItem(validItem.variantId);
      expect(listener).toHaveBeenCalledTimes(3);

      clearGuestCart();
      expect(listener).toHaveBeenCalledTimes(4);

      unsubscribe();
      addGuestCartItem(validItem);
      expect(listener).toHaveBeenCalledTimes(4); // No incrementa tras desuscripción
    });
  });

  describe('Backend Sync & Resilience (syncGuestCartToBackend)', () => {
    it('retorna inmediatamente si el carrito está vacío sin invocar APIs', async () => {
      const mockApi: ZentricApiPort = {
        createCart: vi.fn(),
        addCartItem: vi.fn(),
        checkoutOrder: vi.fn(),
      } as unknown as ZentricApiPort;

      setPendingGuestCheckout(true);
      const result = await syncGuestCartToBackend(mockApi);

      expect(result).toEqual({ orderId: null, checkedOut: false });
      expect(mockApi.createCart).not.toHaveBeenCalled();
      expect(hasPendingGuestCheckout()).toBe(false);
    });

    it('crea orden nueva, agrega ítems y hace checkout si pendingCheckout estaba activo', async () => {
      addGuestCartItem(validItem);
      setPendingGuestCheckout(true);

      const mockApi: ZentricApiPort = {
        createCart: vi.fn().mockResolvedValue('order-backend-777'),
        addCartItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
        checkoutOrder: vi.fn().mockResolvedValue({ id: 'order-backend-777', status: 'PLACED' }),
      } as unknown as ZentricApiPort;

      const result = await syncGuestCartToBackend(mockApi);

      expect(result).toEqual({ orderId: 'order-backend-777', checkedOut: true });
      expect(mockApi.createCart).toHaveBeenCalledTimes(1);
      expect(mockApi.addCartItem).toHaveBeenCalledWith({
        orderId: 'order-backend-777',
        variantId: validItem.variantId,
        quantity: validItem.quantity,
      });
      expect(mockApi.checkoutOrder).toHaveBeenCalledWith('order-backend-777');

      // Verifica que el almacenamiento local se limpió tras el éxito completo
      expect(getGuestCartItems()).toEqual([]);
      expect(hasPendingGuestCheckout()).toBe(false);
    });

    it('reutiliza existingCartOrderId si fue provisto sin llamar a createCart', async () => {
      addGuestCartItem(validItem);

      const mockApi: ZentricApiPort = {
        createCart: vi.fn(),
        addCartItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
        checkoutOrder: vi.fn(),
      } as unknown as ZentricApiPort;

      const result = await syncGuestCartToBackend(mockApi, 'existing-order-444');

      expect(result).toEqual({ orderId: 'existing-order-444', checkedOut: false });
      expect(mockApi.createCart).not.toHaveBeenCalled();
      expect(mockApi.addCartItem).toHaveBeenCalledWith({
        orderId: 'existing-order-444',
        variantId: validItem.variantId,
        quantity: validItem.quantity,
      });
      expect(getGuestCartItems()).toEqual([]);
    });

    it('invariante de resiliencia: si la API falla, no limpia el almacenamiento local para reintentos', async () => {
      addGuestCartItem(validItem);
      setPendingGuestCheckout(true);

      const mockApi: ZentricApiPort = {
        createCart: vi.fn().mockResolvedValue('order-temp'),
        addCartItem: vi.fn().mockRejectedValue(new Error('Network error on addCartItem')),
        checkoutOrder: vi.fn(),
      } as unknown as ZentricApiPort;

      await expect(syncGuestCartToBackend(mockApi)).rejects.toThrow('Network error on addCartItem');

      // Los ítems y el flag de pending checkout permanecen intactos en disco/sessionStorage
      expect(getGuestCartItems()).toHaveLength(1);
      expect(getGuestCartItems()[0]?.variantId).toBe(validItem.variantId);
      expect(hasPendingGuestCheckout()).toBe(true);
    });
  });
});
