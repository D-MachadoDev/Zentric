import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';

export interface TopProgressBarProps {
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * Barra de progreso superior ultra-delgada (Top Navigation Progress Bar).
 * Patrón estándar de oro (estilo GitHub / YouTube / Vercel / Linear).
 *
 * Se ancla en el borde superior absoluto de la ventana (2.5px),
 * reacciona al estado real de navegación de TanStack Router y provee
 * feedback de velocidad táctil instantánea (<50ms) sin bloquear la pantalla
 * con recuadros falsos en el centro.
 */
export function TopProgressBar({ className = '' }: TopProgressBarProps) {
  const routerState = useRouterState();
  const isNavigating = routerState.status === 'pending' || routerState.isLoading;

  const barRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const container = containerRef.current;
    if (!bar || !container) return;

    let interval: ReturnType<typeof setInterval>;
    let hideTimer: ReturnType<typeof setTimeout>;

    if (isNavigating) {
      container.style.display = 'block';
      bar.style.opacity = '1';
      bar.style.width = '25%';

      let current = 25;
      interval = setInterval(() => {
        if (current < 65) {
          current += Math.random() * 15;
        } else if (current < 85) {
          current += Math.random() * 5;
        } else if (current < 95) {
          current += 0.5;
        }
        bar.style.width = `${current}%`;
      }, 150);
    } else {
      bar.style.width = '100%';

      hideTimer = setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => {
          container.style.display = 'none';
          bar.style.width = '0%';
        }, 300);
      }, 200);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(hideTimer);
    };
  }, [isNavigating]);

  return (
    <aside
      ref={containerRef}
      aria-label="Progreso de navegación"
      aria-hidden="true"
      style={{ display: 'none' }}
      className={`fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none overflow-hidden bg-transparent ${className}`}
    >
      <div
        ref={barRef}
        style={{ width: '0%', opacity: 0 }}
        className="h-full bg-gradient-to-r from-teal-600 via-teal-400 to-emerald-400 shadow-[0_0_10px_#14B8A6,0_0_5px_#14B8A6] transition-all duration-200 ease-out"
      />
    </aside>
  );
}
