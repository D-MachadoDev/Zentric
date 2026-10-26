import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  Truck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { useOrdersQuery } from '../../application/services/orders';
import { useCategoriesQuery } from '../../application/services/catalog';
import { Button, Logo, SearchInput, Skeleton } from '@zentric/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { BuyerFooter } from '../components/BuyerFooter';
import { UserRole } from '../../domain';
import { getGuestCartCount, subscribeGuestCart } from '../../modules/buyer/guestCart';

interface BuyerLayoutProps {
  children?: ReactNode;
}

const buyerNavItems = [
  { href: '/buyer', label: 'Catálogo', icon: Package },
  { href: '/buyer/orders', label: 'Mis Pedidos', icon: ShoppingBag },
  { href: '/buyer/cart', label: 'Carrito', icon: ShoppingCart },
  { href: '/buyer/profile', label: 'Mi Perfil', icon: User },
];

/** Cantidad de fichas de categoria que se reservan durante la carga. */
const CATEGORY_SHORTCUT_SKELETONS = 4;

/**
 * Shell del Comprador — "Portal Comercial Marketplace".
 * Diseñado con psicología de conversión, arquitectura de marketplace moderno
 * (referencias estilo Shopify / Amazon / Best Buy), navegación de alto contraste,
 * barra de búsqueda principal y sin fondos cuadriculados genéricos de IA.
 */
export function BuyerLayout({ children }: BuyerLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const { user, logout, session } = useAuth();

  const [headerSearch, setHeaderSearch] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [guestItemCount, setGuestItemCount] = useState(() => getGuestCartCount());

  const token = session.getAccessToken();
  const userRole = session.getRole();
  const isAuthenticatedBuyer =
    token !== null && (userRole === UserRole.Buyer || userRole === UserRole.Administrator);
  const isProtectedBuyerSubroute =
    currentPath.startsWith('/buyer/orders') ||
    currentPath.startsWith('/buyer/profile') ||
    currentPath.startsWith('/buyer/returns');

  useEffect(() => {
    return subscribeGuestCart(() => {
      setGuestItemCount(getGuestCartCount());
    });
  }, []);

  // Defensa en profundidad: exigir sesión sólo en rutas personales (pedidos, perfil, devoluciones).
  // El catálogo, detalle de producto y carrito permiten exploración libre en Modo Invitado.
  useEffect(() => {
    const currentToken = session.getAccessToken();
    const currentRole = session.getRole();
    if (isProtectedBuyerSubroute) {
      if (
        currentToken === null ||
        currentRole === null ||
        (currentRole !== UserRole.Buyer && currentRole !== UserRole.Administrator)
      ) {
        navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
      }
    }
  }, [session, navigate, isProtectedBuyerSubroute]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isProtectedBuyerSubroute) {
        const currentToken = session.getAccessToken();
        const currentRole = session.getRole();
        if (
          currentToken === null ||
          currentRole === null ||
          (currentRole !== UserRole.Buyer && currentRole !== UserRole.Administrator)
        ) {
          navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [session, navigate, isProtectedBuyerSubroute]);

  // Consulta de carrito activo para insignia de ítems en vivo y reserva activa de 15 min
  const { data: cartOrders = [] } = useOrdersQuery('Cart', undefined, {
    enabled: isAuthenticatedBuyer,
  });
  const { data: pendingOrders = [] } = useOrdersQuery('PendingPayment', undefined, {
    enabled: isAuthenticatedBuyer,
  });
  const activeCart = cartOrders.find((order) => order.status === 'Cart');
  const cartItemCount = isAuthenticatedBuyer
    ? (activeCart?.itemCount ?? activeCart?.items?.length ?? 0)
    : guestItemCount;
  const activePendingOrder = isAuthenticatedBuyer
    ? (pendingOrders.find(
        (order) => order.status === 'PendingPayment' && order.canStillPay !== false,
      ) ??
      cartOrders.find(
        (order) => order.status === 'PendingPayment' && order.canStillPay !== false,
      ))
    : undefined;

  // S1: las categorias del shortcut salen de la misma fuente real que los chips
  // del catalogo (`GET api/catalog/categories`); mientras cargan no se inventa
  // ninguna, y si no hay categorias publicadas la fila queda solo con el acceso
  // al catalogo completo.
  const { data: categories, isLoading: areCategoriesLoading } = useCategoriesQuery();
  const activeCategoryId = (routerState.location.search as { cat?: string } | undefined)?.cat;

  const handleHeaderSearch = (value: string) => {
    if (!value.trim()) return;
    navigate({
      to: '/buyer/catalog' as never,
      search: { q: value.trim() } as never,
    });
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    try {
      logout();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div data-role="buyer" className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── 1. Franja utilitaria: beneficios reales del comprador y acceso discreto operativo ── */}
      <div className="border-b border-border/60 bg-surface px-4 py-1.5 text-xs text-foreground-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 text-xs">
            <Truck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>
              Envíos rastreables a todo el país · Compra protegida y devolución garantizada
            </span>
          </p>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              to="/buyer/orders"
              className="hidden items-center gap-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-brand md:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Rastreo de Pedidos y Garantías
            </Link>
            <span className="hidden text-border md:inline" aria-hidden="true">
              |
            </span>
            <Link
              to="/acceso-corporativo"
              className="inline-flex items-center gap-1 text-xs font-mono font-medium text-foreground-muted transition-colors hover:text-brand"
            >
              <span>Vender / Acceso Operativo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 1b. Cinta de Reserva Atómica Activa (15 min) ── */}
      {activePendingOrder && !currentPath.endsWith('/pay') && (
        <div
          role="region"
          aria-label="Reserva de stock activa"
          className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-foreground"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Clock className="h-3.5 w-3.5 text-warning animate-pulse shrink-0" aria-hidden="true" />
              <span className="font-semibold text-warning">Reserva Atómica 15 min Activa:</span>
              <span className="text-foreground">
                Pedido #{activePendingOrder.id.slice(0, 8).toUpperCase()} con stock apartado en bodega.
              </span>
            </div>
            <Link
              to="/buyer/orders/$orderId/pay"
              params={{ orderId: activePendingOrder.id }}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1 font-mono text-xs font-bold text-primary-foreground transition-colors hover:bg-warning/90"
            >
              Completar Pago Ahora →
            </Link>
          </div>
        </div>
      )}

      {/* ── 2. Cabecera Comercial Principal (Navbar) ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md overscroll-contain">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo de Marca — limpio, sin badge redundante */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/buyer" className="flex items-center gap-2 group" aria-label="Zentric Marketplace - Inicio">
              <Logo className="h-8 sm:h-9" />
            </Link>
          </div>

          {/* Barra de Búsqueda de Marketplace */}
          <div className="hidden md:flex flex-1 max-w-xl items-center relative">
            <SearchInput
              value={headerSearch}
              onChange={setHeaderSearch}
              onSearch={handleHeaderSearch}
              placeholder={activeCategoryId
                ? `Buscar en ${(categories ?? []).find(c => c.id === activeCategoryId)?.name ?? activeCategoryId}...`
                : "Buscar productos, hardware, periféricos, licencias cloud..."}
              showRecentSearches
              maxRecentSearches={5}
              aria-label="Buscar en todo el marketplace"
              aria-describedby="search-context-hint"
              className="w-full"
            />
            <span id="search-context-hint" className="sr-only">
              {activeCategoryId
                ? `La búsqueda se filtrará a la categoría ${(categories ?? []).find(c => c.id === activeCategoryId)?.name ?? activeCategoryId}.`
                : 'La búsqueda abarcará todo el catálogo de productos.'}
            </span>
          </div>

          {/* Acciones del Comprador */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mis Pedidos */}
            <Link
              to="/buyer/orders"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                currentPath.startsWith('/buyer/orders')
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
              }`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {/* `sr-only lg:not-sr-only` y no `hidden lg:inline`: con `hidden`
                  el texto sale del arbol accesible y, por debajo de `lg`, el
                  enlace queda como icono SIN NOMBRE -> axe lo marca como
                  violacion `link-name` seria (WCAG 2.4.4/4.1.2). `sr-only`
                  mantiene "Mis Pedidos" en el nombre accesible en TODOS los
                  anchos y lo hace visible solo desde `lg`, igual que el
                  carrito de aqui abajo. Sin impacto visual. */}
              <span className="sr-only lg:not-sr-only">Mis Pedidos</span>
            </Link>

            {/* Carrito con Insignia Viva (aria-live polite) */}
            <Link
              to="/buyer/cart"
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                currentPath === '/buyer/cart'
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
              }`}
              // SIN `aria-label`: el nombre accesible se calcula del contenido
              // ("Carrito" + insignia del conteo), de modo que siempre coincide
              // con el texto visible. Con un `aria-label` explicito, WCAG
              // 2.5.3 (Label in Name) exige que contenga el texto visible
              // EXACTO, y aqui el texto visible incluye el salto de linea
              // que introduce la insignia dentro del flex: la comparacion
              // fallaba aunque el nombre fuese correcto. Sin etiqueta
              // explicita la regla no aplica y el nombre es el que se ve.
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {/* `sr-only lg:not-sr-only`: la palabra "Carrito" forma parte del
                  nombre accesible en TODOS los anchos, pero solo se ve a partir
                  de `lg`. Con `hidden` el nombre en movil se reducia al
                  numero de la insignia. */}
              <span className="sr-only lg:not-sr-only">Carrito</span>
              {cartItemCount > 0 && (
                <span
                  aria-live="polite"
                  className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-background"
                >
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Perfil del Comprador */}
            <Link
              to="/buyer/profile"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                currentPath === '/buyer/profile'
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-xs">
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <span className="sr-only xl:not-sr-only max-w-[120px] truncate text-foreground font-medium">
                {user?.fullName ?? 'Mi Perfil'}
              </span>
            </Link>

            {/* Alternador de Tema Dual */}
            <ThemeToggle />

            {/* Acción de sesión: Salir si está autenticado, o Ingresar si es Invitado */}
            {isAuthenticatedBuyer ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-foreground-muted hover:bg-danger/10 hover:text-danger px-2"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-brand-strong"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ingresar</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── 3. Sub-barra de Navegación por Categorías Rápidas ── */}
        <nav
          aria-label="Categorías comerciales"
          className="flex items-center gap-2 overflow-x-auto border-t border-border/50 px-4 py-2 sm:px-6 text-xs scrollbar-none"
        >
          <div className="mx-auto flex max-w-7xl w-full items-center gap-2">
            <Link
              to="/buyer"
              aria-current={currentPath === '/buyer' && !activeCategoryId ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                currentPath === '/buyer' && !activeCategoryId
                  ? 'bg-brand text-background font-semibold'
                  : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
              }`}
            >
              Todo el Catálogo
            </Link>

            {areCategoriesLoading ? (
              Array.from({ length: CATEGORY_SHORTCUT_SKELETONS }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-28 shrink-0 rounded-full" />
              ))
            ) : (
              (categories ?? []).map((category) => {
                const isActive = activeCategoryId === category.id;

                return (
                  <Link
                    key={category.id}
                    to="/buyer"
                    search={{ cat: category.id } as never}
                    aria-current={isActive ? 'page' : undefined}
                    className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                      isActive
                        ? 'bg-brand text-background font-semibold'
                        : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                    }`}
                  >
                    {category.name}
                  </Link>
                );
              })
            )}
          </div>
        </nav>
      </header>

      {/* ── 4. Navegación Móvil Inferior ── */}
      <nav
        aria-label="Navegación móvil del comprador"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 backdrop-blur-md py-2 sm:hidden shadow-lg"
      >
        {buyerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href || (item.href !== '/buyer' && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href as never}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'font-semibold text-brand' : 'text-foreground-muted'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.href === '/buyer/cart' && cartItemCount > 0 && (
                <span className="absolute top-0 right-2 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-background">
                  {cartItemCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── 5. Lienzo Comercial Principal (Limpio, sin fondos cuadriculados) ── */}
      <main className="flex-1 bg-background px-4 py-8 pb-20 sm:px-6 sm:py-10 sm:pb-20 lg:px-8 mb-14 sm:mb-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* ── 6. Footer Comercial Zentric Marketplace ── */}
      <BuyerFooter />
    </div>
  );
}
