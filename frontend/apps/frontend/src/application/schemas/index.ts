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
  InspectReturnInput,
  LoginInput,
  RequestReturnInput,
} from '../../domain';

/**
 * Esquemas de validación Zod derivados 1:1 de los contratos OpenAPI y FluentValidation
 * (Frontend-Domain-Services §4 y backendSDD/Presentation/01-endpoints.md).
 *
 * Cada esquema está estrictamente anclado al tipo de entrada del puerto (`z.ZodType<T, T>`).
 * Se proporcionan identificadores en inglés (Decision A2) y alias en español para
 * compatibilidad retroactiva total.
 */

// ── 1. LoginSchema ──────────────────────────────────────────────────────────
export const LoginSchema: z.ZodType<LoginInput, LoginInput> = z.object({
  email: z.string().trim().min(1, 'El correo electrónico es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export const IniciarSesionSchema = LoginSchema;

// ── 2. CreateUserSchema ─────────────────────────────────────────────────────
export const CreateUserSchema: z.ZodType<CreateUserInput, CreateUserInput> = z.object({
  identityDocument: z.string().trim().min(1, 'El documento de identidad es obligatorio'),
  fullName: z.string().trim().min(1, 'El nombre completo es obligatorio'),
  email: z.string().trim().min(3, 'El correo debe tener al menos 3 caracteres'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
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
  name: z.string().trim().min(1, 'El nombre del atributo es obligatorio'),
  value: z.string().trim().min(1, 'El valor del atributo es obligatorio'),
});

export const CreateProductVariantSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio'),
  attributes: z.array(VariantAttributeSchema),
});

export const CreateProductSchema: z.ZodType<CreateProductInput, CreateProductInput> = z
  .object({
    name: z.string().trim().min(1, 'El nombre del producto es obligatorio'),
    description: z.string().trim().max(2000, 'La descripción no puede exceder 2000 caracteres'),
    priceAmount: z.number().positive('El precio debe ser mayor a cero'),
    priceCurrency: z.string().trim().length(3, 'La moneda debe tener exactamente 3 caracteres ISO (ej. COP, USD)'),
    type: z.enum([ProductType.Physical, ProductType.Digital]),
    variants: z.array(CreateProductVariantSchema).optional(),
    imageUrl: z.string().trim().url('Debe ser una URL válida').optional().nullable(),
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

// ── 8. CreateFulfillmentSchema ──────────────────────────────────────────────
export const CreateFulfillmentSchema: z.ZodType<CreateFulfillmentInput, CreateFulfillmentInput> = z.object({
  customerOrderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  vendorId: z.string().min(1, 'El identificador de vendedor es obligatorio'),
});
export const CrearDespachoSchema = CreateFulfillmentSchema;

// ── 9. CancelGhostStockSchema ───────────────────────────────────────────────
export const CancelGhostStockSchema: z.ZodType<CancelGhostStockInput, CancelGhostStockInput> = z.object({
  fulfillmentOrderId: z.string().min(1, 'El identificador de despacho es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  warehouseId: z.string().min(1, 'El identificador de bodega es obligatorio'),
  quantityToCancel: z.number().int().positive('La cantidad a cancelar debe ser mayor a cero'),
});

// ── 10. RequestReturnSchema ─────────────────────────────────────────────────
export const RequestReturnSchema: z.ZodType<RequestReturnInput, RequestReturnInput> = z.object({
  customerOrderId: z.string().min(1, 'El identificador de pedido es obligatorio'),
  variantId: z.string().min(1, 'El identificador de variante es obligatorio'),
  warehouseId: z.string().min(1, 'El identificador de bodega es obligatorio'),
  quantity: z.number().int().positive('La cantidad a devolver debe ser mayor a cero'),
});
export const SolicitarDevolucionSchema = RequestReturnSchema;

// ── 11. InspectReturnSchema ─────────────────────────────────────────────────
export const InspectReturnSchema: z.ZodType<InspectReturnInput, InspectReturnInput> = z.object({
  isGoodCondition: z.boolean(),
});


// ── 12. AnnulInvoiceSchema ──────────────────────────────────────────────────
export const AnnulInvoiceSchema: z.ZodType<AnnulInvoiceInput, AnnulInvoiceInput> = z.object({
  reason: z.string().trim().min(1, 'El motivo de anulación es obligatorio'),
});
