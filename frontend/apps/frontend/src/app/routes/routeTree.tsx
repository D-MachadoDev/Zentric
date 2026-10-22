import { createRootRouteWithContext, createRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import { RootLayout } from '../../layouts/RootLayout';
import { UserRole } from '../../domain';
import { type RouterContext, parseLoginSearch } from './routerContext';
import { appServices } from '../providers/appServices';
import { exigirRol, exigirUnoDeRoles } from '../guards/routeGuards';
import {
  PublicLayout,
  AdminLayout,
  SellerLayout,
  BuyerLayout,
  LogisticsLayout,
  SupervisorLayout,
} from '../layouts';
import { lazy, Suspense, type ComponentType } from 'react';

/**
 * Carga perezosa de una pagina de ruta.
 *
 * Cada pagina se convierte en su propio chunk: el visitante descarga el
 * shell y la ruta que pide, no las 44 paginas de los cinco roles. El
 * `Suspense` va aqui para que la frontera de carga se declare una sola vez.
 */
function lazyPage(
  load: () => Promise<{ default: ComponentType<Record<string, never>> }>,
): ComponentType<Record<string, never>> {
  const Lazy = lazy(load);
  return function LazyPage(props: Record<string, never>) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

/** Estado de carga de ruta: respects `prefers-reduced-motion` del tema. */
function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[100svh] items-center justify-center"
    >
      <span className="sr-only">Cargando…</span>
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand"
      />
    </div>
  );
}

const LoginPage = lazyPage(() =>
  import('../../modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterBuyerPage = lazyPage(() =>
  import('../../modules/auth/RegisterBuyerPage').then((m) => ({ default: m.RegisterBuyerPage })),
);
const HealthStatusPage = lazyPage(() =>
  import('../../modules/auth/HealthStatusPage').then((m) => ({ default: m.HealthStatusPage })),
);
const TermsPage = lazyPage(() =>
  import('../../modules/buyer/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazyPage(() =>
  import('../../modules/buyer/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const CookiesPage = lazyPage(() =>
  import('../../modules/buyer/CookiesPage').then((m) => ({ default: m.CookiesPage })),
);
const LegalPage = lazyPage(() =>
  import('../../modules/buyer/LegalPage').then((m) => ({ default: m.LegalPage })),
);
const BuyerCatalogPage = lazyPage(() =>
  import('../../modules/buyer/BuyerCatalogPage').then((m) => ({ default: m.BuyerCatalogPage })),
);
const BuyerProductDetailPage = lazyPage(() =>
  import('../../modules/buyer/BuyerProductDetailPage').then((m) => ({ default: m.BuyerProductDetailPage })),
);
const BuyerCartPage = lazyPage(() =>
  import('../../modules/buyer/BuyerCartPage').then((m) => ({ default: m.BuyerCartPage })),
);
const BuyerOrdersPage = lazyPage(() =>
  import('../../modules/buyer/BuyerOrdersPage').then((m) => ({ default: m.BuyerOrdersPage })),
);
const BuyerOrderDetailPage = lazyPage(() =>
  import('../../modules/buyer/BuyerOrderDetailPage').then((m) => ({ default: m.BuyerOrderDetailPage })),
);
const BuyerOrderPaymentPage = lazyPage(() =>
  import('../../modules/buyer/BuyerOrderPaymentPage').then((m) => ({ default: m.BuyerOrderPaymentPage })),
);
const RequestReturnPage = lazyPage(() =>
  import('../../modules/buyer/RequestReturnPage').then((m) => ({ default: m.RequestReturnPage })),
);
const BuyerProfilePage = lazyPage(() =>
  import('../../modules/buyer/BuyerProfilePage').then((m) => ({ default: m.BuyerProfilePage })),
);
const SellerDashboardPage = lazyPage(() =>
  import('../../modules/seller/SellerDashboardPage').then((m) => ({ default: m.SellerDashboardPage })),
);
const SellerProductsPage = lazyPage(() =>
  import('../../modules/seller/SellerProductsPage').then((m) => ({ default: m.SellerProductsPage })),
);
const CreateProductPage = lazyPage(() =>
  import('../../modules/seller/CreateProductPage').then((m) => ({ default: m.CreateProductPage })),
);
const SellerProductDetailPage = lazyPage(() =>
  import('../../modules/seller/SellerProductDetailPage').then((m) => ({ default: m.SellerProductDetailPage })),
);
const SellerInventoryPage = lazyPage(() =>
  import('../../modules/seller/SellerInventoryPage').then((m) => ({ default: m.SellerInventoryPage })),
);
const SellerOrdersPage = lazyPage(() =>
  import('../../modules/seller/SellerOrdersPage').then((m) => ({ default: m.SellerOrdersPage })),
);
const SellerFulfillmentsPage = lazyPage(() =>
  import('../../modules/seller/SellerFulfillmentsPage').then((m) => ({ default: m.SellerFulfillmentsPage })),
);
const SellerReturnsPage = lazyPage(() =>
  import('../../modules/seller/SellerReturnsPage').then((m) => ({ default: m.SellerReturnsPage })),
);
const AdminDashboardPage = lazyPage(() =>
  import('../../modules/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const UserListPage = lazyPage(() =>
  import('../../modules/admin/UserListPage').then((m) => ({ default: m.UserListPage })),
);
const CreateUserPage = lazyPage(() =>
  import('../../modules/admin/CreateUserPage').then((m) => ({ default: m.CreateUserPage })),
);
const WarehouseListPage = lazyPage(() =>
  import('../../modules/admin/WarehouseListPage').then((m) => ({ default: m.WarehouseListPage })),
);
const InventoryAdjustPage = lazyPage(() =>
  import('../../modules/admin/InventoryAdjustPage').then((m) => ({ default: m.InventoryAdjustPage })),
);
const RefundListPage = lazyPage(() =>
  import('../../modules/admin/RefundListPage').then((m) => ({ default: m.RefundListPage })),
);
const InvoiceManagementPage = lazyPage(() =>
  import('../../modules/admin/InvoiceManagementPage').then((m) => ({ default: m.InvoiceManagementPage })),
);
const LogisticsFulfillmentsPage = lazyPage(() =>
  import('../../modules/logistics/LogisticsFulfillmentsPage').then((m) => ({ default: m.LogisticsFulfillmentsPage })),
);
const FulfillmentOperationsPage = lazyPage(() =>
  import('../../modules/logistics/FulfillmentOperationsPage').then((m) => ({ default: m.FulfillmentOperationsPage })),
);
const GhostStockReportPage = lazyPage(() =>
  import('../../modules/logistics/GhostStockReportPage').then((m) => ({ default: m.GhostStockReportPage })),
);
const LogisticsReturnsInspectPage = lazyPage(() =>
  import('../../modules/logistics/LogisticsReturnsInspectPage').then((m) => ({ default: m.LogisticsReturnsInspectPage })),
);
const SupervisorDashboardPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorDashboardPage').then((m) => ({ default: m.SupervisorDashboardPage })),
);
const SupervisorOrdersPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorOrdersPage').then((m) => ({ default: m.SupervisorOrdersPage })),
);
const SupervisorOrderAuditPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorOrderAuditPage').then((m) => ({ default: m.SupervisorOrderAuditPage })),
);
const SupervisorFulfillmentsPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorFulfillmentsPage').then((m) => ({ default: m.SupervisorFulfillmentsPage })),
);
const SupervisorReturnsPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorReturnsPage').then((m) => ({ default: m.SupervisorReturnsPage })),
);
const SupervisorInvoicesPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorInvoicesPage').then((m) => ({ default: m.SupervisorInvoicesPage })),
);
const SupervisorInventoryAuditPage = lazyPage(() =>
  import('../../modules/supervisor/SupervisorInventoryAuditPage').then((m) => ({ default: m.SupervisorInventoryAuditPage })),
);


/**
 * Raíz del árbol de rutas con contexto tipado de dependencias (SessionPort, ApiPort, QueryClient).
 */
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  ),
});

/**
 * Ruta /login para acceso con credenciales (C4-4 §2 y Decisión A4).
 */
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: parseLoginSearch,
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() !== null && context.session.getRole() !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <PublicLayout>
      <LoginPage />
    </PublicLayout>
  ),
});

/**
 * Ruta /entrar (alias retrocompatible para /login con aviso).
 */
export const entrarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  validateSearch: parseLoginSearch,
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() !== null && context.session.getRole() !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <PublicLayout>
      <LoginPage />
    </PublicLayout>
  ),
});

/**
 * Ruta /register para alta pública de Compradores.
 */
export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() !== null && context.session.getRole() !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <PublicLayout>
      <RegisterBuyerPage />
    </PublicLayout>
  ),
});

/**
 * Ruta /health para telemetría técnica pública.
 */
export const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/health',
  component: () => (
    <PublicLayout>
      <HealthStatusPage />
    </PublicLayout>
  ),
});

/**
 * Rutas legales públicas (Aviso Legal, Términos, Privacidad, Cookies).
 * Accesibles sin autenticación, usando PublicLayout.
 */
export const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: () => (
    <PublicLayout>
      <TermsPage />
    </PublicLayout>
  ),
});

export const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: () => (
    <PublicLayout>
      <PrivacyPage />
    </PublicLayout>
  ),
});

export const cookiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cookies',
  component: () => (
    <PublicLayout>
      <CookiesPage />
    </PublicLayout>
  ),
});

export const legalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal',
  component: () => (
    <PublicLayout>
      <LegalPage />
    </PublicLayout>
  ),
});

/**
 * Ruta raíz (/) con despacho según rol del usuario autenticado.
 */
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() === null || context.session.getRole() === null) {
      throw redirect({ to: '/login', search: { aviso: 'sin-sesion' } as never });
    }
  },
  component: () => {
    const role = appServices.session.getRole();

    switch (role) {
      case UserRole.Administrator:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel general</h1>
            <p className="text-sm text-foreground-muted">Consola de administración</p>
            <div className="mt-4">
              <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition-colors">
                Ir a la Consola de Administración →
              </Link>
            </div>
          </main>
        );
      case UserRole.Seller:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Mis productos</h1>
            <p className="text-sm text-foreground-muted">Gestión de catálogo e inventario</p>
            <div className="mt-4">
              <Link to="/seller" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition-colors">
                Ir al Panel del Vendedor →
              </Link>
            </div>
          </main>
        );
      case UserRole.Buyer:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel del Comprador</h1>
            <p className="text-sm text-foreground-muted">Mis pedidos y compras</p>
            <div className="mt-4">
              <Link to="/buyer" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition-colors">
                Explorar Catálogo de Productos →
              </Link>
            </div>
          </main>
        );
      case UserRole.LogisticsOperator:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel Logístico</h1>
            <p className="text-sm text-foreground-muted">Despachos y fulfillment</p>
            <div className="mt-4">
              <Link to="/logistics" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition-colors">
                Ir al Panel de Despachos →
              </Link>
            </div>
          </main>
        );
      case UserRole.Supervisor:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel de Supervisión</h1>
            <p className="text-sm text-foreground-muted">Panel en preparación</p>
            <div className="mt-4">
              <Link to="/supervisor" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition-colors">
                Ir al Panel de Supervisión →
              </Link>
            </div>
          </main>
        );
      default:
        return (
          <main className="p-8">
            <p className="text-sm text-foreground-muted">Panel en preparación</p>
          </main>
        );
    }
  },
});

// ============================================================================
// SUBÁRBOL ADMINISTRADOR (/admin)
// ============================================================================
export const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: ({ context }) => exigirRol(context, UserRole.Administrator),
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});

export const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/',
  component: () => <AdminDashboardPage />,
});

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users',
  component: () => <UserListPage />,
});

export const adminUserCreateRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users/new',
  component: () => <CreateUserPage />,
});

export const adminWarehousesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/warehouses',
  component: () => <WarehouseListPage />,
});

export const adminAdjustmentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/inventory-adjustments',
  component: () => <InventoryAdjustPage />,
});

export const adminReturnsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/returns',
  component: () => <RefundListPage />,
});

export const adminInvoicesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/invoices',
  component: () => <InvoiceManagementPage />,
});

// ============================================================================
// SUBÁRBOL VENDEDOR (/seller)
// ============================================================================
export const sellerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/seller',
  beforeLoad: ({ context }) => exigirUnoDeRoles(context, [UserRole.Seller, UserRole.Administrator]),
  component: () => (
    <SellerLayout>
      <Outlet />
    </SellerLayout>
  ),
});

export const sellerIndexRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/',
  component: () => <SellerDashboardPage />,
});

export const sellerProductsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products',
  component: () => <SellerProductsPage />,
});

export const sellerProductCreateRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products/new',
  component: () => <CreateProductPage />,
});

export const sellerProductDetailRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products/$productId',
  component: () => <SellerProductDetailPage />,
});

export const sellerInventoryRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/inventory',
  component: () => <SellerInventoryPage />,
});

export const sellerOrdersRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/orders',
  component: () => <SellerOrdersPage />,
});

export const sellerFulfillmentsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/fulfillments',
  component: () => <SellerFulfillmentsPage />,
});

export const sellerReturnsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/returns',
  component: () => <SellerReturnsPage />,
});

export const sellerWarehousesRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/warehouses',
  component: () => <WarehouseListPage />,
});


// ============================================================================
// SUBÁRBOL COMPRADOR (/buyer)
// ============================================================================
export const buyerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/buyer',
  beforeLoad: ({ context }) => exigirUnoDeRoles(context, [UserRole.Buyer, UserRole.Administrator]),
  component: () => (
    <BuyerLayout>
      <Outlet />
    </BuyerLayout>
  ),
});

export const buyerIndexRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/',
  component: () => <BuyerCatalogPage />,
});

export const buyerCatalogRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/catalog',
  component: () => <BuyerCatalogPage />,
});

export const buyerProductDetailRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/catalog/$productId',
  component: () => <BuyerProductDetailPage />,
});

export const buyerCartRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/cart',
  component: () => <BuyerCartPage />,
});

export const buyerOrdersRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders',
  component: () => <BuyerOrdersPage />,
});

export const buyerOrderDetailRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders/$orderId',
  component: () => <BuyerOrderDetailPage />,
});

export const buyerOrderPaymentRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders/$orderId/pay',
  component: () => <BuyerOrderPaymentPage />,
});

export const buyerReturnRequestRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/returns/new',
  component: () => <RequestReturnPage />,
});

export const buyerProfileRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/profile',
  component: () => <BuyerProfilePage />,
});

// ============================================================================
// SUBÁRBOL LOGÍSTICA (/logistics)
// ============================================================================
export const logisticsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logistics',
  beforeLoad: ({ context }) =>
    exigirUnoDeRoles(context, [UserRole.LogisticsOperator, UserRole.Administrator]),
  component: () => (
    <LogisticsLayout>
      <Outlet />
    </LogisticsLayout>
  ),
});

export const logisticsIndexRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/',
  component: () => <LogisticsFulfillmentsPage />,
});

export const logisticsFulfillmentsRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments',
  component: () => <LogisticsFulfillmentsPage />,
});

export const logisticsFulfillmentDetailRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments/$id',
  component: () => <FulfillmentOperationsPage />,
});

export const logisticsGhostStockRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments/$id/ghost-stock',
  component: () => <GhostStockReportPage />,
});

export const logisticsReturnsRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/returns',
  component: () => <LogisticsReturnsInspectPage />,
});

// ============================================================================
// SUBÁRBOL SUPERVISOR (/supervisor)
// ============================================================================
export const supervisorLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/supervisor',
  beforeLoad: ({ context }) =>
    exigirUnoDeRoles(context, [UserRole.Supervisor, UserRole.Administrator]),
  component: () => (
    <SupervisorLayout>
      <Outlet />
    </SupervisorLayout>
  ),
});

export const supervisorIndexRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/',
  component: () => <SupervisorDashboardPage />,
});

export const supervisorOrdersRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/orders',
  component: () => <SupervisorOrdersPage />,
});

export const supervisorOrderAuditRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/orders/$orderId',
  component: () => <SupervisorOrderAuditPage />,
});

export const supervisorFulfillmentsRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/fulfillments',
  component: () => <SupervisorFulfillmentsPage />,
});

export const supervisorReturnsRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/returns',
  component: () => <SupervisorReturnsPage />,
});

export const supervisorInvoicesRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/invoices',
  component: () => <SupervisorInvoicesPage />,
});

export const supervisorAuditRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/inventory-audit',
  component: () => <SupervisorInventoryAuditPage />,
});

// ============================================================================
// ENSAMBLAJE DE TODAS LAS RUTAS
// ============================================================================
export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  entrarRoute,
  registerRoute,
  healthRoute,
  termsRoute,
  privacyRoute,
  cookiesRoute,
  legalRoute,
  adminLayoutRoute.addChildren([
    adminIndexRoute,
    adminUsersRoute,
    adminUserCreateRoute,
    adminWarehousesRoute,
    adminAdjustmentsRoute,
    adminReturnsRoute,
    adminInvoicesRoute,
  ]),
  sellerLayoutRoute.addChildren([
    sellerIndexRoute,
    sellerProductsRoute,
    sellerProductCreateRoute,
    sellerProductDetailRoute,
    sellerInventoryRoute,
    sellerWarehousesRoute,
    sellerOrdersRoute,
    sellerFulfillmentsRoute,
    sellerReturnsRoute,
  ]),
  buyerLayoutRoute.addChildren([
    buyerIndexRoute,
    buyerCatalogRoute,
    buyerProductDetailRoute,
    buyerCartRoute,
    buyerOrdersRoute,
    buyerOrderDetailRoute,
    buyerOrderPaymentRoute,
    buyerReturnRequestRoute,
    buyerProfileRoute,
  ]),
  logisticsLayoutRoute.addChildren([
    logisticsIndexRoute,
    logisticsFulfillmentsRoute,
    logisticsFulfillmentDetailRoute,
    logisticsGhostStockRoute,
    logisticsReturnsRoute,
  ]),
  supervisorLayoutRoute.addChildren([
    supervisorIndexRoute,
    supervisorOrdersRoute,
    supervisorOrderAuditRoute,
    supervisorFulfillmentsRoute,
    supervisorReturnsRoute,
    supervisorInvoicesRoute,
    supervisorAuditRoute,
  ]),
]);
