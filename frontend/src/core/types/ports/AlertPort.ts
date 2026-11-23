/**
 * Puerto de alertas y confirmaciones.
 *
 * Desacopla la confirmación obligatoria de acciones críticas y avisos
 * respecto a los componentes visuales de React.
 */
export type AlertKind = 'success' | 'error' | 'warning' | 'info' | 'confirm';
export type NotificationVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface ShowNotificationOptions {
  title: string;
  description?: string;
  variant: NotificationVariant;
}

export interface AlertPort {
  show(notification: ShowNotificationOptions): Promise<void> | void;
  show(kind: Exclude<AlertKind, 'confirm'>, title: string, message?: string): Promise<void>;
  confirm(options: ConfirmOptions): Promise<boolean>;
  confirm(title: string, message: string, confirmLabel?: string): Promise<boolean>;
}
