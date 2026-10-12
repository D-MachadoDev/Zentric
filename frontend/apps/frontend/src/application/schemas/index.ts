import { z } from 'zod';
import { ProductType, UserRole, WarehouseType } from '../../domain';
import type {
  AddCartItemInput,
  AddStockInput,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateWarehouseInput,
  CreateUserInput,
  LoginInput,
  RequestReturnInput,
} from '../../domain';

/**
 * Esquemas de formulario (Q13: React Hook Form + Zod).
 *
 * Regla de §4: el esquema se deriva del contrato real del backend, no al revés.
 * Cada esquema está anclado al tipo de entrada del puerto (`z.ZodType<T, T>`),
 * de modo que una divergencia entre el formulario y el contrato deja de compilar
 * en lugar de fallar en tiempo de ejecución.
 *
 * Alcance: validación ESTRUCTURAL (presencia y tipo). Las reglas de negocio —
 * unicidad de documento y correo, propiedad del recurso, disponibilidad de
 * existencias — las impone el servidor; el cliente sólo ofrece feedback
 * inmediato y propaga el error (Frontend-Domain-Services §1).
 */

/**
 * Acceso con credenciales (ADR-0009): correo y contraseña.
 *
 * No valida el formato de correo con una expresión regular: la dirección no es
 * un campo estructural de negocio y el servidor ya decide si acepta el
 * identificador. Aquí sólo se exige presencia para poder dar feedback
 * inmediato sin esperar al `401`.
 */
export const IniciarSesionSchema: z.ZodType<LoginInput, LoginInput> = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const RegistrarUsuarioSchema: z.ZodType<CreateUserInput, CreateUserInput> = z.object({
  identityDocument: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().min(3),
  password: z.string().min(1),
  role: z.enum([
    UserRole.Buyer,
    UserRole.Seller,
    UserRole.Administrator,
    UserRole.Supervisor,
    UserRole.LogisticsOperator,
  ]),
});

export const RegistrarBodegaSchema: z.ZodType<CreateWarehouseInput, CreateWarehouseInput> = z
  .object({
    name: z.string().min(1),
    location: z.string().min(1),
    // El servidor acepta capacidad >= 0 (`CreateWarehouseCommandValidator`).
    capacity: z.number().int().nonnegative(),
    type: z.enum([WarehouseType.Marketplace, WarehouseType.Vendor]),
    vendorId: z.string().nullable(),
  })
  // Feedback inmediato de lo que el servidor ya valida: una bodega Marketplace
  // no tiene dueño y una Vendor sí. La autoridad sigue siendo el backend; aquí
  // sólo se evita un `400` garantizado. El error se ancla a `vendorId` para que
  // el formulario lo muestre junto al único campo que puede estar mal.
  .refine(
    (valor) =>
      valor.type === WarehouseType.Vendor
        ? valor.vendorId !== null && valor.vendorId.trim().length > 0
        : valor.vendorId === null,
    {
      message: 'Una bodega Vendor necesita el vendedor dueño; una Marketplace no tiene dueño.',
      path: ['vendorId'],
    },
  );

const AtributoVarianteSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

const VarianteProductoSchema = z.object({
  sku: z.string().min(1),
  attributes: z.array(AtributoVarianteSchema),
});

export const RegistrarProductoSchema: z.ZodType<CreateProductInput, CreateProductInput> = z
  .object({
    name: z.string().min(1),
    description: z.string().max(2000),
    // ISO-4217: el backend recibe importe y moneda por separado, no un "precio".
    priceAmount: z.number().positive(),
    priceCurrency: z.string().length(3),
    type: z.enum([ProductType.Physical, ProductType.Digital]),
    // Un producto Digital puede nacer sin variantes (ADR-0003).
    variants: z.array(VarianteProductoSchema).optional(),
  })
  // Feedback inmediato de lo que el servidor ya exige (ADR-0003): un producto
  // `Physical` necesita al menos una variante con SKU. El error se ancla a
  // `variants` para que el formulario lo muestre donde está el problema.
  .refine(
    (valor) =>
      valor.type !== ProductType.Physical ||
      (valor.variants !== undefined && valor.variants.length > 0),
    {
      message: 'Un producto físico necesita al menos una variante con SKU.',
      path: ['variants'],
    },
  );

export const IngresarExistenciasSchema: z.ZodType<AddStockInput, AddStockInput> = z.object({
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  // INV-01: el cliente valida cantidad > 0 como feedback; la autoridad es el servidor.
  quantity: z.number().int().positive(),
});

export const AgregarAlCarritoSchema: z.ZodType<AddCartItemInput, AddCartItemInput> = z.object({
  orderId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const SolicitarDevolucionSchema: z.ZodType<RequestReturnInput, RequestReturnInput> = z.object({
  customerOrderId: z.string().min(1),
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const CrearDespachoSchema: z.ZodType<CreateFulfillmentInput, CreateFulfillmentInput> = z.object({
  customerOrderId: z.string().min(1),
  vendorId: z.string().min(1),
});
