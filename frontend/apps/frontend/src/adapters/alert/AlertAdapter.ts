import type {
  AlertKind,
  AlertPort,
  ConfirmOptions,
  ShowNotificationOptions,
} from '../../domain';

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
  variant?: 'default' | 'destructive';
  /** El host invoca esto con la elección del usuario; el adapter la ignora si ya se resolvió. */
  cerrar: (aceptada: boolean) => void;
}

/** Lo que el host registra al montarse. */
export interface AlertHostBindings {
  mostrarAviso: (aviso: AvisoAlerta) => void;
  abrirConfirmacion: (confirmacion: ConfirmacionAlerta) => void;
}

/**
 * Adaptador de `AlertPort`.
 *
 * Es PURO TypeScript: no conoce React ni librerías de UI externas.
 * Administra la cola de alertas y resuelve promesas de confirmación modal.
 */
export class AlertAdapter implements AlertPort {
  #mostrarAviso: AlertHostBindings['mostrarAviso'] | null = null;
  #abrirConfirmacion: AlertHostBindings['abrirConfirmacion'] | null = null;
  /** El `resolve` de la confirmación abierta; al llegar otra, la anterior se cancela. */
  #resolverPendiente: ((aceptada: boolean) => void) | null = null;

  /**
   * Registra el host y devuelve el método de desmontaje.
   * Mientras no haya host, `confirm()` se resuelve `false`.
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
   * Muestra un toast / notificación flotante.
   * Acepta tanto opciones como parámetros posicionales.
   */
  show(
    kindOrOptions: ShowNotificationOptions | Exclude<AlertKind, 'confirm'>,
    title?: string,
    message?: string,
  ): Promise<void> {
    if (typeof kindOrOptions === 'object') {
      const { title: t, description, variant } = kindOrOptions;
      const kind = variant === 'danger' ? 'error' : variant;
      this.#mostrarAviso?.({ kind, title: t, message: description });
    } else {
      this.#mostrarAviso?.({ kind: kindOrOptions, title: title ?? '', message });
    }
    return Promise.resolve();
  }

  /**
   * Abre un diálogo modal de confirmación.
   * Acepta tanto objeto `ConfirmOptions` como parámetros posicionales.
   */
  confirm(
    optionsOrTitle: ConfirmOptions | string,
    message?: string,
    confirmLabel?: string,
  ): Promise<boolean> {
    this.#cancelarPendiente();

    const abrir = this.#abrirConfirmacion;
    if (abrir === null) return Promise.resolve(false);

    let title: string;
    let desc: string;
    let label: string | undefined;
    let variant: 'default' | 'destructive' | undefined;

    if (typeof optionsOrTitle === 'object') {
      title = optionsOrTitle.title;
      desc = optionsOrTitle.description;
      label = optionsOrTitle.confirmLabel;
      variant = optionsOrTitle.variant;
    } else {
      title = optionsOrTitle;
      desc = message ?? '';
      label = confirmLabel;
    }

    return new Promise<boolean>((resolve) => {
      let elegido = false;
      const cerrar = (aceptada: boolean) => {
        if (elegido) return;
        elegido = true;
        this.#resolverPendiente = null;
        resolve(aceptada);
      };

      this.#resolverPendiente = cerrar;
      abrir({ title, message: desc, confirmLabel: label, variant, cerrar });
    });
  }

  #cancelarPendiente(): void {
    this.#resolverPendiente?.(false);
    this.#resolverPendiente = null;
  }
}
