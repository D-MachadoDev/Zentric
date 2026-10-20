import { useEffect } from 'react';
import { useState, type ReactNode } from 'react';
import { Eye, ShoppingBag, Truck, RotateCcw, Receipt, Sliders } from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavGroup } from './LayoutSidebar';
import { OperationalFooter } from '../components/OperationalFooter';
import { useAuth } from '../providers/authContext';
import { useNavigate } from '@tanstack/react-router';
import { UserRole } from '../../domain';

const supervisorGroups: NavGroup[] = [
  {
    label: 'Fiscalización',
    items: [
      { href: '/supervisor', label: 'Fiscalización General', icon: Eye },
      { href: '/supervisor/orders', label: 'Pedidos Globales', icon: ShoppingBag },
      { href: '/supervisor/fulfillments', label: 'Monitoreo de Despachos', icon: Truck },
    ],
  },
  {
    label: 'Libro Mayor',
    items: [
      { href: '/supervisor/returns', label: 'Expedientes Devolución', icon: RotateCcw },
      { href: '/supervisor/invoices', label: 'Libro Mayor Facturas', icon: Receipt },
    ],
  },
  {
    label: 'Inventario',
    items: [{ href: '/supervisor/inventory-audit', label: 'Auditoría Conteo Físico', icon: Sliders }],
  },
];

interface SupervisorLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Supervisor de Auditoría — "Sala de Libros" (Frontend-Design-System §9.6).
 * Exige rol Supervisor o Administrator en beforeLoad (C4-4 §2: SupervisorShell).
 *
 * Estructura diferenciada: índice forense estrecho (w-56) con grupos mono-caps
 * y el contenido enmarcado como "hoja de libro mayor" (superficie continua
 * con hairline), pensado para lectura lado a lado de expedientes.
 */
export function SupervisorLayout({ children }: SupervisorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  // Defensa en profundidad: verificar sesión al montar y al restaurar de bfcache.
  // Los guardas beforeLoad del router no se ejecutan al restaurar de back-forward cache.
  useEffect(() => {
    const token = session.getAccessToken();
    const userRole = session.getRole();
    if (token === null || userRole === null || (userRole !== UserRole.Supervisor && userRole !== UserRole.Administrator)) {
      navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
    }
  }, [session, navigate]);

  // También escuchar el evento pageshow que dispara al restaurar de bfcache
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const token = session.getAccessToken();
        const userRole = session.getRole();
        if (token === null || userRole === null || (userRole !== UserRole.Supervisor && userRole !== UserRole.Administrator)) {
          navigate({ to: '/login', search: { aviso: 'sin-sesion' } as never });
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [session, navigate]);

  return (
    <div data-role="supervisor" className="flex min-h-screen bg-background text-foreground">
      <LayoutSidebar
        variant="persistent"
        width="narrow"
        groups={supervisorGroups}
        homeHref="/supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <LayoutHeader
          title="Auditoría y Fiscalización"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {/* Hoja de libro mayor: el contenido vive en un documento continuo
              delimitado por hairline, no en tarjetas dispersas (§9.6). */}
          <div className="mx-auto max-w-[1440px] rounded-lg border border-border bg-surface shadow-xs">
            {children}
          </div>
        </main>

        <OperationalFooter roleLabel="Auditoría, Fiscalización & Cumplimiento" />
      </div>
    </div>
  );
}
