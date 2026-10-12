import type { AlertPort } from '../../domain';

/**
 * Adaptador de `AlertPort` (Frontend-Architecture §4, Frontend-Adapters §5).
 *
 * Es PURO TypeScript: no conoce React ni `sonner`. Sólo administra quién está
 * escuchando y resuelve las promesas. La pintada vive en
 * `components/alert/AlertHost.tsx`, porque §2 prohíbe a `adapters/` importar
 * componentes de UI.
 */

/** Aviso flotante ya reducido a lo que el design system sabe pintar. */
export interface AvisoAlerta {
  kind: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

/** Confirmación que el host debe abrir como diálogo modal. */
export interface ConfirmacionAlerta {
  title: string;
  message: string;
  confirmLabel?: string;
  /** El host invoca esto con la elección del usuario; el adapter la ignora si ya se resolvió. */
  cerrar: (aceptada: boolean) => void;
}

/** Lo que el host registra al montarse. */
export interface AlertHostBindings {
  mostrarAviso: (aviso: AvisoAlerta) => void;
  abrirConfirmacion: (confirmacion: ConfirmacionAlerta) => void;
}

export class AlertAdapter implements AlertPort {
  #mostrarAviso: AlertHostBindings['mostrarAviso'] | null = null;
  #abrirConfirmacion: AlertHostBindings['abrirConfirmacion'] | null = null;
  /** El `resolve` de la confirmación abierta; al llegar otra, la anterior se cancela. */
  #resolverPendiente: ((aceptada: boolean) => void) | null = null;

  /**
   * Registra el host y devuelve el desenlace. Mientras no haya host,
   * `confirm()` se resuelve `false` en vez de quedar colgada para siempre.
   */
  bind(bindings: AlertHostBindings): () => void {
    this.#mostrarAviso = bindings.mostrarAviso;
    this.#abrirConfirmacion = bindings.abrirConfirmacion;

    return () => {
      this.#mostrarAviso = null;
      this.#abrirConfirmacion = null;
      this.#cancelarPendiente();
    };
  }

  /**
   * `AlertPort.show`. Un toast se cierra solo, así que la promesa resuelve al
   * encolarlo: esperar a que desaparezca no significa nada para quien lo invoca.
   */
  show(kind: AvisoAlerta['kind'], title: string, message?: string): Promise<void> {
    this.#mostrarAviso?.({ kind, title, message });
    return Promise.resolve();
  }

  /**
   * `AlertPort.confirm`. Sólo hay UNA confirmación a la vez: si llega otra
   * mientras el diálogo está abierto, la anterior se resuelve `false` (§5).
   */
  confirm(title: string, message: string, confirmLabel?: string): Promise<boolean> {
    this.#cancelarPendiente();

    const abrir = this.#abrirConfirmacion;
    if (abrir === null) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      // Una vez elegida la opción, las llamadas posteriores (por ejemplo el
      // `onOpenChange` que Radix dispara al cerrar) se ignoran: la promesa ya
      // se ha asentado y su resultado no debe poder cambiar.
      let elegido = false;
      const cerrar = (aceptada: boolean) => {
        if (elegido) return;
        elegido = true;
        this.#resolverPendiente = null;
        resolve(aceptada);
      };

      this.#resolverPendiente = cerrar;
      abrir({ title, message, confirmLabel, cerrar });
    });
  }

  #cancelarPendiente(): void {
    this.#resolverPendiente?.(false);
    this.#resolverPendiente = null;
  }
}
