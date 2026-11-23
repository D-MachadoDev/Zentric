const DEFAULT_BASE_URL = 'http://localhost:15433';

function getApiBaseUrl(): string {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __ZENTRIC_API_BASE_URL__?: string }).__ZENTRIC_API_BASE_URL__ === 'string'
  ) {
    return (window as unknown as { __ZENTRIC_API_BASE_URL__: string }).__ZENTRIC_API_BASE_URL__;
  }
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
}

export interface ResetPasswordPayload {
  token?: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/**
 * Solicita el restablecimiento de contraseña para un correo electrónico.
 * Se comunica con POST /api/auth/forgot-password.
 */
export async function requestPasswordReset(
  email: string,
  customBaseUrl?: string,
): Promise<ForgotPasswordResponse> {
  const baseUrl = (customBaseUrl ?? getApiBaseUrl()).replace(/\/+$/u, '');
  const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail ?? errorData.title ?? 'Error al solicitar recuperación');
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'Error al solicitar recuperación') {
        throw e;
      }
      throw new Error('No se pudo procesar la solicitud en este momento.');
    }
  }

  return response.json();
}

/**
 * Valida la existencia y vigencia de un token de restablecimiento.
 * Se comunica con GET /api/auth/validate-reset-token.
 */
export async function validateResetToken(
  token: string,
  customBaseUrl?: string,
): Promise<ValidateResetTokenResponse> {
  const baseUrl = (customBaseUrl ?? getApiBaseUrl()).replace(/\/+$/u, '');
  const response = await fetch(
    `${baseUrl}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    return { valid: false };
  }

  return response.json();
}

/**
 * Restablece la contraseña de un usuario consumiendo un token válido.
 * Se comunica con POST /api/auth/reset-password.
 */
export async function resetPassword(
  payload: ResetPasswordPayload,
  customBaseUrl?: string,
): Promise<ResetPasswordResponse> {
  if (!payload.token) {
    throw new Error('El token de restablecimiento es requerido.');
  }

  const baseUrl = (customBaseUrl ?? getApiBaseUrl()).replace(/\/+$/u, '');
  const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      token: payload.token,
      newPassword: payload.password,
    }),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.detail ?? errorData.title ?? 'El enlace de recuperación es inválido o ha expirado.',
      );
    } catch (e: unknown) {
      if (e instanceof Error && !e.message.includes('JSON')) {
        throw e;
      }
      throw new Error('El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.');
    }
  }

  return response.json();
}
