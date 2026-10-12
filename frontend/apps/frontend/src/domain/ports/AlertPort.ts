/**
 * Puerto de alertas (Frontend-Architecture §4).
 *
 * Único punto por el que la aplicación pide confirmaciones y avisos; la
 * presentación decide cómo mostrarlos (dialog de `@zentric/ui`).
 */
export type AlertKind = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertPort {
  show(kind: Exclude<AlertKind, 'confirm'>, title: string, message?: string): Promise<void>;
  confirm(title: string, message: string, confirmLabel?: string): Promise<boolean>;
}
