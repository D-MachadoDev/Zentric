import { useState } from 'react';
import { useInventoriesQuery, useAddStockMutation } from '../../application/services/inventory';
import { useWarehousesQuery } from '../../application/services/warehouses';
import { useProductsQuery } from '../../application/services/catalog';
import type { Inventory, Warehouse, Product, ProductVariant } from '../../domain';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
} from '@zentric/ui';
import {
  Warehouse as WarehouseIcon,
  PlusCircle,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';


/**
 * Gestión de Inventario del Vendedor (SellerInventoryPage - Frontend-Role-Modules §2.3).
 * Split-Frame Asimétrico (65% Tabla de Posiciones / 35% Carga de Stock).
 * Muestra existencias divididas en available, reserved, used y damaged en Geist Mono tabular-nums.
 */
export function SellerInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('All');

  // Formulario AddStock
  const [targetVariantId, setTargetVariantId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const {
    data: inventories,
    isLoading: isLoadingInventories,
    isError: isErrorInventories,
    error: errorInventories,
    refetch: refetchInventories,
    isFetching: isFetchingInventories,
  } = useInventoriesQuery();

  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehousesQuery();
  const { data: products } = useProductsQuery();
  const addStockMutation = useAddStockMutation();

  const allInventories = inventories ?? [];
  const allWarehouses = warehouses ?? [];
  const allProducts = products ?? [];

  // Mapeos auxiliares para nombres y SKUs
  const warehouseMap = new Map<string, Warehouse>(allWarehouses.map((w: Warehouse) => [w.id, w]));
  const variantInfoMap = new Map<string, { sku: string; productName: string }>();

  allProducts.forEach((p: Product) => {
    (p.variants ?? []).forEach((v: ProductVariant) => {
      variantInfoMap.set(v.id, { sku: v.sku, productName: p.name });
    });
  });

  const filteredInventories = allInventories.filter((inv: Inventory) => {
    const variantInfo = variantInfoMap.get(inv.variantId);
    const sku = variantInfo?.sku ?? '';
    const productName = variantInfo?.productName ?? '';
    const warehouse = warehouseMap.get(inv.warehouseId);
    const warehouseLoc = warehouse?.location ?? '';

    const matchesSearch =
      !searchTerm.trim() ||
      inv.variantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouseLoc.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWarehouse =
      selectedWarehouseId === 'All' || inv.warehouseId === selectedWarehouseId;

    return matchesSearch && matchesWarehouse;
  });

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!targetVariantId.trim()) {
      setFormError('Debe especificar el identificador de la variante.');
      return;
    }

    if (!targetWarehouseId.trim()) {
      setFormError('Debe seleccionar una bodega de destino.');
      return;
    }

    if (stockQuantity <= 0) {
      setFormError('La cantidad a ingresar debe ser mayor que cero (INV-01).');
      return;
    }

    try {
      await addStockMutation.mutateAsync({
        variantId: targetVariantId.trim(),
        warehouseId: targetWarehouseId.trim(),
        quantity: stockQuantity,
      });

      setFormSuccess(`Ingreso de ${stockQuantity} unidades registrado exitosamente.`);
      setStockQuantity(1);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Error al registrar existencias en la bodega.'
      );
    }
  };

  if (isLoadingInventories || isLoadingWarehouses) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isErrorInventories) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el inventario</AlertTitle>
          <AlertDescription>
            {errorInventories instanceof Error
              ? errorInventories.message
              : 'Ocurrió un error inesperado al consultar las posiciones de stock.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetchInventories()}
          variant="outline"
          className="border-border text-foreground hover:bg-border"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado de Inventario ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Existencias y Abastecimiento
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {allInventories.length} Posiciones
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Auditoría de existencias por bodega y carga atómica de stock nuevo para variantes propias.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchInventories()}
          disabled={isFetchingInventories}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingInventories ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Posiciones de Stock ───────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Filtrado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por SKU, variante o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              aria-label="Filtrar por bodega"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todas las bodegas</option>
              {allWarehouses.map((w: Warehouse) => (
                <option key={w.id} value={w.id}>
                  {w.location} ({w.type})
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de Existencias */}
          {filteredInventories.length === 0 ? (
            <StateView
              state="empty"
              title="No hay existencias registradas"
              description={
                searchTerm || selectedWarehouseId !== 'All'
                  ? 'No hay inventarios que coincidan con los filtros aplicados.'
                  : 'Aún no has registrado existencias de tus variantes en ninguna bodega física.'
              }
            />
          ) : (

            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground font-sans">
                  <thead className="bg-surface-muted text-xs font-semibold text-foreground-muted uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Variante / SKU</th>
                      <th className="py-3 px-4">Bodega</th>
                      <th className="py-3 px-4 text-right">Disponible</th>
                      <th className="py-3 px-4 text-right">Reservado</th>
                      <th className="py-3 px-4 text-right">Usado</th>
                      <th className="py-3 px-4 text-right">Dañado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredInventories.map((inv: Inventory) => {
                      const variantInfo = variantInfoMap.get(inv.variantId);
                      const warehouse = warehouseMap.get(inv.warehouseId);

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-surface-muted/40 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="font-medium text-foreground">
                              {variantInfo?.productName ?? 'Variante Registrada'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono text-brand font-semibold">
                                SKU: {variantInfo?.sku ?? inv.variantId.substring(0, 8)}
                              </span>
                              {inv.availableQuantity === 0 ? (
                                <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px] font-mono">
                                  Agotado
                                </Badge>
                              ) : inv.availableQuantity <= 5 ? (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-mono">
                                  Bajo Stock
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                                  En Stock
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-foreground-muted">
                              ID: {inv.variantId}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <WarehouseIcon className="h-3.5 w-3.5 text-foreground-muted" />
                              {warehouse?.location ?? 'Bodega Física'}
                            </div>
                            <div className="text-xs text-foreground-muted">
                              Tipo: {warehouse?.type ?? 'Marketplace'}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                            {inv.availableQuantity}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-warning tabular-nums">
                            {inv.reservedQuantity}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-foreground-muted tabular-nums">
                            {inv.usedQuantity}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-red-400 tabular-nums">
                            {inv.damagedQuantity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Panel de Carga de Stock ────────────────── */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-bold text-foreground font-sans">
                  Ingreso de Stock
                </h2>
              </div>
              <p className="text-xs text-foreground-muted">
                Abastece unidades de una variante en una bodega física de la red.
              </p>
            </div>

            {formError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            {formSuccess && (
              <Alert className="border-brand/40 bg-brand/10 text-brand">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                <AlertDescription className="text-xs">{formSuccess}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAddStock} noValidate className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground-muted">
                  Variante a Abastecer
                </label>
                <select
                  value={targetVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  aria-label="Seleccionar variante de producto"
                  className="w-full bg-surface-muted border border-border text-foreground text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Seleccionar Variante --</option>
                  {allProducts.flatMap((p: Product) =>
                    (p.variants ?? []).map((v: ProductVariant) => (
                      <option key={v.id} value={v.id}>
                        {p.name} — SKU: {v.sku}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-foreground-muted">
                  O ingresa el ID si no aparece en el listado:
                </p>
                <Input
                  type="text"
                  placeholder="ID de Variante (UUID)"
                  value={targetVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-xs placeholder:text-foreground-muted focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground-muted">
                  Bodega de Recepción
                </label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  aria-label="Seleccionar bodega"
                  className="w-full bg-surface-muted border border-border text-foreground text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Seleccionar Bodega --</option>
                  {allWarehouses.map((w: Warehouse) => (
                    <option key={w.id} value={w.id}>
                      {w.location} — {w.type === 'Marketplace' ? '⚡ Centro Fulfillment Zentric' : '📦 Bodega Propia'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground-muted">
                  Cantidad de Unidades
                </label>
                <Input
                  type="number"
                  min={1}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                  className="bg-surface-muted border-border text-foreground font-mono text-sm focus:border-brand"
                />
                <p className="text-[11px] text-foreground-muted">
                  Debe ser un entero mayor a cero (INV-01).
                </p>
              </div>

              <Button
                type="submit"
                disabled={addStockMutation.isPending}
                className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold"
              >
                {addStockMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Registrando...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" /> Ingresar Existencias
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted font-sans">
              Regla de Stock Cero-Negativos
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Zentric garantiza existencias consistentes bajo concurrencia extrema. Las existencias
              disponibles ingresadas son reservadas atómicamente por compradores durante el checkout
              de 15 minutos (ADR-0020).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
