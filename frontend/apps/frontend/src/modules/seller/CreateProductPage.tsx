import { useState, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { useCreateProductMutation, useUpdateProductMutation, useProductQuery } from '../../application/services/catalog';
import { ProductType, type Product, type ProductVariant, type CreatedProduct, ProductStatus, type UpdateProductInput } from '../../domain';
import { ProductCard } from '../buyer/components/ProductCard';
import {
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';

import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  FileCode,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface VariantDraft {
  sku: string;
  attrName: string;
  attrValue: string;
  attr2Name?: string;
  attr2Value?: string;
  priceAmount?: number;
}

const ATTRIBUTE_PRESETS: Array<{ name: string; sampleValue: string }> = [
  { name: 'Color', sampleValue: 'Negro Carbón' },
  { name: 'Talla', sampleValue: 'M / 40 EU' },
  { name: 'Presentación', sampleValue: '1 kg / Doble Cesta' },
  { name: 'Capacidad', sampleValue: '1TB NVMe / 7.6 Litros' },
  { name: 'Material', sampleValue: 'Acero Inoxidable' },
  { name: 'Plan / Licencia', sampleValue: 'Anual Familiar' },
];

/**
 * Alta de Producto con Constructor de Variantes y Precio por SKU (CreateProductPage - Frontend-Role-Modules sección 2.3).
 * Split-Frame Asimétrico (60% Formulario / 40% Ficha Técnica en Vivo).
 * Cumple con ADexige al menos una variante para productos físicos y permite fijar precio específico por SKU.
 */
export function CreateProductPage({ productId }: { productId?: string }) {
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const navigate = useParams({ strict: false });
  const mode: CreateProductPageMode = productId ? 'edit' : 'create';

  // Para modo edición: cargar datos del producto
  const { data: productData, isLoading: isProductLoading, isError, error } = productId
    ? useProductQuery(productId)
    : { data: null, isLoading: false, isError: false, error: null };

  // Estado inicial del formulario - modo creación o edición
  const initialName = productId ? (productData?.name ?? '') : '';
  const initialDescription = productId ? (productData?.description ?? '') : '';
  const initialImageUrl = productId ? (productData?.imageUrl ?? '') : '';
  const initialPriceAmount = productId ? (productData?.price ?? 0) : 0;
  const initialType = productId ? (productData?.type ?? ProductType.Physical) : ProductType.Physical;

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    if (productId && productData?.variants) {
      return productData.variants.map((v: any) => ({
        sku: v.sku ?? '',
        attrName: v.attr?.[0]?.name ?? '',
        attrValue: v.attr?.[0]?.value ?? '',
      }));
    }
    return [{ sku: '', attrName: 'Color', attrValue: 'Negro' }];
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [priceAmount, setPriceAmount] = useState(initialPriceAmount);
  const [type, setType] = useState(initialType);

  const [variants, setVariants] = useState<VariantDraft[]>([
    { sku: '', attrName: 'Color', attrValue: 'Negro' },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedProduct | null>(null);

  const previewProduct: Product = {
    id: 'preview',
    name: name || 'Nombre del Producto',
    description,
    price: priceAmount > 0 ? priceAmount : 0,
    currency: 'COP',
    vendorId: '',
    type,
    status: ProductStatus.Published,
    variants: variants
      .filter((v) => v.sku.trim().length > 0)
      .map((v, i) => ({
        id: `preview-${i}`,
        sku: v.sku,
        canBeSold: true,
        price: v.priceAmount && v.priceAmount > 0 ? v.priceAmount : undefined,
        attributes:
          v.attrName && v.attrValue
            ? [{ name: v.attrName, value: v.attrValue }]
            : undefined,
      })),
    createdAt: new Date().toISOString(),
    imageUrl: imageUrl.trim() || null,
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { sku: '', attrName: 'Talla/Tamaño', attrValue: 'Estándar' },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof VariantDraft,
    value: string | number | undefined,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }

    if (priceAmount <= 0) {
      setErrorMsg('El precio base debe ser un valor positivo.');
      return;
    }

    // Regla ADAl menos 1 variante con SKU no vacío si es producto físico
    if (type === ProductType.Physical) {
      if (variants.length === 0 || !variants.some((v) => v.sku.trim().length > 0)) {
        setErrorMsg('Los productos físicos deben contener al menos una variante con SKU definido (ADR-0003).');
        return;
      }
    }

    try {
      const formattedVariants = variants
        .filter((v) => v.sku.trim().length > 0)
        .map((v) => {
          const attrs: Array<{ name: string; value: string }> = [];
          if (v.attrName.trim() && v.attrValue.trim()) {
            attrs.push({ name: v.attrName.trim(), value: v.attrValue.trim() });
          }
          if (v.attr2Name?.trim() && v.attr2Value?.trim()) {
            attrs.push({ name: v.attr2Name.trim(), value: v.attr2Value.trim() });
          }
          return {
            sku: v.sku.trim(),
            priceAmount: v.priceAmount && v.priceAmount > 0 ? v.priceAmount : undefined,
            attributes: attrs,
          };
        });

      const result = await createProductMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        priceAmount,
        priceCurrency: 'COP',
        type,
        variants: formattedVariants.length > 0 ? formattedVariants : undefined,
        imageUrl: imageUrl.trim() || undefined,
      });

      setCreatedResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al dar de alta el producto.';
      setErrorMsg(msg);
    }
  };

if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <Skeleton className="h-96 rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado y Retorno ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/seller/products">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Dar de Alta Nuevo Producto
            </h1>
          </div>
          <p className="text-sm font-mono text-foreground-muted">
            Publica cualquier producto (Hogar, Moda, Supermercado, Deportes, Tecnología o Digital) con precios específicos por SKU.
          </p>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Validación Requerida</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame Asimétrico (60% Formulario / 40% Resumen / Éxito) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Formulario de Creación (60% -> col-span-7) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Tipo de Producto */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Tipo de Catálogo
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setType(ProductType.Physical)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    type === ProductType.Physical
                      ? 'border-brand bg-brand/10 text-foreground'
                      : 'border-border bg-surface-muted/50 text-foreground-muted'
                  }`}
                >
                  <Package className="h-5 w-5 text-brand" />
                  <div>
                    <span className="text-sm font-mono font-bold block">Físico</span>
                    <span className="text-[11px] text-foreground-muted">Hogar, Moda, Despensa, Deporte, Tech</span>
                  </div>
                </div>

                <div
                  onClick={() => setType(ProductType.Digital)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    type === ProductType.Digital
                      ? 'border-blue-500 bg-blue-500/10 text-foreground'
                      : 'border-border bg-surface-muted/50 text-foreground-muted'
                  }`}
                >
                  <FileCode className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-sm font-mono font-bold block">Digital</span>
                    <span className="text-[11px] text-foreground-muted">Membresías y licencias</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos Maestros */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Nombre del Producto
              </label>
              <Input
                placeholder="Ej. Monitor Curvo 34'' / Cafetera Espresso / Tenis Running"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Descripción
              </label>
              <textarea
                rows={3}
                placeholder="Características principales, materiales, dimensiones o contenido..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground placeholder-foreground-muted focus:border-brand focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                URL de Imagen Fotográfica del Producto (Opcional)
              </label>
              <Input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-surface-muted border-border font-mono text-foreground text-xs"
              />
              {imageUrl.trim() && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
                  <img
                    src={imageUrl.trim()}
                    alt="Vista previa"
                    className="h-12 w-12 rounded object-cover border border-border"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-mono text-brand">Vista previa de fotografía cargada</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Precio Base (COP)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={priceAmount || ''}
                onChange={(e) => setPriceAmount(Number(e.target.value))}
                className="bg-surface-muted border-border font-mono text-foreground"
              />
              <p className="text-[11px] text-foreground-muted">
                Precio de referencia del producto. Abajo puedes asignar un precio distinto a cada SKU.
              </p>
            </div>

            {/* Constructor de Variantes */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
                    Variantes del Producto (SKU) y Precios Individuales
                  </h3>
                  <p className="text-[11px] text-foreground-muted">
                    {type === ProductType.Physical
                      ? 'Cada SKU puede tener su propio precio, talla, presentación o capacidad.'
                      : 'Define planes o licencias con precios diferenciados.'}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  className="border-border text-brand hover:bg-surface-muted text-xs font-mono"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Variante
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 rounded-xl border border-border bg-surface-muted/40 hover:border-brand/40 focus-within:border-brand/60 focus-within:bg-surface-muted/60 transition-all shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-foreground">
                        Variante #{index + 1}
                      </span>
                      {variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariant(index)}
                          className="text-destructive hover:text-destructive h-7 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono text-foreground-muted">
                        Plantillas rápidas:
                      </span>
                      {ATTRIBUTE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            handleVariantChange(index, 'attrName', preset.name);
                            if (!variant.attrValue || variant.attrValue === 'Estándar') {
                              handleVariantChange(index, 'attrValue', preset.sampleValue);
                            }
                          }}
                          className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground-muted transition-colors hover:border-brand/50 hover:text-brand"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Código SKU
                        </label>
                        <Input
                          placeholder="SKU-REF-01"
                          value={variant.sku}
                          onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          className="bg-surface border-border font-mono text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Precio SKU (COP)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder={priceAmount > 0 ? String(priceAmount) : 'Igual a base'}
                          value={variant.priceAmount ?? ''}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              'priceAmount',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                          className="bg-surface border-border font-mono text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Atributo Principal
                        </label>
                        <Input
                          placeholder="Nombre"
                          value={variant.attrName}
                          onChange={(e) => handleVariantChange(index, 'attrName', e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Valor
                        </label>
                        <Input
                          placeholder="Valor"
                          value={variant.attrValue}
                          onChange={(e) => handleVariantChange(index, 'attrValue', e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          2° Atributo Opcional (ej. Talla / Presentación / Garantía)
                        </label>
                        <Input
                          placeholder="Ej. Presentación"
                          value={variant.attr2Name ?? ''}
                          onChange={(e) => handleVariantChange(index, 'attr2Name', e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Valor 2° Atributo
                        </label>
                        <Input
                          placeholder="Ej. Edición Especial"
                          value={variant.attr2Value ?? ''}
                          onChange={(e) => handleVariantChange(index, 'attr2Value', e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={createProductMutation.isPending}
              className="w-full h-12 bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-sm shadow-lg shadow-brand/20 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {createProductMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Registrando en el catálogo...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Publicar en Catálogo del Vendedor
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Lado Derecho: Estado de Éxito o Vista Previa (40% -> col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {createdResult ? (
            <div className="rounded-2xl border border-brand/40 bg-surface p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-brand" />
                <div>
                  <h2 className="text-lg font-bold text-foreground font-sans">
                    ¡Producto Registrado con Éxito!
                  </h2>
                  <p className="text-xs font-mono text-brand">
                    Publicado en catálogo comercial
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs border-t border-border pt-4">
                <div>
                  <span className="text-foreground-muted block">ID de Producto:</span>
                  <span className="text-foreground font-bold">{createdResult.productId}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block">
                    Variantes creadas ({createdResult.variantIds.length}):
                  </span>
                  <div className="space-y-1 mt-1">
                    {createdResult.variantIds.map((varId, idx) => (
                      <div key={varId} className="bg-surface-muted p-2 rounded border border-border text-brand">
                        Variante #{idx + 1}: {varId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs text-foreground-muted">
                  Las variantes físicas se crean inicialmente sin existencias (`canBeSold = false`). Continúe al módulo de inventario para cargar el stock inicial en bodega.
                </p>

                <Link to="/seller/inventory">
                  <Button className="w-full bg-brand text-primary-foreground font-bold">
                    <Boxes className="h-4 w-4 mr-2" />
                    Cargar Stock Inicial en Bodega
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
              <h2 className="text-sm uppercase font-mono tracking-wider text-foreground-muted">
                Vista Previa del Catálogo
              </h2>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-5 space-y-3">
                <span className="text-xs font-mono text-brand font-bold">
                  {name || 'Nombre del Producto'}
                </span>
                <p className="text-xs text-foreground-muted">
                  {description || 'Aquí aparecerá la descripción del producto...'}
                </p>
                <div className="text-lg font-bold font-mono text-foreground tabular-nums pt-2 border-t border-border">
                  Desde ${priceAmount.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP
                </div>

                {/* Vista previa de cómo verá el Comprador las variantes en el Buy Box */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Selector en Buy Box del Comprador ({variants.length})
                  </span>
                  <div className="space-y-1.5">
                    {variants.map((v, i) => {
                      const labelParts = [
                        v.attrName && v.attrValue ? `${v.attrName}: ${v.attrValue}` : null,
                        v.attr2Name && v.attr2Value ? `${v.attr2Name}: ${v.attr2Value}` : null,
                      ].filter(Boolean);
                      const effectivePrice =
                        v.priceAmount && v.priceAmount > 0 ? v.priceAmount : priceAmount;
                      return (
                        <div
                          key={i}
                          className="rounded-lg border border-border bg-surface p-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {labelParts.length > 0 ? labelParts.join(' · ') : `Opción #${i + 1}`}
                            </div>
                            <div className="font-mono text-[10px] text-foreground-muted">
                              SKU: {v.sku || 'PENDIENTE'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block font-mono text-xs font-bold text-brand tabular-nums">
                              ${effectivePrice.toLocaleString('es-CO')} COP
                            </span>
                            <span className="font-mono text-[10px] text-foreground-muted">
                              Opción #{i + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
