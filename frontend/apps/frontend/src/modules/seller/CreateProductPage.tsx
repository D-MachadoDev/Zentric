import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCreateProductMutation } from '../../application/services/catalog';
import { ProductType, type CreatedProduct } from '../../domain';
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
}

/**
 * Alta de Producto con Constructor de Variantes (CreateProductPage - Frontend-Role-Modules §2.3).
 * Split-Frame Asimétrico (60% Formulario / 40% Ficha Técnica en Vivo).
 * Cumple con ADR-0003: exige al menos una variante para productos físicos.
 */
export function CreateProductPage() {
  const createProductMutation = useCreateProductMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState<number>(0);
  const [type, setType] = useState<ProductType>(ProductType.Physical);

  const [variants, setVariants] = useState<VariantDraft[]>([
    { sku: '', attrName: 'Color', attrValue: 'Negro' },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedProduct | null>(null);

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { sku: '', attrName: 'Talla/Tamaño', attrValue: 'Estándar' },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantDraft, value: string) => {
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

    // Regla ADR-0003: Al menos 1 variante con SKU no vacío si es producto físico
    if (type === ProductType.Physical) {
      if (variants.length === 0 || !variants.some((v) => v.sku.trim().length > 0)) {
        setErrorMsg('Los productos físicos deben contener al menos una variante con SKU definido (ADR-0003).');
        return;
      }
    }

    try {
      const formattedVariants = variants
        .filter((v) => v.sku.trim().length > 0)
        .map((v) => ({
          sku: v.sku.trim(),
          attributes: v.attrName && v.attrValue ? [{ name: v.attrName, value: v.attrValue }] : [],
        }));

      const result = await createProductMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        priceAmount,
        priceCurrency: 'COP',
        type,
        variants: formattedVariants.length > 0 ? formattedVariants : undefined,
      });

      setCreatedResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al dar de alta el producto.';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado y Retorno ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/seller/products">
              <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8] hover:text-white mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Dar de Alta Nuevo Producto
            </h1>
          </div>
          <p className="text-sm font-mono text-[#94A3B8]">
            Definición de catálogo comercial e inicialización de variantes SKU para inventario.
          </p>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Validación Requerida</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame Asimétrico (60% Formulario / 40% Resumen / Éxito) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Formulario de Creación (60% -> col-span-7) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Tipo de Producto */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                Tipo de Catálogo
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setType(ProductType.Physical)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    type === ProductType.Physical
                      ? 'border-[#00D4AA] bg-[#00D4AA]/10 text-white'
                      : 'border-[#1F293D] bg-[#161F30]/50 text-[#94A3B8]'
                  }`}
                >
                  <Package className="h-5 w-5 text-[#00D4AA]" />
                  <div>
                    <span className="text-sm font-mono font-bold block">Físico</span>
                    <span className="text-[11px] text-[#64748B]">Requiere SKU y bodega</span>
                  </div>
                </div>

                <div
                  onClick={() => setType(ProductType.Digital)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    type === ProductType.Digital
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-[#1F293D] bg-[#161F30]/50 text-[#94A3B8]'
                  }`}
                >
                  <FileCode className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-sm font-mono font-bold block">Digital</span>
                    <span className="text-[11px] text-[#64748B]">Entrega electrónica</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos Maestros */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                Nombre del Producto
              </label>
              <Input
                placeholder="Ej. Monitor Curvo UltraWide 34''"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#161F30] border-[#1F293D] text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                Descripción
              </label>
              <textarea
                rows={3}
                placeholder="Especificaciones técnicas y detalles del fabricante..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[#1F293D] bg-[#161F30] p-3 text-sm text-white placeholder-[#64748B] focus:border-[#00D4AA] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                Precio Base (COP)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={priceAmount || ''}
                onChange={(e) => setPriceAmount(Number(e.target.value))}
                className="bg-[#161F30] border-[#1F293D] font-mono text-white"
              />
            </div>

            {/* Constructor de Variantes */}
            <div className="space-y-4 pt-4 border-t border-[#1F293D]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-[#94A3B8]">
                    Variantes del Producto (SKU)
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    {type === ProductType.Physical
                      ? 'Obligatorio definir al menos un SKU para abastecer existencias.'
                      : 'Opcional para productos digitales sin partición física.'}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  className="border-[#1F293D] text-[#00D4AA] hover:bg-[#161F30] text-xs font-mono"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Variante
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 rounded-xl border border-[#1F293D] bg-[#161F30]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        Variante #{index + 1}
                      </span>
                      {variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariant(index)}
                          className="text-red-400 hover:text-red-300 h-7 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">
                          Código SKU
                        </label>
                        <Input
                          placeholder="SKU-REF-01"
                          value={variant.sku}
                          onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          className="bg-[#111827] border-[#1F293D] font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">
                          Atributo (ej. Color)
                        </label>
                        <Input
                          placeholder="Nombre"
                          value={variant.attrName}
                          onChange={(e) => handleVariantChange(index, 'attrName', e.target.value)}
                          className="bg-[#111827] border-[#1F293D] text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">
                          Valor (ej. Azul)
                        </label>
                        <Input
                          placeholder="Valor"
                          value={variant.attrValue}
                          onChange={(e) => handleVariantChange(index, 'attrValue', e.target.value)}
                          className="bg-[#111827] border-[#1F293D] text-xs text-white"
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
              className="w-full h-12 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-bold text-sm shadow-lg shadow-[#00D4AA]/20 disabled:opacity-50"
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
            <div className="rounded-2xl border border-[#00D4AA]/40 bg-[#111827] p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-[#00D4AA]" />
                <div>
                  <h2 className="text-lg font-bold text-white font-sans">
                    ¡Producto Registrado con Éxito!
                  </h2>
                  <p className="text-xs font-mono text-[#00D4AA]">
                    Publicado en catálogo comercial
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs border-t border-[#1F293D] pt-4">
                <div>
                  <span className="text-[#64748B] block">ID de Producto:</span>
                  <span className="text-white font-bold">{createdResult.productId}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">
                    Variantes creadas ({createdResult.variantIds.length}):
                  </span>
                  <div className="space-y-1 mt-1">
                    {createdResult.variantIds.map((varId, idx) => (
                      <div key={varId} className="bg-[#161F30] p-2 rounded border border-[#1F293D] text-[#00D4AA]">
                        Variante #{idx + 1}: {varId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1F293D] pt-4 space-y-3">
                <p className="text-xs text-[#94A3B8]">
                  Las variantes físicas se crean inicialmente sin existencias (`canBeSold = false`). Continúe al módulo de inventario para cargar el stock inicial en bodega.
                </p>

                <Link to="/seller/inventory">
                  <Button className="w-full bg-[#00D4AA] text-[#0B0F19] font-bold">
                    <Boxes className="h-4 w-4 mr-2" />
                    Cargar Stock Inicial en Bodega
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4 shadow-xl">
              <h2 className="text-sm uppercase font-mono tracking-wider text-[#94A3B8]">
                Vista Previa del Catálogo
              </h2>
              <div className="rounded-xl border border-[#1F293D] bg-[#161F30]/40 p-5 space-y-3">
                <span className="text-xs font-mono text-[#00D4AA] font-bold">
                  {name || 'Nombre del Producto'}
                </span>
                <p className="text-xs text-[#94A3B8]">
                  {description || 'Aquí aparecerá la descripción técnica...'}
                </p>
                <div className="text-lg font-bold font-mono text-white tabular-nums pt-2 border-t border-[#1F293D]">
                  ${priceAmount.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
