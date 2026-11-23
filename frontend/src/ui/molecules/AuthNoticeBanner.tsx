import type { HTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import {
  type AuthNoticeItem,
  type AuthNoticeKey,
  getAuthNotice,
} from '../../core/constants/authNotices';

export interface AuthNoticeBannerProps extends HTMLAttributes<HTMLDivElement> {
  /** Clave del aviso en el catálogo canónico (ej. 'sin-sesion', 'expirada') */
  noticeKey?: AuthNoticeKey | string | null;
  /** Objeto de aviso directo si ya fue resuelto previamente */
  notice?: AuthNoticeItem | null;
}

/**
 * Píldora compacta de aviso contextual de autenticación (~34px).
 * Provee feedback empático y accesible para sesiones expiradas,
 * altas exitosas y requerimientos de login.
 */
export function AuthNoticeBanner({
  noticeKey,
  notice: explicitNotice,
  className = '',
  ...props
}: AuthNoticeBannerProps) {
  const item = explicitNotice ?? getAuthNotice(noticeKey);

  if (!item) return null;

  const variantStyles = {
    info: {
      container:
        'border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-300',
      icon: (
        <AlertCircle
          className="size-4 shrink-0 text-teal-600 dark:text-teal-400"
          aria-hidden="true"
        />
      ),
    },
    warning: {
      container:
        'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      icon: (
        <Clock
          className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      ),
    },
    success: {
      container:
        'border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-300',
      icon: (
        <CheckCircle2
          className="size-4 shrink-0 text-teal-600 dark:text-teal-400"
          aria-hidden="true"
        />
      ),
    },
  }[item.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors ${variantStyles.container} ${className}`}
      {...props}
    >
      {variantStyles.icon}
      <div className="leading-snug">
        <span className="font-semibold">{item.title}. </span>
        <span>{item.message}</span>
      </div>
    </div>
  );
}
