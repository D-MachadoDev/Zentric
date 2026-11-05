import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  useProductQuery,
  usePublishProductMutation,
  useSuspendProductMutation,
  useAddProductVariantMutation,
  useUpdateProductMutation,
} from '../../core';
import { ProductStatus, type ProductVariant } from '../../core';
import {
  NOMBRES_DE_ESTADO_DE_PRODUCTO,
  TONOS_DE_ESTADO_DE_PRODUCTO,
} from '../../core';
import {
  Button,
  Badge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
  StatusBadge,
} from '@zentric/ui';
import {
  ArrowLeft,
  Boxes,
  PauseCircle,
  CheckCircle,
  AlertCircle,
  Copy,
  Edit2,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { generateSmartSku, VARIANT_PRESETS, type VariantPreset } from './skuHelper';

/**
 * Ficha Técnica y Estado Comercial de Producto para Vendedor (SellerProductDetailPage).
 * Permite auditar variantes SKU, precio individual por SKU, disponibilidad de venta y alternar estado comercial.
 */
export function SellerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const publishMutation = usePublishProductMutation();
  const suspendMutation = useSuspendProductMutation();
  const addVariantMutation = useAddProductVariantMutation();
  const updateMutation = useUpdateProductMutation();

  const [newSku, setNewSku] = useState('');
  const [newAttrName, setNewAttrName] = useState('Variedad');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [variantError, setVariantError] = useState<string | null>(null);
  const [isSkuManual, setIsSkuManual] = useState(false);
  const [showVariantGuide, setShowVariantGuide] = useState(true);

  const handleAttrValueChange = (val: string) => {
    setNewAttrValue(val);
    if (!isSkuManual && product) {
      const existing = (product.variants ?? []).map((v) => v.sku);
      const generated = generateSmartSku(product.name, val || newAttrName, existing);
      setNewSku(generated);
    }
  };

  const handleAttrNameChange = (name: string) => {
    setNewAttrName(name);
    if (!isSkuManual && product && !newAttrValue.trim()) {
      const existing = (product.variants ?? []).map((v) => v.sku);
      const generated = generateSmartSku(product.name, name, existing);
      setNewSku(generated);
    }
  };

  const handleApplyPreset = (preset: VariantPreset) => {
    const cleanName = (preset.name.split('/')[0] ?? preset.name).trim();
    setNewAttrName(cleanName);
    setNewAttrValue(preset.sampleValue);
    if (product) {
      const existing = (product.variants ?? []).map((v) => v.sku);
      const generated = generateSmartSku(product.name, preset.sampleValue, existing);
      setNewSku(generated);
      setIsSkuManual(false);
    }
  };

  const handleRegenerateSku = () => {
    if (!product) return;
    const existing = (product.variants ?? []).map((v) => v.sku);
    const generated = generateSmartSku(product.name, newAttrValue || newAttrName, existing);
    setNewSku(generated);
    setIsSkuManual(false);
  };

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Formatea un valor numerico como texto con separador de miles (puntos) para COP.
  const formatPriceWithDots = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-CO').replace(/\s/g, '.');
  };

  const stripPriceDots = (value: string): string => value.replace(/\D/g, '');



  const handleStartEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditDescription(product.description);
    setEditPrice(String(product.price));
    setEditImageUrl(product.imageUrl ?? '');
    setEditCategory(product.category ?? '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !product) return;
    setEditError(null);
    const priceAmount = Number(stripPriceDots(editPrice));
    if (isNaN(priceAmount) || priceAmount <= 0) {
      setEditError('El precio debe ser un valor positivo.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        productId,
        input: {
          name: editName.trim(),
          description: editDescription.trim(),
          priceAmount,
          priceCurrency: product.currency,
          imageUrl: editImageUrl.trim() || null,
          category: editCategory.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar el producto.');
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setVariantError(null);
    if (!newSku.trim()) {
      setVariantError('El SKU es obligatorio.');
      return;
    }
    const normalizedSku = newSku.trim().toUpperCase();
    if (product?.variants?.some((v) => v.sku?.toUpperCase() === normalizedSku)) {
      setVariantError(`Ya existe una variante con el SKU "${normalizedSku}". Usa un código distinto.`);
      return;
    }
    if (!newAttrName.trim() || !newAttrValue.trim()) {
      setVariantError('Debe definir al menos un atributo (nombre y valor).');
      return;
    }
    const priceAmount = newPrice.trim() ? Number(stripPriceDots(newPrice)) : undefined;
    if (priceAmount !== undefined && (isNaN(priceAmount) || priceAmount <= 0)) {
      setVariantError('El precio debe ser un valor positivo.');
      return;
    }
    try {
      await addVariantMutation.mutateAsync({
        productId,
        input: {
          sku: normalizedSku,
          attributes: [{ name: newAttrName.trim(), value: newAttrValue.trim() }],
          priceAmount,
        },
      });
      setNewSku('');
      setNewAttrValue('');
      setNewPrice('');
      setIsSkuManual(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err as { userMessage?: string; detail?: string }).userMessage ??
            (err as { detail?: string }).detail ??
            err.message
          : 'No se pudo crear la variante.';
      setVariantError(msg || 'No se pudo crear la variante.');
    }
  };


  const handleToggleStatus = async () => {
    if (!product) return;
    if (product.status === ProductStatus.Published) {
      await suspendMutation.mutateAsync(product.id);
    } else {
      await publishMutation.mutateAsync(product.id);
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

  if (isError || !product) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/seller/products">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Mis Productos
          </Button>
        </Link>
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Error al cargar el producto</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'El producto solicitado no fue encontrado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPublished = product.status === ProductStatus.Published;

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado y Retorno ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/seller/products">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              {product.name}
            </h1>
            <StatusBadge tone={TONOS_DE_ESTADO_DE_PRODUCTO[product.status]}>
              {NOMBRES_DE_ESTADO_DE_PRODUCTO[product.status]}
            </StatusBadge>
          </div>
<p className="text-sm font-mono text-foreground-muted flex items-center gap-2">
            Creado el {new Date(product.createdAt).toLocaleDateString('es-CO')} • ID: {product.id}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(product.id)}
              className="text-foreground-muted hover:text-foreground"
              title="Copiar ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartEdit}
            className="border-border text-foreground-muted hover:text-foreground text-xs font-mono"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
          <Button
            size="sm"
            variant={isPublished ? 'outline' : 'secondary'}
            onClick={handleToggleStatus}
            disabled={publishMutation.isPending || suspendMutation.isPending}
            className={`text-xs font-mono ${
              isPublished
                ? 'border-warning/40 text-warning hover:bg-warning/10'
                : 'bg-brand text-primary-foreground font-bold'
            }`}
          >
            {isPublished ? (
              <span className="flex items-center gap-1.5">
                <PauseCircle className="h-3.5 w-3.5" /> Suspender Venta
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Publicar Producto
              </span>
            )}
          </Button>

          <Link to="/seller/inventory">
            <Button variant="secondary" size="sm" className="bg-surface border border-border text-brand">
              <Boxes className="h-4 w-4 mr-1.5" /> Cargar Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Ficha Técnica ──────────────────────────────────────────────── */}
      {isEditing && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-mono uppercase text-foreground-muted">Editar Producto</h3>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            {editError && (
              <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
                <AlertDescription className="text-xs font-mono">{editError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-foreground-muted">Nombre</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-foreground-muted">Descripción</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-foreground-muted">Precio base</label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatPriceWithDots(editPrice)}
                onChange={(e) => setEditPrice(stripPriceDots(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-foreground-muted">Imagen URL</label>
              <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-foreground-muted">Categoría</label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="border-border text-foreground hover:bg-surface-muted text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-brand text-primary-foreground font-bold text-xs">
                {updateMutation.isPending ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-foreground-muted block">Descripción</span>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {product.description || 'Sin descripción detallada provista.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 font-mono text-xs">
              <div>
                <span className="text-foreground-muted block">Tipo de Producto:</span>
                <span className="text-foreground font-bold">{product.type}</span>
              </div>
              <div>
                <span className="text-foreground-muted block">Precio Base:</span>
                <span className="text-brand font-bold text-base">
                  <MoneyAmount amount={product.price} currency={product.currency} />
                </span>
              </div>
            </div>

            {/* Listado de Variantes */}
            <div className="space-y-3 border-t border-border pt-6">
              <h2 className="text-sm uppercase font-mono tracking-wider text-foreground">
                Variantes SKU Registradas ({product.variants.length})
              </h2>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-muted/40">
                {product.variants.map((v: ProductVariant) => {
                  const skuPrice = v.price ?? product.price;
                  return (
                    <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-foreground">
                            SKU: {v.sku}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              v.canBeSold
                                ? 'border-brand/30 text-brand text-[10px] font-mono'
                                : 'border-destructive/30 text-destructive text-[10px] font-mono'
                            }
                          >
                            {v.canBeSold ? 'Disponible para Venta' : 'Sin Existencias'}
                          </Badge>
                        </div>
                        {v.attributes && v.attributes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {v.attributes.map((attr, idx) => (
                              <span
                                key={`${v.id}-${attr.name}-${idx}`}
                                className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted"
                              >
                                {attr.name}: {attr.value}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[11px] font-mono text-foreground-muted block">
                          ID: {v.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono">
                          <span className="text-[10px] uppercase text-foreground-muted block">
                            Precio SKU
                          </span>
                          <span className="text-sm font-bold text-brand tabular-nums">
                            <MoneyAmount amount={skuPrice} currency={product.currency} />
                          </span>
                        </div>
                        <Link to="/seller/inventory" search={{ variantId: v.id } as never}>
                          <Button variant="outline" size="sm" className="border-border text-brand text-xs font-mono">
                            Abastecer
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Guía didáctica para el vendedor */}
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand">
                <Lightbulb className="h-4 w-4 shrink-0 text-brand" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wide">
                  ¿Cómo funciona una variante?
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowVariantGuide(!showVariantGuide)}
                className="text-[10px] font-mono text-foreground-muted hover:text-foreground underline"
              >
                {showVariantGuide ? 'Ocultar guía' : 'Ver explicación'}
              </button>
            </div>

            {showVariantGuide && (
              <div className="text-xs text-foreground-muted space-y-2.5 pt-1">
                <p className="leading-relaxed">
                  Si tu producto es, por ejemplo, <strong className="text-foreground">Limones</strong> y tienes tipos distintos como <strong className="text-foreground">Eureka</strong> y <strong className="text-foreground">Taití</strong>, no crees dos productos distintos. Agregas cada opción como una <strong className="text-foreground">variante</strong>.
                </p>
                <div className="rounded-xl border border-border bg-surface p-3 space-y-2 font-mono text-[11px]">
                  <div>
                    <span className="text-brand font-bold">1. Atributo:</span> La cualidad que varía (ej. <em>Variedad</em>, <em>Presentación</em>, <em>Tamaño</em> o <em>Color</em>).
                  </div>
                  <div>
                    <span className="text-brand font-bold">2. Valor:</span> La opción exacta que ofreces (ej. <em>Eureka</em>, <em>Taití</em>, <em>1 kg</em>, <em>Mediano</em>).
                  </div>
                  <div>
                    <span className="text-brand font-bold">3. Código SKU:</span> Identificador único de inventario. <em>¡Lo generamos automáticamente por ti!</em>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xs font-mono uppercase font-bold text-foreground">
                Agregar Nueva Variante (SKU)
              </h3>
              <p className="text-[11px] text-foreground-muted leading-relaxed">
                Define las opciones de tu producto. El código SKU se calcula automáticamente.
              </p>
            </div>

            <form onSubmit={handleAddVariant} className="space-y-4">
              {variantError && (
                <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
                  <AlertDescription className="text-xs font-mono">{variantError}</AlertDescription>
                </Alert>
              )}

              {/* Plantillas Rápidas con un click */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-foreground-muted flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-brand" /> Atributos sugeridos (haz clic para auto-llenar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIANT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="rounded-lg border border-border bg-surface-muted/60 px-2 py-1 text-[11px] font-mono text-foreground-muted hover:border-brand/60 hover:text-brand hover:bg-brand/5 transition-all text-left"
                      title={preset.exampleDescription}
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Atributo y Valor */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-foreground-muted block">
                    Atributo (¿Qué cambia?)
                  </label>
                  <Input
                    value={newAttrName}
                    onChange={(e) => handleAttrNameChange(e.target.value)}
                    placeholder="Ej. Variedad"
                    className="bg-surface-muted/40 border-border text-xs"
                  />
                  <p className="text-[9px] font-mono text-foreground-muted">
                    Ej: Variedad, Presentación, Color
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-foreground-muted block">
                    Valor (¿Qué opción es?)
                  </label>
                  <Input
                    value={newAttrValue}
                    onChange={(e) => handleAttrValueChange(e.target.value)}
                    placeholder="Ej. Eureka"
                    className="bg-surface-muted/40 border-border text-xs"
                  />
                  <p className="text-[9px] font-mono text-foreground-muted">
                    Ej: Eureka, Taití, 1 kg, Mediano
                  </p>
                </div>
              </div>

              {/* Código SKU con automatización */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-foreground-muted flex items-center gap-1.5">
                    Código SKU
                    {!isSkuManual && newSku && (
                      <span className="text-[9px] text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                        Automático
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateSku}
                    className="text-[10px] font-mono text-brand hover:underline flex items-center gap-1 cursor-pointer"
                    title="Regenerar SKU automáticamente según el producto y la variante"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-generar
                  </button>
                </div>
                <Input
                  value={newSku}
                  onChange={(e) => {
                    setNewSku(e.target.value.toUpperCase());
                    setIsSkuManual(true);
                  }}
                  placeholder="Ej. LIM-EUR-01"
                  className="font-mono text-xs bg-surface-muted/40 border-border"
                />
                <p className="text-[10px] font-mono text-foreground-muted">
                  {isSkuManual
                    ? 'Has editado el SKU manualmente. Clic en "Auto-generar" para restaurar el formato automático.'
                    : 'Código único para bodega e inventario. Se autocompleta con el producto y variante.'}
                </p>
              </div>

              {/* Precio individual de la variante */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-foreground-muted block">
                  Precio SKU (COP) — Opcional
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatPriceWithDots(newPrice)}
                  onChange={(e) => setNewPrice(stripPriceDots(e.target.value))}
                  placeholder={formatPriceWithDots(String(product.price))}
                  className="font-mono text-xs bg-surface-muted/40 border-border"
                />
                <p className="text-[10px] font-mono text-foreground-muted">
                  {newPrice.trim()
                    ? `Precio fijado: ${formatPriceWithDots(newPrice)} COP`
                    : `Vacío usa el precio base del producto (${formatPriceWithDots(String(product.price))} COP).`}
                </p>
              </div>

              <Button
                type="submit"
                disabled={addVariantMutation.isPending}
                className="w-full bg-brand text-primary-foreground font-bold text-xs shadow-md shadow-brand/20"
              >
                {addVariantMutation.isPending ? 'Creando Variante…' : 'Crear Variante con Precio'}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-mono uppercase text-foreground-muted">
              Condiciones Comerciales
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              La disponibilidad comercial de una variante se activa automáticamente cuando se abastece inventario positivo en alguna bodega física. Cada SKU mantiene su propio precio al agregar al carrito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
