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
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Panel General</h1>
      <p className="text-sm text-foreground-muted">Métricas consolidadas de la plataforma</p>
    </div>
  ),
});

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Directorio de Usuarios</h1>
      <p className="text-sm text-foreground-muted">Gestión RBAC y control de acceso</p>
    </div>
  ),
});

export const adminUserCreateRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/users/new',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Alta de Usuario</h1>
      <p className="text-sm text-foreground-muted">Registro de administradores, vendedores, supervisores y operadores logísticos</p>
    </div>
  ),
});

export const adminWarehousesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/warehouses',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Red de Bodegas Físicas</h1>
      <p className="text-sm text-foreground-muted">Bodegas centrales de Zentric y de vendedores</p>
    </div>
  ),
});

export const adminAdjustmentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/inventory-adjustments',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Ajustes de Inventario</h1>
      <p className="text-sm text-foreground-muted">Auditoría y conciliación por conteo físico</p>
    </div>
  ),
});

export const adminReturnsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/returns',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reembolsos de Devolución</h1>
      <p className="text-sm text-foreground-muted">Desembolso financiero tras aprobación comercial</p>
    </div>
  ),
});

export const adminInvoicesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/invoices',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Facturación Split</h1>
      <p className="text-sm text-foreground-muted">Facturas Maestras y comisiones de plataforma</p>
    </div>
  ),
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
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Panel del Vendedor</h1>
      <p className="text-sm text-foreground-muted">Resumen de ventas y operaciones activas</p>
    </div>
  ),
});

export const sellerProductsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Mis Productos</h1>
      <p className="text-sm text-foreground-muted">Catálogo propio, publicación y variantes</p>
    </div>
  ),
});

export const sellerProductCreateRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products/new',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Nuevo Producto</h1>
      <p className="text-sm text-foreground-muted">Alta de producto físico o digital con variantes</p>
    </div>
  ),
});

export const sellerProductDetailRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/products/$productId',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Detalle del Producto</h1>
      <p className="text-sm text-foreground-muted">Ficha técnica y estado comercial</p>
    </div>
  ),
});

export const sellerInventoryRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/inventory',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Mi Inventario</h1>
      <p className="text-sm text-foreground-muted">Posiciones de stock disponible y reservado</p>
    </div>
  ),
});

export const sellerOrdersRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/orders',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Pedidos Recibidos</h1>
      <p className="text-sm text-foreground-muted">Líneas vendidas y subtotales por pedido</p>
    </div>
  ),
});

export const sellerFulfillmentsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/fulfillments',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Cola de Despachos</h1>
      <p className="text-sm text-foreground-muted">Empaque y despacho de paquetes propios</p>
    </div>
  ),
});

export const sellerReturnsRoute = createRoute({
  getParentRoute: () => sellerLayoutRoute,
  path: '/returns',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Resolución de Devoluciones</h1>
      <p className="text-sm text-foreground-muted">Aprobación o rechazo tras inspección técnica</p>
    </div>
  ),
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
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Catálogo de Productos</h1>
      <p className="text-sm text-foreground-muted">Exploración de productos y compra directa</p>
    </div>
  ),
});

export const buyerCatalogRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/catalog',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Catálogo de Productos</h1>
      <p className="text-sm text-foreground-muted">Exploración de productos y compra directa</p>
    </div>
  ),
});

export const buyerProductDetailRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/catalog/$productId',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Detalle de Producto</h1>
      <p className="text-sm text-foreground-muted">Especificación y selección de variantes</p>
    </div>
  ),
});

export const buyerCartRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/cart',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Carrito de Compras</h1>
      <p className="text-sm text-foreground-muted">Reserva atómica de 15 minutos en checkout</p>
    </div>
  ),
});

export const buyerOrdersRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Mis Pedidos</h1>
      <p className="text-sm text-foreground-muted">Historial de compras y comprobantes maestros</p>
    </div>
  ),
});

export const buyerOrderDetailRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders/$orderId',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Detalle del Pedido</h1>
      <p className="text-sm text-foreground-muted">Líneas, guías de despacho y factura maestra</p>
    </div>
  ),
});

export const buyerOrderPaymentRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/orders/$orderId/pay',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Pago de Pedido</h1>
      <p className="text-sm text-foreground-muted">Checkout con reserva atómica de 15 minutos</p>
    </div>
  ),
});

export const buyerReturnRequestRoute = createRoute({
  getParentRoute: () => buyerLayoutRoute,
  path: '/returns/new',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Solicitud de Devolución</h1>
      <p className="text-sm text-foreground-muted">Registro de solicitud sobre productos físicos entregados</p>
    </div>
  ),
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
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Panel Logístico</h1>
      <p className="text-sm text-foreground-muted">Supervisión operativa de envíos y paquetes</p>
    </div>
  ),
});

export const logisticsFulfillmentsRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Órdenes de Despacho</h1>
      <p className="text-sm text-foreground-muted">Ciclo completo de fulfillment y entrega</p>
    </div>
  ),
});

export const logisticsFulfillmentDetailRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments/$id',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Operaciones de Despacho</h1>
      <p className="text-sm text-foreground-muted">Empaque, despacho y certificación de entrega</p>
    </div>
  ),
});

export const logisticsGhostStockRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/fulfillments/$id/ghost-stock',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reporte de Stock Fantasma</h1>
      <p className="text-sm text-foreground-muted">Cancelación operativa por quiebre de stock no conciliado</p>
    </div>
  ),
});

export const logisticsReturnsRoute = createRoute({
  getParentRoute: () => logisticsLayoutRoute,
  path: '/returns',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Inspección de Devoluciones</h1>
      <p className="text-sm text-foreground-muted">Dictamen técnico físico de paquetes recibidos</p>
    </div>
  ),
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
