import { z } from 'zod';

/**
 * Esquema de validación estricto para elementos del carrito de invitado.
 * Reglas de negocio:
 * - Cantidad entera entre 1 y 999.
 * - Precio unitario no negativo (>= 0).
 * - Identificadores requeridos no vacíos.
 */
export const GuestCartItemSchema = z.object({
  variantId: z.string().trim().min(1, 'El ID de variante es requerido'),
  productId: z.string().trim().min(1, 'El ID de producto es requerido'),
  productName: z.string().trim().min(1, 'El nombre del producto es requerido'),
  sku: z.string().trim().min(1, 'El SKU es requerido'),
  unitPrice: z.number().min(0, 'El precio no puede ser negativo'),
  currency: z.string().trim().min(1, 'La moneda es requerida'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1')
    .max(999, 'La cantidad máxima por producto es 999'),
  imageUrl: z.string().nullable().optional(),
  vendorName: z.string().optional(),
});

export const GuestCartItemsArraySchema = z.array(GuestCartItemSchema);
