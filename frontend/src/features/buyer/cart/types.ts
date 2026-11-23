export interface GuestCartItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  imageUrl?: string | null;
  vendorName?: string;
}

export interface SyncGuestCartResult {
  orderId: string | null;
  checkedOut: boolean;
}

export const GUEST_CART_KEY = 'zentric_guest_cart_v1';
export const PENDING_CHECKOUT_KEY = 'zentric_pending_checkout_v1';
