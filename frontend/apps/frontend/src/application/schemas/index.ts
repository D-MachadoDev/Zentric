import { z } from 'zod';
import { ProductType, UserRole, WarehouseType } from '../../domain';
import type {
  AddCartItemInput,
  AddStockInput,
  AdjustInventoryInput,
  AnnulInvoiceInput,
  CancelGhostStockInput,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateUserInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  InspectReturnInput,
  LoginInput,
  RemoveCartItemInput,
  RequestReturnInput,
  UpdateCartItemQuantityInput,
  UpdateUserProfileInput,
} from '../../domain';

/**
 * Esquemas de validación Zod derivados 1:1 de los contratos OpenAPI y FluentValidation
 * de los endpoints.
 *
 * Cada esquema está estrictamente anclado al tipo de entrada del puerto (`z.ZodType<T, T>`).
 * Se proporcionan identificadores en inglés (Decision A2) y alias en español para
 * compatibilidad retroactiva total.
 */

// ── 1. LoginSchema ──────────────────────────────────────────────────────────
export const LoginSchema: z.ZodType<LoginInput, LoginInput> = z.object({
  email: z.string().trim().min(1, 'El correo electrónico es obligatorio').email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export const IniciarSesionSchema = LoginSchema;

// ── 2. CreateUserSchema ─────────────────────────────────────────────────────
export const CreateUserSchema: z.ZodType<CreateUserInput, CreateUserInput> = z.object({
  identityDocument: z.string().trim().min(1, 'El documento de identidad es obligatorio'),
  fullName: z.string().trim().min(1, 'El nombre completo es obligatorio'),
  email: z.string().trim().min(3, 'El correo debe tener al menos 3 caracteres').email('Formato de correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128, 'La contraseña no puede superar 128 caracteres'),
  role: z.enum([
    UserRole.Buyer,
    UserRole.Seller,
    UserRole.Administrator,
    UserRole.Supervisor,
    UserRole.LogisticsOperator,
  ]),
});
export const RegistrarUsuarioSchema = CreateUserSchema;

// ── 3. CreateWarehouseSchema ────────────────────────────────────────────────
export const CreateWarehouseSchema: z.ZodType<CreateWarehouseInput, CreateWarehouseInput> = z
  .object({
    name: z.string().trim().min(1, 'El nombre de la bodega es obligatorio'),
    location: z.string().trim().min(1, 'La ubicación es obligatoria'),
    capacity: z.number().int('La capacidad debe ser un entero').nonnegative('La capacidad no puede ser negativa'),
    type: z.enum([WarehouseType.Marketplace, WarehouseType.Vendor]),
    vendorId: z.string().nullable(),
  })
  .refine(
    (val) =>
      val.type === WarehouseType.Vendor
        ? val.vendorId !== null && val.vendorId.trim().length > 0
        : val.vendorId === null,
    {
      message: 'Una bodega Vendor necesita el vendedor dueño; una Marketplace no tiene dueño.',
      path: ['vendorId'],
    },
  );
export const RegistrarBodegaSchema = CreateWarehouseSchema;

export const UpdateWarehouseSchema: z.ZodType<UpdateWarehouseInput, UpdateWarehouseInput> = z.object({
  name: z.string().trim().min(1, 'El nombre de la bodega es obligatorio'),
  location: z.string().trim().min(1, 'La ubicación es obligatoria'),
  capacity: z.number().int('La capacidad debe ser un entero').nonnegative('La capacidad no puede ser negativa'),
  isActive: z.boolean(),
});

// ── 4. AddStockSchema ───────────────────────────────────────────────────────
export const AddStockSchema: z.ZodType<AddStockInput, AddStockInput> = z.object({
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  warehouseId: z.string().min(1, 'El identificador de bodega es obligatorio'),
  quantity: z.number().int('La cantidad debe ser un entero').positive('La cantidad debe ser mayor a cero'),
});
export const IngresarExistenciasSchema = AddStockSchema;

// ── 5. AdjustInventorySchema ────────────────────────────────────────────────
export const AdjustInventorySchema: z.ZodType<AdjustInventoryInput, AdjustInventoryInput> = z.object({
  countedQuantity: z
    .number()
    .int('La cantidad contada debe ser un entero')
    .nonnegative('La cantidad contada no puede ser negativa'),
  reason: z.string().trim().min(1, 'El motivo del ajuste físico es obligatorio'),
});

// ── 6. CreateProductSchema ──────────────────────────────────────────────────
export const VariantAttributeSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del atributo es obligatorio').max(50, 'El nombre del atributo no puede superar 50 caracteres'),
  value: z.string().trim().min(1, 'El valor del atributo es obligatorio').max(50, 'El valor del atributo no puede superar 50 caracteres'),
});

export const CreateProductVariantInputSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(100, 'El SKU no puede superar 100 caracteres'),
  attributes: z.array(VariantAttributeSchema).optional(),
  priceAmount: z.number().nonnegative('El precio no puede ser negativo').optional(),
});

export const CreateProductSchema: z.ZodType<CreateProductInput, CreateProductInput> = z
  .object({
    name: z.string().trim().min(1, 'El nombre del producto es obligatorio').max(200, 'El nombre no puede superar 200 caracteres'),
    description: z.string().trim().min(1, 'La descripción es obligatoria').max(2000, 'La descripción no puede superar 2000 caracteres'),
    priceAmount: z.number().nonnegative('El precio no puede ser negativo'),
    priceCurrency: z.string().trim().min(3, 'La moneda debe tener 3 caracteres (ISO-4217)').max(3, 'La moneda debe tener 3 caracteres (ISO-4217)'),
    type: z.enum([ProductType.Physical, ProductType.Digital]),
    variants: z.array(CreateProductVariantInputSchema).optional(),
    imageUrl: z.string().url('La imagen debe ser una URL válida').nullable().optional(),
    category: z.string().trim().optional(),
  })
  .refine(
    (val) =>
      val.type !== ProductType.Physical ||
      (val.variants !== undefined && val.variants.length > 0),
    {
      message: 'Un producto físico necesita al menos una variante con SKU.',
      path: ['variants'],
    },
  );
export const RegistrarProductoSchema = CreateProductSchema;

// ── 7. AddCartItemSchema ────────────────────────────────────────────────────
export const AddCartItemSchema: z.ZodType<AddCartItemInput, AddCartItemInput> = z.object({
  orderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  quantity: z.number().int('La cantidad debe ser un entero').positive('La cantidad debe ser mayor a cero'),
});
export const AgregarAlCarritoSchema = AddCartItemSchema;

// ── 8. RemoveCartItemSchema ──────────────────────────────────────────────────
export const RemoveCartItemSchema: z.ZodType<RemoveCartItemInput, RemoveCartItemInput> = z.object({
  orderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
});
export const EliminarDelCarritoSchema = RemoveCartItemSchema;

// ── 8b. UpdateCartItemQuantitySchema ──────────────────────────────────────────
export const UpdateCartItemQuantitySchema: z.ZodType<UpdateCartItemQuantityInput, UpdateCartItemQuantityInput> = z.object({
  orderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  quantity: z.number().int('La cantidad debe ser un entero').min(1, 'La cantidad debe ser al menos 1'),
});
export const ActualizarCantidadCarritoSchema = UpdateCartItemQuantitySchema;

// ── 9. CreateFulfillmentSchema ──────────────────────────────────────────────
export const CreateFulfillmentSchema: z.ZodType<CreateFulfillmentInput, CreateFulfillmentInput> = z.object({
  customerOrderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  vendorId: z.string().min(1, 'El identificador de vendedor es obligatorio'),
});
export const CrearDespachoSchema = CreateFulfillmentSchema;

// ── 10. CancelGhostStockSchema ───────────────────────────────────────────────
export const CancelGhostStockSchema: z.ZodType<CancelGhostStockInput, CancelGhostStockInput> = z.object({
  fulfillmentOrderId: z.string().min(1, 'El identificador de despacho es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  warehouseId: z.string().min(1, 'El identificador de bodega es obligatorio'),
  quantityToCancel: z.number().int().positive('La cantidad a cancelar debe ser mayor a cero'),
});

// ── 11. RequestReturnSchema ─────────────────────────────────────────────────
export const RequestReturnSchema: z.ZodType<RequestReturnInput, RequestReturnInput> = z.object({
  customerOrderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  warehouseId: z.string().min(1, 'El identificador de bodega es obligatorio'),
  quantity: z.number().int().positive('La cantidad a devolver debe ser mayor a cero'),
});
export const SolicitarDevolucionSchema = RequestReturnSchema;

// ── 12. InspectReturnSchema ─────────────────────────────────────────────────
export const InspectReturnSchema: z.ZodType<InspectReturnInput, InspectReturnInput> = z.object({
  isGoodCondition: z.boolean(),
});


// ── 13. AnnulInvoiceSchema ──────────────────────────────────────────────────
export const AnnulInvoiceSchema: z.ZodType<AnnulInvoiceInput, AnnulInvoiceInput> = z.object({
  reason: z.string().trim().min(1, 'El motivo de anulación es obligatorio'),
});

// ── 14. UpdateUserProfileSchema ─────────────────────────────────────────────
export const UpdateUserProfileSchema: z.ZodType<UpdateUserProfileInput, UpdateUserProfileInput> = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'El nombre completo es obligatorio')
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 2, {
      message: 'El nombre completo debe incluir nombre y apellido',
    }),
  phone: z.string().trim().nullable().optional(),
  documentNumber: z.string().trim().nullable().optional(),
  address: z
    .object({
      street: z.string().trim().min(1, 'La dirección es obligatoria'),
      city: z.string().trim().min(1, 'La ciudad es obligatoria'),
      state: z.string().trim().min(1, 'El departamento es obligatorio'),
      zipCode: z.string().trim().min(1, 'El código postal es obligatorio'),
      country: z.string().trim().min(1, 'El país es obligatorio'),
    })
    .nullable()
    .optional(),
});
export const ActualizarPerfilUsuarioSchema = UpdateUserProfileSchema;

