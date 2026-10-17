import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useProductQuery } from '../../application/services/catalog';
import { useOrdersQuery, useCreateCartMutation, useAddCartItemMutation } from '../../application/services/orders';
import { ProductType, type ProductVariant } from '../../domain';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  FileCode,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

/**
 * Ficha Técnica y Detalle del Producto para el Comprador (Frontend-Role-Modules §2.4).
 * Split-Frame Asimétrico (60% / 40%) con selector de variantes y adición al carrito.
 * Invariante de Seguridad: No invoca inventories; valida exclusivamente `canBeSold`.
 */
export function BuyerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const { data: cartOrders } = useOrdersQuery('Cart');

  const createCartMutation = useCreateCartMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inicializar variante seleccionada cuando el producto cargue
  const variants = product?.variants ?? [];
  const activeVariant = variants.find((v: ProductVariant) => v.id === selectedVariantId) ?? variants[0];

  const handleAddToCart = async () => {
    if (!activeVariant || !activeVariant.canBeSold) return;
    setFeedback(null);

    try {
      // 1. Obtener carrito existente o crear uno nuevo
      let activeCartId = cartOrders?.[0]?.id ?? null;
      if (!activeCartId) {
        activeCartId = await createCartMutation.mutateAsync();
      }

      // 2. Agregar ítem al carrito (dispara la reserva atómica de 15 minutos en el backend)
      await addCartItemMutation.mutateAsync({
        orderId: activeCartId,
        variantId: activeVariant.id,
        quantity,
      });

      setFeedback({
        type: 'success',
        message: `¡${quantity} unidad(es) de ${product?.name} agregada(s) al carrito con reserva de stock!`,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'No fue posible agregar el ítem al carrito.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-[#111827]" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8]">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el producto</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'El producto solicitado no existe o no está publicado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isSoldOut = !activeVariant || !activeVariant.canBeSold;
  const unitPrice = product.price;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Navegación y Breadcrumb ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8] hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>

        <Link to="/buyer/cart">
          <Button variant="secondary" size="sm" className="bg-[#111827] border border-[#1F293D] text-[#00D4AA]">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Ver Carrito
          </Button>
        </Link>
      </div>

      {/* ── Mensajes de Feedback ─────────────────────────────────────────── */}
      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'default' : 'destructive'}
          className={
            feedback.type === 'success'
              ? 'border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]'
              : 'border-red-900 bg-red-950/40 text-red-200'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-[#00D4AA]" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <AlertTitle>{feedback.type === 'success' ? 'Operación Exitosa' : 'Aviso de Compra'}</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame Asimétrico (60% Especificaciones / 40% Compra) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Ficha Técnica (60% -> col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    product.type === ProductType.Physical
                      ? 'border-[#00D4AA]/30 text-[#00D4AA] bg-[#00D4AA]/5'
                      : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                  }`}
                >
                  {product.type === ProductType.Physical ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Package className="h-3 w-3" /> Producto Físico
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-mono">
                      <FileCode className="h-3 w-3" /> Producto Digital
                    </span>
                  )}
                </Badge>
                <span className="text-xs font-mono text-[#64748B] flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Zentric Marketplace
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Fotografía Protagonista del Producto */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#161F30] border border-[#1F293D]">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#161F30] to-[#111827] text-[#64748B]">
                  <Package className="h-16 w-16 opacity-30" />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1F293D]">
              <h2 className="text-xs uppercase font-mono tracking-wider text-[#94A3B8]">
                Descripción del Producto
              </h2>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {product.description || 'Sin descripción detallada provista por el vendedor.'}
              </p>
            </div>

            {/* Listado de Variantes Disponibles */}
            <div className="space-y-3 pt-4 border-t border-[#1F293D]">
              <h2 className="text-xs uppercase font-mono tracking-wider text-[#94A3B8]">
                Variantes del Producto ({variants.length})
              </h2>

              <div className="space-y-2">
                {variants.map((v: ProductVariant) => {
                  const isSelected = (activeVariant?.id === v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#00D4AA] bg-[#00D4AA]/10'
                          : 'border-[#1F293D] bg-[#161F30]/60 hover:border-[#94A3B8]/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">SKU: {v.sku}</span>
                          {v.canBeSold ? (
                            <Badge className="bg-[#00D4AA]/20 text-[#00D4AA] border-[#00D4AA]/30 text-[10px] font-mono">
                              Disponible
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-mono">
                              Agotado
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs uppercase font-mono text-[#64748B] block">Precio</span>
                        <span className="text-base font-bold font-mono text-white tabular-nums">
                          ${unitPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Panel de Adición y Checkout (40% -> col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6 shadow-xl sticky top-6">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono tracking-wider text-[#64748B]">
                Total de Compra
              </span>
              <div className="text-3xl font-extrabold font-mono text-white tabular-nums">
                ${totalPrice.toLocaleString('es-CO', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Selector de cantidad */}
            <div className="space-y-2 pt-4 border-t border-[#1F293D]">
              <label htmlFor="quantity" className="text-xs uppercase font-mono tracking-wider text-[#94A3B8] block">
                Cantidad a comprar
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isSoldOut}
                  className="border-[#1F293D] text-white hover:bg-[#161F30]"
                >
                  -
                </Button>
                <span className="font-mono font-bold text-lg text-white w-10 text-center tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={isSoldOut}
                  className="border-[#1F293D] text-white hover:bg-[#161F30]"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Acción de Reserva y Compra */}
            <div className="pt-2">
              <Button
                onClick={handleAddToCart}
                disabled={isSoldOut || addCartItemMutation.isPending || createCartMutation.isPending}
                className="w-full h-12 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-bold text-base shadow-lg shadow-[#00D4AA]/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {addCartItemMutation.isPending || createCartMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 animate-spin" />
                    Reservando en bodega...
                  </span>
                ) : isSoldOut ? (
                  'Variante sin existencias'
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Agregar al Carrito
                  </span>
                )}
              </Button>
            </div>

            {/* Invariante de Reserva Atómica Explicada */}
            <div className="rounded-xl border border-[#1F293D] bg-[#161F30]/50 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#00D4AA] font-mono font-semibold">
                <Clock className="h-4 w-4" />
                Reserva Atómica de 15 Minutos
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Al confirmar el checkout en su carrito, el sistema reserva existencias exclusivas en bodega física durante 15 minutos para que complete su pago con total seguridad.
              </p>
              <div className="flex items-center gap-2 text-[#64748B] pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Garantía de stock verificado sin sobreventa.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
