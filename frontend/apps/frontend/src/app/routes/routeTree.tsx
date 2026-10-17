import { createRootRouteWithContext, createRoute, Outlet, redirect } from '@tanstack/react-router';
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
import { LoginPage, RegisterBuyerPage, HealthStatusPage } from '../../modules/auth';
import {
  BuyerCatalogPage,
  BuyerProductDetailPage,
  BuyerCartPage,
  BuyerOrdersPage,
  BuyerOrderDetailPage,
  BuyerOrderPaymentPage,
  RequestReturnPage,
} from '../../modules/buyer';
import {
  SellerDashboardPage,
  SellerProductsPage,
  CreateProductPage,
  SellerProductDetailPage,
  SellerInventoryPage,
  SellerOrdersPage,
  SellerFulfillmentsPage,
  SellerReturnsPage,
} from '../../modules/seller';
import {
  AdminDashboardPage,
  UserListPage,
  CreateUserPage,
  WarehouseListPage,
  InventoryAdjustPage,
  RefundListPage,
  InvoiceManagementPage,
} from '../../modules/admin';
import {
  LogisticsFulfillmentsPage,
  FulfillmentOperationsPage,
  GhostStockReportPage,
  LogisticsReturnsInspectPage,
} from '../../modules/logistics';


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
          </main>
        );
      case UserRole.Seller:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Mis productos</h1>
            <p className="text-sm text-foreground-muted">Gestión de catálogo e inventario</p>
          </main>
        );
      case UserRole.Buyer:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel del Comprador</h1>
            <p className="text-sm text-foreground-muted">Mis pedidos y compras</p>
          </main>
        );
      case UserRole.LogisticsOperator:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel Logístico</h1>
            <p className="text-sm text-foreground-muted">Despachos y fulfillment</p>
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
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Fiscalización y Telemetría</h1>
      <p className="text-sm text-foreground-muted">Monitoreo transversal en modo sólo lectura</p>
    </div>
  ),
});

export const supervisorOrdersRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/orders',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Pedidos Globales</h1>
      <p className="text-sm text-foreground-muted">Auditoría 360° de pedidos en plataforma</p>
    </div>
  ),
});

export const supervisorOrderAuditRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/orders/$orderId',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Auditoría de Pedido</h1>
      <p className="text-sm text-foreground-muted">Expediente 360° de líneas, despachos y split tributario</p>
    </div>
  ),
});

export const supervisorFulfillmentsRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/fulfillments',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Monitoreo de Despachos</h1>
      <p className="text-sm text-foreground-muted">Trazabilidad de guías y cancelaciones por quiebre</p>
    </div>
  ),
});

export const supervisorReturnsRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/returns',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Expedientes de Devolución</h1>
      <p className="text-sm text-foreground-muted">Seguimiento de dictámenes y resoluciones</p>
    </div>
  ),
});

export const supervisorInvoicesRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/invoices',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Libro Mayor Tributario</h1>
      <p className="text-sm text-foreground-muted">Desglose de facturas y comisiones</p>
    </div>
  ),
});

export const supervisorAuditRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/inventory-audit',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Auditoría de Stock</h1>
      <p className="text-sm text-foreground-muted">Ajuste por conteo físico con idempotencia</p>
    </div>
  ),
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
