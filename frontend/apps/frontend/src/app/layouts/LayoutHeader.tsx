import { useState, type ReactNode } from 'react';
import { LogOut, Menu, Shield } from 'lucide-react';
import { useAuth } from '../providers/authContext';
import { NOMBRES_DE_ROL } from '../../components/domainLabels';
import { Button } from '@zentric/ui/components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';

interface LayoutHeaderProps {
  title?: string;
  onToggleSidebar?: () => void;
  children?: ReactNode;
}

/**
 * Cabecera superior unificada de contexto operativo (C4-4-Codigo-React.md §2).
 *
 * Muestra:
 * - Botón de menú móvil / colapso lateral.
 * - Título del módulo o sección.
 * - Indicador semántico del rol autenticado (según domainLabels.ts).
 * - Identidad del usuario (nombre / correo) en Geist Sans y Geist Mono.
 * - Botón accesible de cierre de sesión en RAM (ADR-0009).
 */
export function LayoutHeader({ title, onToggleSidebar, children }: LayoutHeaderProps) {
  const { user, role, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeRole = role ?? user?.role ?? null;
  const roleLabel = activeRole ? NOMBRES_DE_ROL[activeRole] : 'Sin Rol';

  const handleLogout = (): void => {
    setIsLoggingOut(true);
    try {
      logout();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      aria-label="Cabecera operativa principal"
      className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6"
    >
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            aria-label="Alternar menú lateral"
            className="text-foreground-muted hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {title && <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>}
        {children}
      </div>

      <div className="flex items-center gap-4">
        {/* Identidad de usuario y rol */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{user?.fullName ?? 'Usuario Zentric'}</p>
            <p className="font-mono text-xs text-foreground-muted">{user?.email ?? ''}</p>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-2.5 py-1"
            title={`Rol: ${roleLabel}`}
          >
            <Shield className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-medium text-foreground-muted">{roleLabel}</span>
          </div>
        </div>

        {/* Selector de Tema Dual (Light/Dark) */}
        <ThemeToggle />

        {/* Botón de cierre de sesión */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Cerrar sesión"
          className="text-foreground-muted hover:bg-danger/10 hover:text-danger"
          title="Cerrar sesión activa"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
