import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  ShoppingBag,
  ShoppingCart,
  User,
  LogOut,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { useOrdersQuery } from '../../core';
import { useCategoriesQuery } from '../../core';
import { Button } from '@zentric/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { BuyerFooter } from '../components/BuyerFooter';
import { UserRole } from '../../core';
import { getGuestCartCount, subscribeGuestCart } from '../../features/buyer/guestCart';

interface BuyerLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Comprador — "Portal Comercial Marketplace".
 */
export function BuyerLayout({ children }: BuyerLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const { user, logout, session } = useAuth();

  const [headerSearch, setHeaderSearch] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [guestItemCount, setGuestItemCount] = useState(() => getGuestCartCount());
  const searchInputContainerRef = useRef<HTMLDivElement>(null);

  const token = session.getAccessToken();
  const effectiveRole = user?.role ?? session.getRole();
  const isAuthenticatedBuyer =
    token !== null && (effectiveRole === UserRole.Buyer || effectiveRole === UserRole.Administrator);
  const isProtectedBuyerSubroute =
    currentPath.startsWith('/buyer/orders') ||
    currentPath.startsWith('/buyer/profile') ||
    currentPath.startsWith('/buyer/returns');

  // Título de documento dinámico según la sección comercial activa
  useEffect(() => {
    if (currentPath.startsWith('/buyer/orders')) {
      document.title = 'Zentric · Mis Pedidos';
    } else if (currentPath.startsWith('/buyer/cart')) {
      document.title = 'Zentric · Carrito de Compras';
    } else if (currentPath.startsWith('/buyer/checkout')) {
      document.title = 'Zentric · Finalizar Compra';
    } else {
      document.title = 'Zentric · Marketplace Oficial';
    }
  }, [currentPath]);

  useEffect(() => {
    return subscribeGuestCart(() => {
      setGuestItemCount(getGuestCartCount());
    });
  }, []);

  // Atajo de teclado global: Cmd+K o Ctrl+K para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = searchInputContainerRef.current?.querySelector('input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // S1: las categorias salen de la misma fuente real que los chips
  // del catalogo (`GET api/catalog/categories`) para el search context hint.
  const { data: categories } = useCategoriesQuery();
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
      {/* ── 0. Franja Superior Institucional (Value Prop Banner Esmeralda Fiel al Prototipo v2) ── */}
      <div className="w-full bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 text-zinc-900 dark:text-emerald-300 px-4 py-2 text-xs font-medium">
        <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              Envíos 100% gratuitos a nivel nacional en todas tus compras
            </span>
            <span className="hidden md:inline text-zinc-400">·</span>
            <span className="hidden md:inline text-zinc-600 dark:text-zinc-400">
              Despacho en 24h con seguro de carga y tracking directo
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Garantía y Devolución Fácil
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. Cinta de Reserva Atómica Activa (15 min) ── */}
      {activePendingOrder && !currentPath.endsWith('/pay') && (
        <div
          role="region"
          aria-label="Reserva de stock activa"
          className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-foreground"
        >
          <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1600px] flex-wrap items-center justify-between gap-3">
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

      {/* ── 2. Cabecera Comercial Principal (Mercado Libre / Amazon Mobile Pattern: Fila 1 acciones + Fila 2 buscador fijo) ── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md transition-colors">
        {/* Fila 1: Logo a la izquierda + Buscador central (desktop) + Acciones a la derecha */}
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] 2xl:max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 sm:gap-4">
          {/* Logo de Marca: zentric. con punto verde esmeralda */}
          <Link
            to="/buyer"
            className="flex shrink-0 items-center focus:outline-none focus:ring-2 focus:ring-zinc-400 rounded-md py-1"
            aria-label="Zentric Marketplace - Inicio"
          >
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              zentric<span className="text-emerald-500">.</span>
            </span>
          </Link>

          {/* Búsqueda central amplia — Estilo Polaris Utilitarian Minimalism con atajo visual ⌘K (solo desktop) */}
          <div ref={searchInputContainerRef} className="hidden sm:flex flex-1 max-w-md mx-4 md:mx-6">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="search"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleHeaderSearch(headerSearch);
                  }
                }}
                placeholder={
                  activeCategoryId
                    ? `Buscar en ${(categories ?? []).find((c) => c.id === activeCategoryId)?.name ?? activeCategoryId}...`
                    : 'Buscar por producto, marca o referencia...'
                }
                className="w-full h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-12 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 transition-colors"
                aria-label="Buscar en todo el marketplace"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <kbd className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Acciones de Cabecera y Navegación del Comprador (Responsive de clase mundial) */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />

            {/* Navegación accesible del comprador (Catálogo, Mis Pedidos, Carrito) */}
            <nav aria-label="Navegación del comprador" className="flex items-center gap-1 sm:gap-2">
              {/* Enlace al Catálogo (visible en tablet/desktop para no saturar móvil) */}
              <Link
                to="/buyer"
                className={`touch-target hidden md:flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentPath === '/buyer'
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <span>Catálogo</span>
              </Link>

              {/* Mis Pedidos (visible en tablet/desktop) */}
              <Link
                to="/buyer/orders"
                className={`touch-target hidden md:flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentPath.startsWith('/buyer/orders')
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span>Mis Pedidos</span>
              </Link>

              {/* Carrito with Live Counter */}
              <Link
                to="/buyer/cart"
                id="nav-cart-btn"
                className="touch-target flex h-9 sm:h-auto items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-semibold shadow-sm cursor-pointer"
                aria-label={`Abrir Carrito de compras${cartItemCount > 0 ? ` (${cartItemCount} productos)` : ''}`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Carrito</span>
                <span className="sr-only sm:hidden">Carrito</span>
                {cartItemCount > 0 && (
                  <span
                    id="nav-cart-badge"
                    aria-live="polite"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-xs"
                  >
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Mi Cuenta / Iniciar Sesión */}
            {isAuthenticatedBuyer ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/buyer/profile"
                  className={`touch-target flex h-9 w-9 sm:w-auto items-center justify-center gap-1.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    currentPath === '/buyer/profile'
                      ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                  aria-label="Mi Cuenta"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {user?.fullName?.split(' ')[0] ?? 'Mi Cuenta'}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="h-8 w-8 p-0 rounded-full text-zinc-400 hover:bg-danger/10 hover:text-danger transition-colors"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Acceso móvil: botón pill Registrarse visible */}
                <Link
                  to="/login"
                  className="sm:hidden touch-target inline-flex items-center justify-center px-3 py-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                  aria-label="Registrarse o iniciar sesión"
                >
                  Registrarse
                </Link>

                {/* Acceso desktop: Iniciar Sesión + Botón Pill Registrarse */}
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Fila 2: Barra de búsqueda visible fija a todo el ancho en móvil (< 640px) */}
        <div className="sm:hidden px-4 pb-2.5 pt-0.5">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleHeaderSearch(headerSearch);
                }
              }}
              placeholder="Buscar por producto, marca o referencia..."
              className="w-full h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
              aria-label="Buscar en todo el marketplace"
            />
          </div>
        </div>
      </header>

      {/* ── 3. Contenido Principal del Marketplace (Above the fold optimizado) ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10">
          {children}
        </div>
      </main>

      {/* ── 4. Pie de Página Comercial ── */}
      <BuyerFooter />
    </div>
  );
}
