import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  User,
  LogOut,
  LogIn,
  Clock,
} from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { useOrdersQuery } from '../../core';
import { useCategoriesQuery } from '../../core';
import { Button, Logo, SearchInput, Skeleton } from '@zentric/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { BuyerFooter } from '../components/BuyerFooter';
import { UserRole } from '../../core';
import { getGuestCartCount, subscribeGuestCart } from '../../features/buyer/guestCart';

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

  const isMainCatalogPage = currentPath === '/buyer' || currentPath === '/buyer/';

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
      to: '/buyer' as never,
      hash: 'catalogo',
      resetScroll: false,
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
      {/* ── 1. Cinta de Reserva Atómica Activa (15 min) ── */}
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
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/95 backdrop-blur-md overscroll-contain">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          {/* Logo de Marca */}
          <Link
            to="/buyer"
            className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Zentric Marketplace - Inicio"
          >
            <Logo className="h-7 sm:h-8" />
          </Link>

          {/* Búsqueda central — el punto de entrada principal del comprador */}
          <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
            <div className="w-full max-w-xl">
              <SearchInput
                value={headerSearch}
                onChange={setHeaderSearch}
                onSearch={handleHeaderSearch}
                placeholder={activeCategoryId
                  ? `Buscar en ${(categories ?? []).find(c => c.id === activeCategoryId)?.name ?? activeCategoryId}...`
                  : 'Buscar productos, hardware, periféricos, licencias...'}
                showRecentSearches
                maxRecentSearches={5}
                showSubmitButton={false}
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
          </div>

          {/* Acciones del Comprador */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              to="/buyer/orders"
              className={`hidden h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:inline-flex ${
                currentPath.startsWith('/buyer/orders')
                  ? 'text-brand'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Mis pedidos</span>
            </Link>

            <Link
              to="/buyer/cart"
              className={`relative inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                currentPath === '/buyer/cart'
                  ? 'text-brand'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Carrito</span>
              {cartItemCount > 0 && (
                <span
                  aria-live="polite"
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold tabular-nums text-primary-foreground"
                >
                  {cartItemCount}
                </span>
              )}
            </Link>

            <Link
              to="/buyer/profile"
              className={`hidden h-9 items-center gap-2 rounded-lg px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:inline-flex ${
                currentPath === '/buyer/profile' ? 'text-brand' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {user?.fullName ? (
                  user.fullName.charAt(0)
                ) : (
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <span className="hidden max-w-[120px] truncate xl:inline">
                {user?.fullName ?? 'Mi perfil'}
              </span>
            </Link>

            <ThemeToggle />

            {isAuthenticatedBuyer ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-2 text-foreground-muted hover:bg-danger/10 hover:text-danger"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link
                to="/login"
                className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ingresar</span>
              </Link>
            )}
          </div>
        </div>

        {/* Búsqueda compacta en móvil: el comprador la necesita antes que el catálogo */}
        <div className="border-t border-border/60 px-4 py-2 md:hidden">
          <SearchInput
            value={headerSearch}
            onChange={setHeaderSearch}
            onSearch={handleHeaderSearch}
            placeholder={activeCategoryId
              ? `Buscar en ${(categories ?? []).find(c => c.id === activeCategoryId)?.name ?? activeCategoryId}...`
              : 'Buscar en el marketplace...'}
            showRecentSearches
            maxRecentSearches={4}
            showSubmitButton={false}
            aria-label="Buscar en todo el marketplace"
            className="w-full"
          />
        </div>

        {/* ── 3. Sub-barra de Navegación por Categorías Rápidas ── */}
        {/* Solo se muestra en subpáginas del comprador para no duplicar los filtros de categorías de la vista principal (/buyer) */}
        {!isMainCatalogPage && (
          <nav
            aria-label="Categorías comerciales"
            className="flex items-center gap-2 overflow-x-auto border-t border-border/50 px-4 py-2 sm:px-6 text-xs scrollbar-none"
          >
            <div className="mx-auto flex max-w-7xl w-full items-center gap-2">
              <Link
                to="/buyer"
                hash="catalogo"
                resetScroll={false}
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
                      hash="catalogo"
                      resetScroll={false}
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
        )}
      </header>

      {/* ── 4. Navegación Móvil Inferior ── */}
      <nav
        aria-label="Navegación móvil del comprador"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 py-2 backdrop-blur-md sm:hidden"
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
      <main className="flex-1 overflow-x-clip bg-background px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-20 lg:px-8 mb-14 sm:mb-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* ── 6. Footer Comercial Zentric Marketplace ── */}
      <BuyerFooter />
    </div>
  );
}
