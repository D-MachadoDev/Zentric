import { useEffect } from 'react';
import { useState, type ReactNode } from 'react';
import { Truck, CheckSquare } from 'lucide-react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavItem } from './LayoutSidebar';
import { OperationalFooter } from '../components/OperationalFooter';
import { useAuth } from '../providers/authContext';
import { UserRole } from '../../core';

const logisticsNavItems: NavItem[] = [
  { href: '/logistics/fulfillments', label: 'Cola de Despachos', icon: Truck },
  { href: '/logistics/returns', label: 'Inspección de Devoluciones', icon: CheckSquare },
];

interface LogisticsLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Operador Logístico — "Tablero de Colas".
 * Exige rol LogisticsOperator o Administrator en beforeLoad (LogisticsShell).
 *
 * Estructura diferenciada: sin barra lateral; franja de colas en Geist Mono
 * mayúsculas (ADN de terminal) bajo una cabecera compacta h-14, densidad de
 * trabajo máxima para escaneo de colas. Acento cian operativo.
 */
export function LogisticsLayout({ children }: LogisticsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { session } = useAuth();
  const navigate = useNavigate();

  // Título de documento dinámico
  useEffect(() => {
    document.title = 'Zentric · Operaciones Logísticas';
  }, []);

  // Defensa en profundidad: verificar sesión al montar y al restaurar de bfcache.
  // Los guardas beforeLoad del router no se ejecutan al restaurar de back-forward cache.
  useEffect(() => {
    const token = session.getAccessToken();
    const userRole = session.getRole();
    if (token === null || userRole === null || (userRole !== UserRole.LogisticsOperator && userRole !== UserRole.Administrator)) {
      navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
    }
  }, [session, navigate]);

  // También escuchar el evento pageshow que dispara al restaurar de bfcache
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const token = session.getAccessToken();
        const userRole = session.getRole();
        if (token === null || userRole === null || (userRole !== UserRole.LogisticsOperator && userRole !== UserRole.Administrator)) {
          navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [session, navigate]);

  return (
    <div data-role="logistics" className="flex min-h-screen flex-col bg-background text-foreground">
      <LayoutHeader
        title="Operaciones Logísticas"
        dense
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Franja de colas: pestañas mono-caps tipo terminal de despacho. */}
      <nav
        aria-label="Colas operativas"
        className="hidden border-b border-border bg-surface/95 px-4 py-2 sm:px-6 md:block"
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          {logisticsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href ||
              (item.href !== '/logistics' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider uppercase transition-colors ${
                  isActive
                    ? 'bg-brand text-primary-foreground shadow-xs'
                    : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Drawer móvil (desmontado cuando está cerrado) */}
      <LayoutSidebar
        variant="drawer"
        items={logisticsNavItems}
        homeHref="/logistics"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Densidad operativa: padding reducido para máxima filas visibles. */}
      <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
        {children}
      </main>

      <OperationalFooter roleLabel="Fulfillment & Logística de Bodegas" />
    </div>
  );
}
