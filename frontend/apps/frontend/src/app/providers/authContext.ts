import { createContext, useContext } from 'react';
import type { CurrentUser, LoginInput, SessionPort, UserRole, ZentricApiPort } from '../../domain';

/**
 * Estado compartido por Context (`AuthProvider` / `useAuth()`).
 */
export interface AuthValue {
  /** El puerto de sesión: mismas lecturas que hacen las guardas del router. */
  session: SessionPort;
  /** Para construir los casos de uso que necesita cada página. */
  api: ZentricApiPort;
  user: CurrentUser | null;
  accessToken: string | null;
  role: UserRole | null;
  /** Mensaje de sesión caducada (401) que la interfaz debe mostrar. */
  expiredNotice: string | null;
  login(input: LoginInput): Promise<CurrentUser>;
  logout(): void;
  clearExpiredNotice(): void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  // Sin proveedor no hay composición que valga: fallar aquí es mejor que pintar
  // una pantalla que parece no tener sesión cuando en realidad no hay dónde mirar.
  if (value === null) throw new Error('useAuth() requiere <AuthProvider> en el árbol.');
  return value;
}
