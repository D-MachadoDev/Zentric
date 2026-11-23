export interface ReturnValidationInput {
  orderId: string;
  variantId: string;
  quantity: number;
  purchasedQuantity: number;
  acceptedTerms: boolean;
}

export function validateReturnRequest(input: ReturnValidationInput): string | null {
  if (!input.orderId || !input.variantId) {
    return 'Selecciona un pedido entregado y un artículo antes de continuar.';
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return 'La cantidad debe ser un número entero mayor que cero.';
  }

  if (input.quantity > input.purchasedQuantity) {
    return 'La cantidad no puede superar las unidades entregadas en este pedido.';
  }

  if (!input.acceptedTerms) {
    return 'Debes aceptar las condiciones de devolución antes de continuar.';
  }

  return null;
}
