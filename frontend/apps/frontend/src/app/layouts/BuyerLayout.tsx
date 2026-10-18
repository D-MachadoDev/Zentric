import { useState, type ReactNode, type FormEvent } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  User,
  Search,
  LogOut,
  ShieldCheck,
  Truck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { useOrdersQuery } from '../../application/services/orders';
import { Button, Logo } from '@zentric/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { BuyerFooter } from '../components/BuyerFooter';

interface BuyerLayoutProps {
  children?: ReactNode;
}

const buyerNavItems = [
  { href: '/buyer', label: 'Catálogo', icon: Package },
  { href: '/buyer/orders', label: 'Mis Pedidos', icon: ShoppingBag },
  { href: '/buyer/cart', label: 'Carrito', icon: ShoppingCart },
  { href: '/buyer/profile', label: 'Mi Perfil', icon: User },
];

const categoryShortcuts = [
  { label: 'Todo el Catálogo', href: '/buyer' },
  { label: 'Computación & Laptops', href: '/buyer?cat=computacion' },
  { label: 'Periféricos & Teclados', href: '/buyer?cat=perifericos' },
  { label: 'Audio & Monitores', href: '/buyer?cat=audio' },
  { label: 'Software & Licencias', href: '/buyer?cat=software' },
  { label: 'Componentes & Hardware', href: '/buyer?cat=hardware' },
  { label: 'Ofertas Flash', href: '/buyer?filter=ofertas' },
];

/**
 * Shell del Comprador — "Portal Comercial Marketplace" (Frontend-Design-System §9.6).
 * Diseñado con psicología de conversión, arquitectura de marketplace moderno
 * (referencias estilo Shopify / Amazon / Best Buy), navegación de alto contraste,
 * barra de búsqueda principal y sin fondos cuadriculados genéricos de IA.
 */
export function BuyerLayout({ children }: BuyerLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [headerSearch, setHeaderSearch] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Consulta de carrito activo para insignia de ítems en vivo
  const { data: cartOrders = [] } = useOrdersQuery('Cart');
  const activeCart = cartOrders.find((order) => order.status === 'Cart');
  const cartItemCount = activeCart?.itemCount ?? activeCart?.items?.length ?? 0;

  const handleHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    navigate({
      to: '/buyer/catalog' as never,
      search: { q: headerSearch.trim() } as never,
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
      {/* ── 1. Barra Superior de Confianza y Garantías Comerciales ── */}
      <div className="border-b border-border/60 bg-surface px-4 py-1.5 text-xs text-foreground-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-brand font-medium">
              <Truck className="h-3.5 w-3.5" />
              Envíos rápidos y asegurados a todo el país
            </span>
            <span className="hidden sm:inline text-foreground-subtle" aria-hidden="true">|</span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Compra protegida — 15 minutos de reserva garantizada
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Garantía oficial Zentric y soporte directo
            </span>
          </div>
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
          <form
            onSubmit={handleHeaderSearch}
            className="hidden md:flex flex-1 max-w-xl items-center relative"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Buscar productos, hardware, periféricos, licencias cloud..."
                className="w-full rounded-full border border-border bg-background/80 py-2 pl-10 pr-24 text-xs text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-xs transition-colors"
              />
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-foreground-muted pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 top-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-background hover:bg-brand/90 transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>

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
              aria-label="Carrito de compras"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden lg:inline">Carrito</span>
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
            {categoryShortcuts.map((cat, idx) => {
              const isMain = idx === 0 && currentPath === '/buyer';
              const isSpecial = cat.label.includes('Ofertas');

              return (
                <Link
                  key={cat.label}
                  to={cat.href as never}
                  className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                    isSpecial
                      ? 'border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                      : isMain
                        ? 'bg-brand text-background font-semibold'
                        : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                  }`}
                >
                  {isSpecial && <Sparkles className="inline h-3 w-3 mr-1" />}
                  {cat.label}
                </Link>
              );
            })}
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
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 mb-14 sm:mb-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* ── 6. Footer Comercial Zentric Marketplace ── */}
      <BuyerFooter />
    </div>
  );
}
