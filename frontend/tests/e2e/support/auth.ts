import { expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Soporte de autenticacion para los E2E de Zentric.
 *
 * El frontend hidrata la sesion desde `localStorage`
 * (`zentric.auth.token` / `zentric.auth.user`, ver
 * `src/adapters/session/MemorySessionAdapter.ts`) y ademas revalida contra
 * `GET /api/auth/me`, asi que hace falta un token REAL de la API: un token
 * sintetico pasaria la pantalla de login pero fallaria en la primera llamada
 * autenticada.
 *
 * Usuarios canonicos sembrados por `AdministratorBootstrapper`:
 *   buyer@zentric.local / BuyerLocal12345
 *   seller@zentric.local / SellerLocal12345
 *   admin@zentric.local / AdminLocal12345
 *   logistics@zentric.local / LogisticsLocal12345
 *   supervisor@zentric.local / SupervisorLocal12345
 */

export const SESSION_TOKEN_KEY = 'zentric.auth.token';
export const SESSION_USER_KEY = 'zentric.auth.user';

/**
 * URL de la API.
 *
 * `playwright.config.ts` la fija de forma explicita en `VITE_API_BASE_URL`
 * antes de que corra cualquier test, asi que aqui nunca se depende de un
 * `VITE_API_BASE_URL` obsoleto que quede en el shell.
 */
export const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:15433';

export const USERS = {
  buyer: { email: 'buyer@zentric.local', password: 'BuyerLocal12345' },
  seller: { email: 'seller@zentric.local', password: 'SellerLocal12345' },
  admin: { email: 'admin@zentric.local', password: 'AdminLocal12345' },
  logistics: { email: 'logistics@zentric.local', password: 'LogisticsLocal12345' },
  supervisor: { email: 'supervisor@zentric.local', password: 'SupervisorLocal12345' },
} as const;

export type UserKind = keyof typeof USERS;

interface AuthTokenResponse {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
}

/**
 * Autentica contra la API real y devuelve el token del rol pedido.
 * Falla el test si la API no responde o las credenciales no son validas.
 */
export async function loginAs(
  request: APIRequestContext,
  kind: UserKind,
): Promise<AuthTokenResponse> {
  const user = USERS[kind];
  const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email: user.email, password: user.password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Login fallido para ${kind} (${user.email}): HTTP ${response.status()} - ${body}`,
    );
  }

  const body = (await response.json()) as AuthTokenResponse;
  expect(body.token, 'la API debe devolver un access token').toBeTruthy();
  return body;
}

/**
 * Deja la sesion lista en el navegador: siembra `localStorage` con el token y
 * el `CurrentUser` antes de la primera navegacion, de modo que el guard de
 * rol (`exigirUnoDeRoles`) deja pasar al usuario correcto.
 */
export async function seedSession(page: Page, kind: UserKind): Promise<AuthTokenResponse> {
  const token = await loginAs(page.request, kind);

  await page.addInitScript(
    ([tokenKey, userKey, accessToken, user]) => {
      window.localStorage.setItem(tokenKey, accessToken);
      window.localStorage.setItem(userKey, user);
    },
    [
      SESSION_TOKEN_KEY,
      SESSION_USER_KEY,
      token.token,
      JSON.stringify({
        userId: token.userId,
        email: token.email,
        fullName: token.fullName,
        role: token.role,
      }),
    ] as const,
  );

  return token;
}

/** Sesion de Comprador (por defecto en la mayoria de los flujos). */
export async function loginAsBuyer(page: Page) {
  return seedSession(page, 'buyer');
}
