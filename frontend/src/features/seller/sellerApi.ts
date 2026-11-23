/**
 * Cliente HTTP específico del vendedor para los endpoints que aún no forman
 * parte del ZentricApiPort (perfil de tienda y billetera comercial).
 *
 * Reutiliza la misma resolución de base URL que el HttpClient central
 * (`VITE_API_BASE_URL` / `window.__ZENTRIC_API_BASE_URL__`, con fallback al
 * puerto de desarrollo) y adjunta el Bearer token de la sesión para que estas
 * llamadas funcionen también fuera del proxy de desarrollo.
 */

const DEFAULT_BASE_URL = 'http://localhost:15433';

export interface SellerProfilePayload {
  storeName: string;
  logoUrl?: string | null;
  isVerified?: boolean;
}

export interface PayoutSummaryPayload {
  availableBalance: number;
  totalSettledSales: number;
  totalConvertedToCredit: number;
  currency: string;
}

export interface BalanceMovementPayload {
  id: string;
  reference: string;
  concept: string;
  date: string;
  amount: number;
  type: 'sale_settlement' | 'credit_applied';
  status: 'Liquidado' | 'Aplicado';
}

function resolveSellerBaseUrl(): string {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __ZENTRIC_API_BASE_URL__?: string }).__ZENTRIC_API_BASE_URL__ ===
      'string'
  ) {
    return (window as unknown as { __ZENTRIC_API_BASE_URL__: string }).__ZENTRIC_API_BASE_URL__;
  }
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

async function request<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const baseUrl = resolveSellerBaseUrl().replace(/\/+$/u, '');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new Error(`La petición falló con estado ${response.status}.`);
  }

  const text = await response.text();
  return (text === '' ? undefined : JSON.parse(text)) as T;
}

export function getSellerProfile(token: string | null): Promise<SellerProfilePayload | null> {
  return request<SellerProfilePayload | null>('/api/seller/profile', { method: 'GET' }, token);
}

export function updateSellerProfile(
  token: string | null,
  payload: SellerProfilePayload,
): Promise<SellerProfilePayload> {
  return request<SellerProfilePayload>(
    '/api/seller/profile',
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function getSellerPayoutsSummary(token: string | null): Promise<PayoutSummaryPayload> {
  return request<PayoutSummaryPayload>('/api/seller/payouts/summary', { method: 'GET' }, token);
}

export function getSellerPayoutsHistory(token: string | null): Promise<BalanceMovementPayload[]> {
  return request<BalanceMovementPayload[]>('/api/seller/payouts/history', { method: 'GET' }, token);
}
