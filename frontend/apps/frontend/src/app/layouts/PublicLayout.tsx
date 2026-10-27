import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PublicHeader } from '../components/PublicHeader';

interface PublicLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para pantallas públicas y de autenticación (AuthShell).
 *
 * Aplica (Frontend-Design-System sección 9):
 * - Lienzo porcelana en claro / grafito-tinta en oscuro (#0B0F19 / #111827),
 *   con superficies limpias de alta legibilidad y tokens semánticos.
 * - Logotipo central y pie de página con enlace a telemetría de salud.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Cabecera institucional unificada */}
      <PublicHeader />

      {/* Contenido principal */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        {children}
      </main>

      {/* Pie de página institucional con enlaces legales y Developed with <3 */}
      <footer className="relative z-10 flex flex-col sm:flex-row min-h-14 items-center justify-between gap-3 border-t border-border bg-background/85 px-6 py-3 font-mono text-xs text-foreground-subtle backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <span>© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
          <span className="text-border" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 text-foreground-muted">
            <span>Developed with</span>
            <span className="text-rose-500 motion-safe:animate-pulse" aria-label="love">❤️</span>
          </span>
        </div>
        <nav className="flex items-center gap-4" aria-label="Enlaces legales">
          <Link to="/terms" className="text-foreground-subtle hover:text-brand transition-colors">Términos</Link>
          <Link to="/privacy" className="text-foreground-subtle hover:text-brand transition-colors">Privacidad</Link>
          <Link to="/cookies" className="text-foreground-subtle hover:text-brand transition-colors">Cookies</Link>
          <Link to="/legal" className="text-foreground-subtle hover:text-brand transition-colors">Aviso Legal</Link>
        </nav>
        <span>Consola Operativa Suiza · Doble Tema Porcelana/Grafito · v2.0.0</span>
      </footer>
    </div>
  );
}
