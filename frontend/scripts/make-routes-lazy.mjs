/**
 * Transforma el arbol de rutas de Zentric para cargar cada pagina bajo demanda.
 *
 * AGENTS.md, seccion 10 (`10-frontend-routing-shell`): "Enrutamiento y estado
 * de servidor: TanStack Router + TanStack Query" y "Enrutamiento: Arbol de
 * rutas TanStack Router con carga perezosa (lazy)".
 *
 * Sin esto, las 44 paginas de los 5 roles entran en el bundle inicial: un
 * unico chunk de 1 MB que Lighthouse penaliza (TBT 410 ms) y que el visitante
 * descarga antes de ver la primera pantalla.
 *
 * El helper `lazyPage` envuelve cada pagina en su propio `Suspense`, de modo
 * que la frontera de carga queda declarada una sola vez y cada ruta emite su
 * propio chunk.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const FILE = resolve(
  process.argv[2] ?? 'src/app/routes/routeTree.tsx',
);

const source = readFileSync(FILE, 'utf-8');

/** Paginas por modulo, con su ruta de archivo y su export nombrado. */
const PAGES = {
  auth: [
    ['LoginPage', 'LoginPage'],
    ['RegisterBuyerPage', 'RegisterBuyerPage'],
    ['HealthStatusPage', 'HealthStatusPage'],
  ],
  buyer: [
    ['TermsPage', 'TermsPage'],
    ['PrivacyPage', 'PrivacyPage'],
    ['CookiesPage', 'CookiesPage'],
    ['LegalPage', 'LegalPage'],
    ['BuyerCatalogPage', 'BuyerCatalogPage'],
    ['BuyerProductDetailPage', 'BuyerProductDetailPage'],
    ['BuyerCartPage', 'BuyerCartPage'],
    ['BuyerOrdersPage', 'BuyerOrdersPage'],
    ['BuyerOrderDetailPage', 'BuyerOrderDetailPage'],
    ['BuyerOrderPaymentPage', 'BuyerOrderPaymentPage'],
    ['RequestReturnPage', 'RequestReturnPage'],
    ['BuyerProfilePage', 'BuyerProfilePage'],
  ],
  seller: [
    ['SellerDashboardPage', 'SellerDashboardPage'],
    ['SellerProductsPage', 'SellerProductsPage'],
    ['CreateProductPage', 'CreateProductPage'],
    ['SellerProductDetailPage', 'SellerProductDetailPage'],
    ['SellerInventoryPage', 'SellerInventoryPage'],
    ['SellerOrdersPage', 'SellerOrdersPage'],
    ['SellerFulfillmentsPage', 'SellerFulfillmentsPage'],
    ['SellerReturnsPage', 'SellerReturnsPage'],
  ],
  admin: [
    ['AdminDashboardPage', 'AdminDashboardPage'],
    ['UserListPage', 'UserListPage'],
    ['CreateUserPage', 'CreateUserPage'],
    ['WarehouseListPage', 'WarehouseListPage'],
    ['InventoryAdjustPage', 'InventoryAdjustPage'],
    ['RefundListPage', 'RefundListPage'],
    ['InvoiceManagementPage', 'InvoiceManagementPage'],
  ],
  logistics: [
    ['LogisticsFulfillmentsPage', 'LogisticsFulfillmentsPage'],
    ['FulfillmentOperationsPage', 'FulfillmentOperationsPage'],
    ['GhostStockReportPage', 'GhostStockReportPage'],
    ['LogisticsReturnsInspectPage', 'LogisticsReturnsInspectPage'],
  ],
  supervisor: [
    ['SupervisorDashboardPage', 'SupervisorDashboardPage'],
    ['SupervisorOrdersPage', 'SupervisorOrdersPage'],
    ['SupervisorOrderAuditPage', 'SupervisorOrderAuditPage'],
    ['SupervisorFulfillmentsPage', 'SupervisorFulfillmentsPage'],
    ['SupervisorReturnsPage', 'SupervisorReturnsPage'],
    ['SupervisorInvoicesPage', 'SupervisorInvoicesPage'],
    ['SupervisorInventoryAuditPage', 'SupervisorInventoryAuditPage'],
  ],
};

// ── Helper de carga perezosa ────────────────────────────────────────────────
const helper = `import { lazy, Suspense, type ComponentType } from 'react';

/**
 * Carga perezosa de una pagina de ruta.
 *
 * Cada pagina se convierte en su propio chunk: el visitante descarga el
 * shell y la ruta que pide, no las 44 paginas de los cinco roles. El
 * \`Suspense\` va aqui para que la frontera de carga se declare una sola vez.
 */
function lazyPage<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Lazy = lazy(load);
  return function LazyPage(props: P) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

/** Estado de carga de ruta: respects \`prefers-reduced-motion\` del tema. */
function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <span className="sr-only">Cargando…</span>
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand"
      />
    </div>
  );
}
`;

// ── Declaraciones de pagina ────────────────────────────────────────────────
const declarations = Object.entries(PAGES)
  .map(([module, pages]) => {
    const lines = pages.map(
      ([name, file]) =>
        `const ${name} = lazyPage(() =>\n  import('../../modules/${module}/${file}').then((m) => ({ default: m.${name} })),\n);`,
    );
    return lines.join('\n');
  })
  .join('\n');

// ── Reemplazo del bloque de imports de paginas ──────────────────────────────
const importBlockRe =
  /import \{ LoginPage, RegisterBuyerPage, HealthStatusPage \} from '\.\.\/\.\.\/modules\/auth'[\s\S]*?from '\.\.\/\.\.\/modules\/supervisor';\n/;

if (!importBlockRe.test(source)) {
  console.error('No se encontro el bloque de imports de paginas. Revisar el patron.');
  process.exit(1);
}

const replaced = source.replace(importBlockRe, `${helper}\n${declarations}\n`);

writeFileSync(FILE, replaced, 'utf-8');

const total = Object.values(PAGES).reduce((n, p) => n + p.length, 0);
console.log(`${total} paginas convertidas a carga perezosa en ${FILE}`);
