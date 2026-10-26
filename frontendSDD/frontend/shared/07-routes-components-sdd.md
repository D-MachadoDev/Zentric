# Zentric — SDD transversal: Rutas, Componentes y Estado Compartido

## 1. Convenciones de routing (TanStack Router)

### 1.1 Route Tree (resumen)
```
/                                    → PublicLayout → Home / Categorías / Buscar
/auth/
  login                              → AuthLayout → LoginPage
  register                           → AuthLayout → RegisterBuyerPage
  recovery/request                   → AuthLayout → RecoveryRequestPage
  recovery/confirm                   → AuthLayout → RecoveryConfirmPage
/buyer/                              → BuyerLayout (data-role="buyer")
  catalogo                           → BuyerCatalogPage
  catalogo/$categoryId               → BuyerCategoryPage
  producto/$productId                → BuyerProductDetailPage
  carrito                            → BuyerCartPage
  checkout                           → BuyerCheckoutPage
  pedidos                            → BuyerOrdersPage
  pedidos/$orderId                   → BuyerOrderDetailPage
  perfil                             → BuyerProfilePage
  direcciones                        → BuyerAddressesPage
  devoluciones                       → BuyerReturnsPage
  devoluciones/$returnId             → BuyerReturnDetailPage
/seller/                             → SellerLayout (data-role="seller")
  dashboard                          → SellerDashboardPage
  productos                          → SellerProductsPage
  productos/crear                    → CreateProductPage
  productos/$productId/editar        → EditProductPage
  inventario                         → SellerInventoryPage
  pedidos                            → SellerOrdersPage
  pedidos/$orderId                   → SellerOrderDetailPage
  cumplimientos                      → SellerFulfillmentsPage
  cumplimientos/$fulfillmentId       → SellerFulfillmentDetailPage
  devoluciones                       → SellerReturnsPage
/logistics/                          → LogisticsLayout (data-role="logistics")
  cola                               → LogisticsQueuePage
  cumplimiento/$fulfillmentId        → LogisticsFulfillmentDetailPage
  inspeccion-devoluciones            → LogisticsReturnsInspectPage
  transportadoras                    → LogisticsCarriersPage
/supervisor/                         → SupervisorLayout (data-role="supervisor")
  dashboard                          → SupervisorDashboardPage
  auditoria/pedidos/$orderId         → SupervisorOrderAuditPage
  libro-mayor                        → SupervisorInvoicesPage
  inventario                         → SupervisorInventoryAuditPage
  logistica                          → SupervisorFulfillmentsPage
  fiscalizacion                      → SupervisorDashboardPage (tab)
  reportes                           → SupervisorReportsPage
/admin/                              → AdminLayout (data-role="admin")
  dashboard                          → AdminDashboardPage
  usuarios                           → AdminUserListPage
  usuarios/crear                     → CreateUserPage
  vendedores                         → AdminSellersPage
  vendedores/$sellerId               → AdminSellerDetailPage
  bodegas                            → AdminWarehouseListPage
  productos                          → AdminProductsPage
  categorias                         → AdminCategoriesPage
  configuracion                      → AdminConfigPage
  transportadoras                    → AdminCarriersPage
  reportes                           → AdminReportsPage
  auditoria                          → AdminAuditPage
```

### 1.2 Search params estandarizados
| Parámetro | Tipo | Uso |
|-----------|------|-----|
| `q` | string | Búsqueda texto libre |
| `category` | string (uuid) | Filtro categoría |
| `status` | enum | Filtro estado (ProductStatus, OrderStatus, etc.) |
| `type` | enum | Filtro tipo (Physical/Digital) |
| `vendor` | string (uuid) | Filtro vendedor (Admin/Supervisor) |
| `warehouse` | string (uuid) | Filtro bodega |
| `dateFrom` | ISO8601 | Rango fecha inicio |
| `dateTo` | ISO8601 | Rango fecha fin |
| `sort` | string | Campo,ej: `-createdAt,status` |
| `cursor` | string | Cursor pagination (opaco) |
| `page` | int | Page pagination (admin) |
| `pageSize` | int | Tamaño página (max 100) |

### 1.3 Navegación programática
- `router.navigate({ to: '/seller/productos', search: { status: 'Draft' } })`
- `router.preload()` en `onMouseEnter` de links de tabla → precarga data.
- `useSearch()` tipado en cada página (Zod schema derivado de OpenAPI).

## 2. Componentes compartidos (`@zentric/ui` + composite)

### 2.1 Layout primitives
- `Sidebar` (colapsible, mobile drawer, `data-role` theming)
- `Header` (logo, search global, user menu, notificaciones, theme toggle)
- `Breadcrumbs` (auto desde ruta, `aria-label="Breadcrumb"`)
- `PageHeader` (título + subtitle + actions + badge contador)
- `SectionCard` (rounded-2xl border border-border bg-surface p-5/6)

### 2.2 Data display
- `DataTable` (TanStack Table v8 + `DataTableColumn` tipado, sortable, filterable, pagination, row selection, virtualization opcional)
- `StatCard` (label, value, trend, icon, color token)
- `StatusBadge` (dot + label, tokens: success/warning/danger/info/neutral)
- `MoneyAmount` (intl.NumberFormat, currency ISO, compact notation opcional)
- `OrderTimeline` (steps inmutables, icon + label + timestamp + actor, `aria-live="polite"`)
- `EmptyState` (ilustración + título + descripción + CTA primario)
- `Skeleton` (estructural, match component real, `animate-pulse`)

### 2.3 Forms
- `FormField` (label + input + error + help text + `aria-describedby`)
- `FormSelect` (Radix Select + searchable + async options)
- `FormDateRange` (two inputs + popover calendar)
## 3. Estado compartido (Client-only, mínimo)

### 3.1 Session (`Zustand` / `Jotai`)
```ts
interface SessionState {
  user: UserProfile | null;      // { id, email, name, role, entityId, status }
  accessToken: string | null;    // solo en memoria, no persistido
  isAuthenticated: boolean;
  setSession: (session: SessionState) => void;
  clearSession: () => void;
}
```
- Hidratación: Server Component root layout → `session` prop → `SessionProvider` inicializa store.
- Refresh automático: Interceptor API detecta 401 → llama `/auth/refresh` → actualiza store → reintenta request.

### 3.2 UI State (local por feature)
- Filtros de tabla → `useSearchParams` (URL state, no global store).
- Modals/drawers → `useState` local o `Radix` state.
- Carrito optimista (Buyer) → `useOptimistic` (TanStack Query) + `CustomerOrder` server sync.

### 3.3 No estado global de negocio
- **Prohibido**: Redux/Context para `Product`, `Order`, `Inventory`, `User` entities.
- **Fuente de verdad**: TanStack Query cache (server state) + URL (navigation state).

## 4. Hooks compartidos (`src/hooks/`)
| Hook | Propósito |
|------|-----------|
| `useDebounce(value, ms)` | Debounce genérico para search inputs |
| `useMediaQuery(query)` | Match media reactive (Tailwind breakpoints) |
| `useLocalStorage(key, initial)` | Persistir preferencias UI (theme, sidebar collapsed) |
| `useClickOutside(ref, handler)` | Cerrar dropdowns/modals click outside |
| `useFocusTrap(enabled)` | Focus management en modals/drawers |
| `useCopyToClipboard()` | Copy con feedback toast |
| `useIntersectionObserver(ref, options)` | Lazy load, infinite scroll trigger |
| `useOptimisticMutation(queryKey, mutationFn)` | Optimistic update pattern estandarizado |

## 5. Utilidades (`src/lib/`)
- `cn(...classes)` → `clsx` + `tailwind-merge` (className merging).
- `formatMoney(amount, currency, locale?)` → `Intl.NumberFormat` consistente.
- `formatDate(date, format?, locale?)` → `date-fns` / `Intl.DateTimeFormat`.
- `formatRelativeTime(date)` → "hace 5 min", "ayer", "12 ene".
- `getInitials(name)` → determinista para avatar fallback.
- `generateColorFromString(str)` → BG determinista para placeholders.
- `parseSearchParams<T>(schema, search)` → Zod parse + defaults.
- `buildSearchParams(obj)` → `URLSearchParams` serializado (omit empty).

## 6. Criterios de aceptación
- Rutas tipadas end-to-end (TanStack Router + OpenAPI types).
- Search params sincronizados con URL (compartibles, recargables, back/forward).
- Componentes primitivos accesibles (Radix base) + tokens Design System.
- No estado global de negocio (solo UI + session).
- Hooks y utils probados unitariamente.
- Storybook/Visual regression para componentes base.
- `FormFileUpload` (dropzone + preview + progress + signed URL flow)
- `ConfirmDialog` (Radix AlertDialog + focus trap + `aria-modal`)

### 2.4 Feedback
- `Toast` (sonner: success/error/warning/info, `aria-live`, action button opcional)
- `InlineAlert` (banner en sección, dismissible, variant tokens)
- `Modal` (Radix Dialog + `FocusScope` + `Portal`)
  facturas                           → SellerInvoicesPage
  perfil-tienda                      → SellerProfilePage
```
