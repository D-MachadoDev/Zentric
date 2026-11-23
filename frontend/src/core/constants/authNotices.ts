/**
 * Zentric Core — Catálogo Centralizado de Avisos de Autenticación
 *
 * Microtextos de orientación empática y estado de sesión
 * para la experiencia de comprador y vendedores.
 */

export type AuthNoticeKey =
  | 'sin-sesion'
  | 'expirada'
  | 'cuenta-creada'
  | 'clave-actualizada';

export type AuthNoticeVariant = 'info' | 'warning' | 'success';

export interface AuthNoticeItem {
  key: AuthNoticeKey;
  title: string;
  message: string;
  variant: AuthNoticeVariant;
}

export const AUTH_NOTICES: Record<AuthNoticeKey, AuthNoticeItem> = {
  'sin-sesion': {
    key: 'sin-sesion',
    title: 'Sesión Requerida',
    message: 'Ingresa con tu cuenta para consultar tus pedidos y guardar tus direcciones.',
    variant: 'info',
  },
  expirada: {
    key: 'expirada',
    title: 'Sesión Expirada',
    message: 'Por tu seguridad cerramos la sesión. Ingresa de nuevo para retomar tu compra.',
    variant: 'warning',
  },
  'cuenta-creada': {
    key: 'cuenta-creada',
    title: 'Cuenta Creada Exitosamente',
    message: 'Tu cuenta está lista. Inicia sesión para comenzar a explorar tus compras.',
    variant: 'success',
  },
  'clave-actualizada': {
    key: 'clave-actualizada',
    title: 'Contraseña Actualizada',
    message: 'Tu contraseña ha sido cambiada con éxito. Inicia sesión con tus nuevas credenciales.',
    variant: 'success',
  },
};

/**
 * Obtiene el aviso de autenticación tipado a partir de una clave opcional.
 * Devuelve `null` si la clave no coincide con el catálogo.
 */
export function getAuthNotice(key: string | null | undefined): AuthNoticeItem | null {
  if (!key) return null;
  return AUTH_NOTICES[key as AuthNoticeKey] ?? null;
}
