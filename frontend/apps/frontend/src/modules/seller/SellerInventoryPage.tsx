import { useState, useMemo } from 'react';
import { alertAdapter } from '../../app/providers/alertAdapter';
import { useSearch } from '@tanstack/react-router';
import { useInventoriesPagedQuery, useAddStockMutation, useDeleteInventoryMutation } from '../../application/services/inventory';
import { useWarehousesQuery } from '../../application/services/warehouses';
import { useProductsPagedQuery } from '../../application/services/catalog';
import { mensajeDeError } from '../../components/errorMessage';
import type { Inventory, Warehouse, Product, ProductVariant, ListInventoriesPagedParams } from '../../domain';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
  Pagination,
  useDebounce,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  StatusBadge,
  Label,
} from '@zentric/ui';
import {
  Warehouse as WarehouseIcon,
  PlusCircle,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;


/**
 * Gestión de Inventario del Vendedor (SellerInventoryPage - Frontend-Role-Modules sección 2.3).
 * Split-Frame Asimétrico (65% Tabla de Posiciones / 35% Carga de Stock).
 * Muestra existencias divididas en available, reserved, used y damaged en Geist Mono tabular-nums.
 * Paginación server-side: el backend filtra, pagina y ordena; el frontend solo renderiza.
 */
export function SellerInventoryPage() {
  const search = useSearch({ strict: false }) as { variantId?: string };

  const [searchInput, setSearchInput] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('All');
  const [page, setPage] = useState(1);

  // Formulario AddStock: desacoplado del URL fallback para permitir limpiar sin atrapar
  const [targetVariantId, setTargetVariantId] = useState(search.variantId ?? '');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [stockQuantity, setStockQuantity] = useState<string>('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Notificaciones contextuales para la tabla y acciones destructivas
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableSuccess, setTableSuccess] = useState<string | null>(null);

  // Sincronizar cuando search.variantId cambie externamente sin efecto en cascada (React adjust state during render)
  const [prevSearchVariantId, setPrevSearchVariantId] = useState(search.variantId);
  if (search.variantId !== prevSearchVariantId) {
    setPrevSearchVariantId(search.variantId);
    if (search.variantId) {
      setTargetVariantId(search.variantId);
    }
  }

  const debouncedSearch = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  // El servidor filtra, pagina y ordena: nada de re-filtrar la página recibida.
  const params: ListInventoriesPagedParams = {
    page,
    size: PAGE_SIZE,
    warehouseId: selectedWarehouseId === 'All' ? undefined : selectedWarehouseId,
    search: debouncedSearch || undefined,
  };

  const { data: pagedResult, isLoading: isLoadingInventories, isError: isErrorInventories, error: errorInventories, refetch: refetchInventories, isFetching: isFetchingInventories } = useInventoriesPagedQuery(params);
  const inventories = pagedResult?.items ?? [];
  const totalItems = pagedResult?.totalItems ?? 0;
  const totalPages = pagedResult?.totalPages ?? 0;

  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehousesQuery();
  const { data: productsResult } = useProductsPagedQuery();
  const products = useMemo(() => productsResult?.items ?? [], [productsResult?.items]);

  const addStockMutation = useAddStockMutation();
  const deleteInventoryMutation = useDeleteInventoryMutation();

  const allWarehouses = useMemo(() => warehouses ?? [], [warehouses]);
  const hasFilters = debouncedSearch !== '' || selectedWarehouseId !== 'All';

  const warehouseMap = useMemo(
    () => new Map<string, Warehouse>(allWarehouses.map((w: Warehouse) => [w.id, w])),
    [allWarehouses],
  );

  const activeWarehouses = useMemo(
    () => allWarehouses.filter((w: Warehouse) => w.isActive),
    [allWarehouses],
  );

  const allProductVariants = useMemo(
    () =>
      products.flatMap((p: Product) =>
        (p.variants ?? []).map((v: ProductVariant) => ({
          id: v.id,
          label: `${p.name} — SKU: ${v.sku}`,
          productName: p.name,
          sku: v.sku,
        })),
      ),
    [products],
  );

  const effectiveVariantId = targetVariantId;
  const effectiveWarehouseId =
    targetWarehouseId ||
    (activeWarehouses.length === 1
      ? (activeWarehouses[0]?.id ?? '')
      : allWarehouses.length === 1
        ? (allWarehouses[0]?.id ?? '')
        : '');

  // Limpia todos los campos del formulario de abastecer sin re-atrapar el variantId de la URL
  const clearForm = () => {
    setTargetVariantId('');
    setTargetWarehouseId('');
    setStockQuantity('1');
    setFormError(null);
    setFormSuccess(null);
  };

  // Orden de presencia: la variante seleccionada en el formulario se destaca en la tabla
  const presenceVariantId = targetVariantId.trim();

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!effectiveVariantId.trim()) {
      setFormError('Debe especificar el identificador de la variante.');
      return;
    }

    if (!effectiveWarehouseId.trim()) {
      setFormError('Debe seleccionar una bodega de destino.');
      return;
    }

    const trimmedQuantity = stockQuantity.trim();
    if (!trimmedQuantity) {
      setFormError('Debe ingresar la cantidad de unidades.');
      return;
    }

    if (!/^\d+$/.test(trimmedQuantity)) {
      setFormError('La cantidad debe ser un número entero sin decimales.');
      return;
    }

    const quantity = Number(trimmedQuantity);
    if (quantity <= 0) {
      setFormError('La cantidad a ingresar debe ser mayor que cero (INV-01).');
      return;
    }

    if (quantity > 1000000) {
      setFormError('La cantidad no puede superar 1.000.000 de unidades por operación.');
      return;
    }

    try {
      await addStockMutation.mutateAsync({
        variantId: effectiveVariantId.trim(),
        warehouseId: effectiveWarehouseId.trim(),
        quantity,
      });

      setFormSuccess(`Ingreso de ${quantity} unidades registrado exitosamente.`);
      setStockQuantity('1');
    } catch (err) {
      setFormError(mensajeDeError(err));
    }
  };

  const handleSelectInventory = (inv: Inventory) => {
    setTargetVariantId(inv.variantId);
    setTargetWarehouseId(inv.warehouseId);
    setStockQuantity('1');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleDeleteInventory = async (inv: Inventory) => {
    setTableError(null);
    setTableSuccess(null);

    const physicalStock =
      inv.availableQuantity +
      inv.reservedQuantity +
      inv.damagedQuantity +
      (inv.usedQuantity ?? 0);

    if (physicalStock > 0) {
      await alertAdapter.confirm({
        title: 'No se puede eliminar el inventario',
        description: `Este registro todavía tiene ${physicalStock} unidades físicas activas (disponibles, reservadas, usadas o dañadas). Debe ajustar todas las existencias a cero antes de eliminar el registro.`,
        confirmLabel: 'Entendido',
        variant: 'default',
      });
      return;
    }

    const accepted = await alertAdapter.confirm({
      title: 'Eliminar registro de inventario',
      description:
        'El registro dejará de aparecer en el inventario. Esta acción no se puede deshacer desde la interfaz.',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!accepted) return;

    try {
      await deleteInventoryMutation.mutateAsync(inv.id);
      setTableSuccess(`Registro de inventario de "${inv.productName || 'producto'}" eliminado.`);
      if (inventories.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      setTableError(mensajeDeError(err));
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
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
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
              {totalItems} Posiciones
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
          {/* Notificaciones contextuales para la tabla y acciones destructivas */}
          {tableError && (
            <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <AlertDescription className="text-xs">{tableError}</AlertDescription>
            </Alert>
          )}

          {tableSuccess && (
            <Alert className="border-success/40 bg-success/10 text-success">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <AlertDescription className="text-xs">{tableSuccess}</AlertDescription>
            </Alert>
          )}

          {/* Controles de Búsqueda y Filtrado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                id="inventory-search-input"
                type="text"
                placeholder="Buscar por producto o SKU..."
                aria-label="Buscar por producto o SKU"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>
            <select
              id="inventory-warehouse-filter"
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por bodega"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todas las bodegas</option>
              {allWarehouses.map((w: Warehouse) => (
                <option key={w.id} value={w.id}>
                  {w.name ? `${w.name} (${w.location})` : w.location} ({w.type})
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de Existencias */}
          {inventories.length === 0 ? (
            <StateView
              tone="empty"
              title="No hay existencias registradas"
              description={
                hasFilters
                  ? 'No hay inventarios que coincidan con los filtros aplicados.'
                  : 'Aún no has registrado existencias de tus variantes en ninguna bodega física.'
              }
              action={
                hasFilters
                  ? {
                      label: 'Limpiar filtros',
                      onClick: () => {
                        setSearchInput('');
                        setSelectedWarehouseId('All');
                        setPage(1);
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <Table aria-label="Inventario de productos por almacén" className="w-full text-left text-sm text-foreground font-sans">
                <TableHeader className="bg-surface-muted text-xs font-semibold text-foreground-muted uppercase tracking-wider border-b border-border">
                  <TableRow>
                    <TableHead scope="col" className="py-3 px-4">Variante / SKU</TableHead>
                    <TableHead scope="col" className="py-3 px-4">Bodega</TableHead>
                    <TableHead scope="col" className="py-3 px-4 text-right">Disponible</TableHead>
                    <TableHead scope="col" className="py-3 px-4 text-right">Reservado</TableHead>
                    <TableHead scope="col" className="py-3 px-4 text-right">Usado</TableHead>
                    <TableHead scope="col" className="py-3 px-4 text-right">Dañado</TableHead>
                    <TableHead scope="col" className="py-3 px-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {inventories.map((inv: Inventory) => {
                    const warehouse = warehouseMap.get(inv.warehouseId);
                    const isPresence = Boolean(presenceVariantId) && inv.variantId === presenceVariantId;
                    const physicalStock =
                      inv.availableQuantity +
                      inv.reservedQuantity +
                      inv.damagedQuantity +
                      (inv.usedQuantity ?? 0);
                    const hasPhysicalStock = physicalStock > 0;
                    const warehouseName = warehouse
                      ? (warehouse.name ? `${warehouse.name} (${warehouse.location})` : warehouse.location)
                      : 'Bodega Física';

                    return (
                      <TableRow
                        key={inv.id}
                        tabIndex={0}
                        role="row"
                        onClick={() => handleSelectInventory(inv)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectInventory(inv);
                          }
                        }}
                        aria-selected={isPresence}
                        className={
                          isPresence
                            ? 'bg-brand/10 border-l-4 border-brand hover:bg-brand/15 transition-colors cursor-pointer'
                            : 'hover:bg-surface-muted/40 transition-colors cursor-pointer'
                        }
                      >
                        <TableCell className="py-4 px-4">
                          <div className="font-medium text-foreground" title={inv.variantId}>
                            {inv.productName || 'Producto sin nombre'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-brand font-semibold">
                              SKU: {inv.sku || '—'}
                            </span>
                            {isPresence && (
                              <StatusBadge tone="info" className="ml-2">
                                ↑ Presencia
                              </StatusBadge>
                            )}
                            {inv.availableQuantity === 0 ? (
                              <StatusBadge tone="danger">Agotado</StatusBadge>
                            ) : inv.availableQuantity <= 5 ? (
                              <StatusBadge tone="warning">Bajo Stock</StatusBadge>
                            ) : (
                              <StatusBadge tone="success">En Stock</StatusBadge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            <WarehouseIcon className="h-3.5 w-3.5 text-foreground-muted" />
                            {warehouseName}
                          </div>
                          <div className="text-xs text-foreground-muted">
                            Tipo: {warehouse?.type ?? 'Marketplace'}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                          {inv.availableQuantity}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-warning tabular-nums">
                          {inv.reservedQuantity}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-foreground-muted tabular-nums">
                          {inv.usedQuantity}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-mono text-destructive tabular-nums">
                          {inv.damagedQuantity}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInventory(inv);
                            }}
                            disabled={deleteInventoryMutation.isPending || hasPhysicalStock}
                            className={
                              hasPhysicalStock
                                ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed'
                                : 'border-destructive/40 text-destructive hover:bg-destructive/10'
                            }
                            title={
                              hasPhysicalStock
                                ? 'No se puede eliminar: el registro tiene existencias físicas activas (deben ajustarse a 0 primero)'
                                : `Eliminar inventario de ${inv.productName || 'producto'} en almacén ${warehouseName}`
                            }
                            aria-label={`Eliminar inventario de ${inv.productName || 'producto'} en almacén ${warehouseName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage}
              className="mt-6"
            />
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
              <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            {formSuccess && (
              <Alert className="border-success/40 bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-xs">{formSuccess}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAddStock} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-variant-select" className="text-xs font-semibold text-foreground-muted">
                  Variante a Abastecer
                </Label>
                <select
                  id="target-variant-select"
                  value={effectiveVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  aria-label="Seleccionar variante de producto"
                  className="w-full bg-surface-muted border border-border text-foreground text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Seleccionar Variante --</option>
                  {allProductVariants.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                  {effectiveVariantId &&
                    !allProductVariants.some((v) => v.id === effectiveVariantId) && (
                      <option value={effectiveVariantId}>{effectiveVariantId}</option>
                    )}
                </select>
                <Label htmlFor="target-variant-id" className="text-[11px] text-foreground-muted font-normal block">
                  O ingresa el ID si no aparece en el listado:
                </Label>
                <Input
                  id="target-variant-id"
                  type="text"
                  placeholder="ID de Variante (UUID)"
                  value={effectiveVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-xs placeholder:text-foreground-muted focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-warehouse-select" className="text-xs font-semibold text-foreground-muted">
                  Bodega de Recepción
                </Label>
                <select
                  id="target-warehouse-select"
                  value={effectiveWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  aria-label="Seleccionar bodega de recepción"
                  className="w-full bg-surface-muted border border-border text-foreground text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Seleccionar Bodega --</option>
                  {activeWarehouses.map((w: Warehouse) => (
                    <option key={w.id} value={w.id}>
                      {w.name ? `${w.name} (${w.location})` : w.location} — {w.type === 'Marketplace' ? '⚡ Centro Fulfillment Zentric' : '📦 Bodega Propia'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-quantity" className="text-xs font-semibold text-foreground-muted">
                  Cantidad de Unidades
                </Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min={1}
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-sm focus:border-brand"
                  aria-label="Cantidad de unidades a ingresar"
                />
                <p className="text-[11px] text-foreground-muted">
                  Debe ser un entero mayor a cero (INV-01).
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={addStockMutation.isPending}
                  className="w-full font-semibold"
                  title="Limpiar campos del formulario"
                >
                  Limpiar
                </Button>
                <Button
                  type="submit"
                  disabled={addStockMutation.isPending}
                  className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold"
                  title="Ingresar existencias en la bodega seleccionada"
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
              </div>
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
