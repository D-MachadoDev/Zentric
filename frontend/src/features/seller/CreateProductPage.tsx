import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useCreateProductMutation, useProductQuery } from '../../core';
import { ProductType, type CreatedProduct } from '../../core';
import {
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
} from '@zentric/ui';

export type CreateProductPageMode = 'create' | 'edit';

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
  Lightbulb,
  ImageOff,
} from 'lucide-react';
import { generateSmartSku, VARIANT_PRESETS, type VariantPreset } from './skuHelper';

// Formatea un valor numérico como texto con separador de miles (puntos) para COP.
const formatPriceWithDots = (value: number | string): string => {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('es-CO').replace(/\s/g, '.');
};

const stripPriceDots = (value: string): string => value.replace(/\D/g, '');

interface VariantDraft {
  sku: string;
  attrName: string;
  attrValue: string;
  attr2Name?: string;
  attr2Value?: string;
  priceAmount?: number;
  isSkuManual?: boolean;
}

/**
 * Alta de Producto con Constructor de Variantes y Precio por SKU (CreateProductPage - Frontend-Role-Modules sección 2.3).
 * Split-Frame Asimétrico (60% Formulario / 40% Ficha Técnica en Vivo).
 * Cumple con ADexige al menos una variante para productos físicos y permite fijar precio específico por SKU.
 */
export function CreateProductPage({ productId }: { productId?: string }) {
  const createProductMutation = useCreateProductMutation();

  // Para modo edición: cargar datos del producto
  const { data: productData, isLoading: isProductLoading } = productId
    ? useProductQuery(productId)
    : { data: null, isLoading: false };

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
    return [{ sku: '', attrName: '', attrValue: '' }];
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedProduct | null>(null);
  const [isLoading] = useState(false);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [priceAmount, setPriceAmount] = useState(initialPriceAmount);
  const [type, setType] = useState(initialType);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);

  useEffect(() => {
    setPreviewImageFailed(false);
  }, [imageUrl]);

  const [isSimpleProductMode, setIsSimpleProductMode] = useState(true);
  const [showVariantGuide, setShowVariantGuide] = useState(false);

  const handleAddVariant = () => {
    setIsSimpleProductMode(false);
    setVariants((prev) => {
      const nextNum = prev.length + 1;
      const otherSkus = prev.map((v) => v.sku);
      const autoSku = generateSmartSku(name || 'PROD', `VAR${nextNum}`, otherSkus);
      return [
        ...prev,
        { sku: autoSku, attrName: '', attrValue: '', isSkuManual: false },
      ];
    });
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof VariantDraft,
    value: string | number | boolean | undefined,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleAttrValueChange = (index: number, val: string) => {
    setVariants((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const otherSkus = prev.filter((_, i) => i !== index).map((v) => v.sku);
      const nextSku = !current.isSkuManual
        ? generateSmartSku(name || 'PROD', val || current.attrName, otherSkus)
        : current.sku;
      return prev.map((v, i) => (i === index ? { ...v, attrValue: val, sku: nextSku } : v));
    });
  };

  const handleApplyPreset = (index: number, preset: VariantPreset) => {
    const cleanName = (preset.name.split('/')[0] ?? preset.name).trim();
    setVariants((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const otherSkus = prev.filter((_, i) => i !== index).map((v) => v.sku);
      const nextSku = generateSmartSku(name || 'PROD', preset.sampleValue, otherSkus);
      return prev.map((v, i) =>
        i === index
          ? {
              ...v,
              attrName: cleanName,
              attrValue: preset.sampleValue,
              sku: nextSku,
              isSkuManual: false,
            }
          : v,
      );
    });
  };

  const handleAutoGenerateSku = (index: number) => {
    setVariants((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const otherSkus = prev.filter((_, i) => i !== index).map((v) => v.sku);
      const autoSku = generateSmartSku(name || 'PROD', current.attrValue || current.attrName, otherSkus);
      return prev.map((v, i) => (i === index ? { ...v, sku: autoSku, isSkuManual: false } : v));
    });
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
          if (attrs.length === 0) {
            attrs.push({ name: 'Tipo', value: 'Estándar' });
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

if (isLoading || isProductLoading) {
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-foreground-muted block">
                  Precio Base (COP)
                </label>
                {priceAmount > 0 && (
                  <span className="text-[11px] font-mono text-brand font-semibold">
                    $ {formatPriceWithDots(priceAmount)} COP
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted font-mono text-sm select-none">
                  $
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0.00"
                  value={priceAmount > 0 ? formatPriceWithDots(priceAmount) : ''}
                  onChange={(e) => setPriceAmount(Number(stripPriceDots(e.target.value)) || 0)}
                  className="bg-surface-muted border-border font-mono text-foreground pl-7 text-base font-semibold"
                />
              </div>
              <p className="text-[11px] text-foreground-muted">
                Precio de referencia del producto con separador de miles. Abajo puedes asignar un precio específico a cada SKU si varía.
              </p>
            </div>

            {/* Selector de Modo de Producto y Constructor de Variantes */}
            <div className="space-y-4 pt-4 border-t border-border">
              {/* Selector de Modo: Simple vs Múltiples Variantes */}
              <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3">
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-foreground block">
                    Modalidad de Producto
                  </span>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    ¿Este producto es una opción única o tiene variaciones (tallas, colores, tipos)?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setIsSimpleProductMode(true);
                      if (variants.length > 1) {
                        setVariants([variants[0] || { sku: '', attrName: 'Tipo', attrValue: 'Estándar' }]);
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-3 flex items-start gap-3 transition-all ${
                      isSimpleProductMode && variants.length <= 1
                        ? 'border-brand bg-brand/10 text-foreground shadow-xs'
                        : 'border-border bg-surface text-foreground-muted hover:border-brand/40'
                    }`}
                  >
                    <Package className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-mono font-bold block">Producto Simple (Opción única)</span>
                      <p className="text-[10px] text-foreground-muted mt-0.5 leading-relaxed">
                        No necesitas variantes. El producto se registra con su SKU estándar directamente para inventario.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setIsSimpleProductMode(false);
                      setShowVariantGuide(true);
                    }}
                    className={`cursor-pointer rounded-lg border p-3 flex items-start gap-3 transition-all ${
                      !isSimpleProductMode || variants.length > 1
                        ? 'border-brand bg-brand/10 text-foreground shadow-xs'
                        : 'border-border bg-surface text-foreground-muted hover:border-brand/40'
                    }`}
                  >
                    <Boxes className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-mono font-bold block">Producto con Variantes</span>
                      <p className="text-[10px] text-foreground-muted mt-0.5 leading-relaxed">
                        Tallas, colores, sabores o modelos diferenciados con su propio SKU y precio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guía didáctica para vendedores */}
              {(!isSimpleProductMode || variants.length > 1) && (
                <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand">
                      <Lightbulb className="h-4 w-4 shrink-0 text-brand" />
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wide">
                        ¿Cómo funcionan las variantes y el código SKU?
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVariantGuide(!showVariantGuide)}
                      className="text-[10px] font-mono text-foreground-muted hover:text-foreground underline cursor-pointer"
                    >
                      {showVariantGuide ? 'Ocultar guía' : 'Ver explicación'}
                    </button>
                  </div>

                  {showVariantGuide && (
                    <div className="text-xs text-foreground-muted space-y-2.5 pt-1">
                      <p className="leading-relaxed">
                        Si vendes por ejemplo <strong className="text-foreground">Limones</strong> y tienes variedades como <strong className="text-foreground">Eureka</strong> y <strong className="text-foreground">Taití</strong>, no necesitas crear dos productos diferentes. Creas este único producto y le agregas sus <strong className="text-foreground">variantes</strong>:
                      </p>
                      <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5 font-mono text-[11px]">
                        <div>
                          <span className="text-brand font-bold">1. Atributo:</span> La cualidad que cambia (ej. <em>Variedad</em>, <em>Presentación</em>, <em>Tamaño</em> o <em>Color</em>).
                        </div>
                        <div>
                          <span className="text-brand font-bold">2. Valor:</span> La opción específica (ej. <em>Eureka</em>, <em>Taití</em>, <em>1 kg</em>, <em>Mediano</em>).
                        </div>
                        <div>
                          <span className="text-brand font-bold">3. Código SKU:</span> Identificador único para bodega. <em>¡Se genera automáticamente al escribir el valor!</em>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-foreground">
                    {isSimpleProductMode && variants.length <= 1
                      ? 'Código de Inventario (SKU)'
                      : 'Variantes del Producto (SKU) y Precios Individuales'}
                  </h3>
                  <p className="text-[11px] text-foreground-muted">
                    {isSimpleProductMode && variants.length <= 1
                      ? 'Código único de bodega asignado a este producto.'
                      : type === ProductType.Physical
                        ? 'Cada opción (variedad, tamaño, color) puede tener su propio precio y stock.'
                        : 'Define planes o licencias con precios diferenciados.'}
                  </p>
                </div>

                {!isSimpleProductMode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddVariant}
                    className="border-border text-brand hover:bg-surface-muted text-xs font-mono"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Variante
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 rounded-xl border border-border bg-surface-muted/40 hover:border-brand/40 focus-within:border-brand/60 focus-within:bg-surface-muted/60 transition-all shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {isSimpleProductMode && variants.length <= 1
                          ? 'Identificador de Existencias'
                          : `Variante #${index + 1}`}
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

                    {(!isSimpleProductMode || variants.length > 1) && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-foreground-muted flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-brand" /> Plantillas sugeridas:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {VARIANT_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleApplyPreset(index, preset)}
                              className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground-muted transition-colors hover:border-brand/50 hover:text-brand cursor-pointer"
                              title={preset.exampleDescription}
                            >
                              + {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`grid grid-cols-1 ${
                      isSimpleProductMode && variants.length <= 1
                        ? 'sm:grid-cols-2'
                        : 'sm:grid-cols-2 lg:grid-cols-4'
                    } gap-3`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono uppercase text-foreground-muted block">
                            Código SKU
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateSku(index)}
                            className="text-[9px] font-mono text-brand hover:underline flex items-center gap-0.5 cursor-pointer"
                            title="Regenerar SKU automáticamente"
                          >
                            <Sparkles className="h-2.5 w-2.5" /> Auto
                          </button>
                        </div>
                        <Input
                          placeholder="SKU-REF-01"
                          value={variant.sku}
                          onChange={(e) => {
                            handleVariantChange(index, 'sku', e.target.value.toUpperCase());
                            handleVariantChange(index, 'isSkuManual', true);
                          }}
                          className="bg-surface border-border font-mono text-xs text-foreground"
                        />
                        <p className="text-[9px] font-mono text-foreground-muted mt-1">
                          {variant.isSkuManual ? 'Manual' : 'Automático'}
                        </p>
                      </div>

                      {(!isSimpleProductMode || variants.length > 1) && (
                        <div>
                          <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                            Precio SKU (COP)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted font-mono text-xs select-none">
                              $
                            </span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder={priceAmount > 0 ? formatPriceWithDots(priceAmount) : 'Igual a base'}
                              value={variant.priceAmount ? formatPriceWithDots(variant.priceAmount) : ''}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  'priceAmount',
                                  e.target.value ? Number(stripPriceDots(e.target.value)) || undefined : undefined,
                                )
                              }
                              className="bg-surface border-border font-mono text-xs text-foreground pl-6"
                            />
                          </div>
                          <p className="text-[9px] font-mono text-foreground-muted mt-1">
                            Opcional (vacío = ${priceAmount > 0 ? formatPriceWithDots(priceAmount) : '0'})
                          </p>
                        </div>
                      )}

                      <div className={isSimpleProductMode && variants.length <= 1 ? 'hidden' : 'block'}>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Atributo (¿Qué cambia?)
                        </label>
                        <Input
                          placeholder="Nombre"
                          value={variant.attrName}
                          onChange={(e) => handleVariantChange(index, 'attrName', e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                        <p className="text-[9px] font-mono text-foreground-muted mt-1">
                          Ej. Variedad, Talla, Peso
                        </p>
                      </div>

                      <div className={isSimpleProductMode && variants.length <= 1 ? 'hidden' : 'block'}>
                        <label className="text-[10px] font-mono uppercase text-foreground-muted block mb-1">
                          Valor (¿Qué opción es?)
                        </label>
                        <Input
                          placeholder="Valor"
                          value={variant.attrValue}
                          onChange={(e) => handleAttrValueChange(index, e.target.value)}
                          className="bg-surface border-border text-xs text-foreground"
                        />
                        <p className="text-[9px] font-mono text-foreground-muted mt-1">
                          Ej. Eureka, Taití, 1 kg
                        </p>
                      </div>
                    </div>

                    {(!isSimpleProductMode || variants.length > 1) && (
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
                    )}
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

                <div className="flex flex-col gap-2.5">
                  <Link
                    to="/seller/inventory"
                    search={{ variantId: createdResult.variantIds[0] } as never}
                  >
                    <Button className="w-full bg-brand hover:bg-brand/90 text-primary-foreground font-bold">
                      <Boxes className="h-4 w-4 mr-2" />
                      Cargar Stock Inicial en Bodega
                    </Button>
                  </Link>

                  <Link to="/seller/products">
                    <Button
                      variant="outline"
                      className="w-full border-border text-foreground hover:bg-surface-muted font-medium text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                      Ir a Mis Productos
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase font-mono tracking-wider text-foreground-muted">
                  Vista Previa del Catálogo
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                  <Sparkles className="h-3 w-3" /> En Vivo
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/40 transition-all shadow-md">
                {/* Visualización de Fotografía de Producto en Vivo */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted border-b border-border flex items-center justify-center">
                  {imageUrl.trim() && !previewImageFailed ? (
                    <img
                      src={imageUrl.trim()}
                      alt={name || 'Vista previa del producto'}
                      onError={() => setPreviewImageFailed(true)}
                      className="h-full w-full object-cover object-center transition-all duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-foreground-muted">
                      <div className="h-12 w-12 rounded-xl bg-surface flex items-center justify-center border border-border/60">
                        {previewImageFailed ? (
                          <ImageOff className="h-6 w-6 text-foreground-muted/50" />
                        ) : (
                          <Package className="h-6 w-6 text-foreground-muted/50" />
                        )}
                      </div>
                      <span className="text-xs font-mono text-foreground-muted">
                        {previewImageFailed
                          ? 'No se pudo cargar la imagen del enlace'
                          : 'Sin imagen cargada'}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-xs border border-border/50">
                      {type === ProductType.Physical ? (
                        <Package className="h-3 w-3 text-brand" />
                      ) : (
                        <FileCode className="h-3 w-3 text-blue-400" />
                      )}
                      {type === ProductType.Physical ? 'Físico' : 'Digital'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-foreground-muted">
                      <span className="font-mono text-brand font-medium">
                        {type === ProductType.Physical ? 'Producto Físico' : 'Licencia Digital'}
                      </span>
                      <span>·</span>
                      <span className="font-mono">
                        {variants.length} {variants.length === 1 ? 'opción' : 'variantes'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold font-sans text-foreground leading-snug line-clamp-2">
                      {name || 'Nombre del Producto'}
                    </h3>
                  </div>

                  <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3">
                    {description || 'Aquí aparecerá la descripción del producto...'}
                  </p>

                  {/* Jerarquía Tipográfica de Precios Optimizada */}
                  <div className="pt-3 border-t border-border">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block mb-0.5">
                      {variants.length > 1 ? 'Desde (Precio Base)' : 'Precio'}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-foreground tabular-nums">
                        ${priceAmount > 0 ? formatPriceWithDots(priceAmount) : '0'}
                      </span>
                      <span className="text-xs font-mono font-bold text-brand uppercase">COP</span>
                    </div>
                  </div>

                  {/* Selector en Buy Box del Comprador */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                      Selector en Buy Box del Comprador ({variants.length})
                    </span>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
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
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-foreground truncate">
                                {labelParts.length > 0 ? labelParts.join(' · ') : `Opción #${i + 1}`}
                              </div>
                              <div className="font-mono text-[10px] text-foreground-muted truncate">
                                SKU: {v.sku || 'PENDIENTE'}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="font-sans text-sm font-bold text-brand tabular-nums">
                                  ${formatPriceWithDots(effectivePrice || 0)}
                                </span>
                                <span className="text-[10px] font-mono text-foreground-muted uppercase font-normal">
                                  COP
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-foreground-muted block">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
