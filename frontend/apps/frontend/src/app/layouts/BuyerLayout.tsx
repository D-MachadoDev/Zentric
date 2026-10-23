import { useEffect } from 'react';
import { useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  User,
  LogOut,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { useOrdersQuery } from '../../application/services/orders';
import { useCategoriesQuery } from '../../application/services/catalog';
import { Button, Logo, SearchInput, Skeleton } from '@zentric/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { BuyerFooter } from '../components/BuyerFooter';
import { UserRole } from '../../domain';

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

  // Defensa en profundidad: verificar sesión al montar y al restaurar de bfcache.
  // Los guardas beforeLoad del router no se ejecutan al restaurar de back-forward cache.
  useEffect(() => {
    const token = session.getAccessToken();
    const userRole = session.getRole();
    if (token === null || userRole === null || userRole !== UserRole.Buyer) {
      navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
    }
  }, [session, navigate]);

  // También escuchar el evento pageshow que dispara al restaurar de bfcache
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const token = session.getAccessToken();
        const userRole = session.getRole();
        if (token === null || userRole === null || userRole !== UserRole.Buyer) {
          navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [session, navigate]);

  // Consulta de carrito activo para insignia de ítems en vivo
  const { data: cartOrders = [] } = useOrdersQuery('Cart');
  const activeCart = cartOrders.find((order) => order.status === 'Cart');
  const cartItemCount = activeCart?.itemCount ?? activeCart?.items?.length ?? 0;

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
      {/* ── 1. Franja utilitaria: no repite las garantias del catalogo ni del pie ── */}
      <div className="border-b border-border/60 bg-surface px-4 py-1.5 text-xs text-foreground-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 text-[11px]">
            <Truck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>
              Envíos desde bodegas certificadas a todo el país · Facturación con split 5/95
            </span>
          </p>

          <Link
            to="/seller"
            className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-foreground-muted transition-colors hover:text-brand md:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Vende en Zentric
          </Link>
        </div>
      </div>

      {/* ── 2. Cabecera Comercial Principal (Navbar) ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo de Marca e Identidad del Portal */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/buyer" className="flex items-center gap-2 group">
              <Logo className="h-7 sm:h-8" />
              <span className="hidden sm:inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand tracking-wide uppercase">
                Portal de Compras
              </span>
            </Link>
          </div>

          {/* Barra de Búsqueda de Marketplace */}
          <div className="hidden md:flex flex-1 max-w-xl items-center relative">
            <SearchInput
              value={headerSearch}
              onChange={setHeaderSearch}
              onSearch={handleHeaderSearch}
              placeholder="Buscar productos, hardware, periféricos, licencias cloud..."
              showRecentSearches
              maxRecentSearches={5}
              aria-label="Buscar en todo el marketplace"
              className="w-full"
            />
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
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden lg:inline">Mis Pedidos</span>
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
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-[11px]">
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <span className="hidden xl:inline max-w-[120px] truncate text-foreground font-medium">
                {user?.fullName ?? 'Mi Perfil'}
              </span>
            </Link>

            {/* Alternador de Tema Dual */}
            <ThemeToggle />

            {/* Salir */}
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
