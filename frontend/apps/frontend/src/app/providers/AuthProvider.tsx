import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CerrarSesionService, IniciarSesionService, RestaurarSesionService } from '../../application';
import { isApiError } from '../../domain';
import type { CurrentUser, LoginInput } from '../../domain';
import { appServices } from './appServices';
import { AuthContext } from './authContext';
import type { AuthValue } from './authContext';

/**
 * Publica la sesión a páginas, layouts y guardas (C4-4 §3).
 *
 * **Context no es almacenamiento persistente:** el access token vive sólo en
 * `SessionPort`, que a su vez sólo usa memoria. Al recargar la página se pierde
 * y no hay refresh que lo evite (`ADR-0009` / Q15-B), así que la única vía para
 * identificarse de nuevo es volver a entrar por `/entrar`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, api } = appServices;
  const [user, setUser] = useState<CurrentUser | null>(() => session.getUser());
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  // C4-4 §4: al montar, valida `GET /api/auth/me` sólo si queda token en
  // memoria. Al abrir la app normalmente no lo hay (se perdió al recargar), así
  // que la llamada no se hace y no hay tráfico espurio.
  useEffect(() => {
    if (session.getAccessToken() === null) return;

    let activo = true;
    new RestaurarSesionService(api, session)
      .ejecutar()
      .then((restored) => {
        if (activo) setUser(restored);
      })
      .catch((error: unknown) => {
        if (!activo) return;
        // Un `401` es predecible: la sesión ya no sirve, se limpia y se avisa.
        // Cualquier otro fallo (red caída) NO borra la sesión — decidir que la
        // identidad no existe porque el servidor no contestó sería mentir.
        if (isApiError(error) && error.status === 401) {
          session.clear();
          setUser(null);
          setExpiredNotice('Tu sesión ha caducado. Vuelve a entrar.');
        }
      });

    return () => {
      activo = false;
    };
  }, [api, session]);

  const login = useCallback(
    async (input: LoginInput): Promise<CurrentUser> => {
      const identity = await new IniciarSesionService(api, session).ejecutar(input);
      setUser(identity);
      setExpiredNotice(null);
      return identity;
    },
    [api, session],
  );

  const logout = useCallback(() => {
    new CerrarSesionService(session).ejecutar();
    setUser(null);
    setExpiredNotice(null);
  }, [session]);

  const clearExpiredNotice = useCallback(() => setExpiredNotice(null), []);

  // Se relee en vivo en cada render: `session` es el mismo objeto que usan las
  // guardas, así que no puede haber una identidad mostrada que el router no ve.
  const value = useMemo<AuthValue>(
    () => ({
      session,
      api,
      user,
      accessToken: session.getAccessToken(),
      role: session.getRole(),
      expiredNotice,
      login,
      logout,
      clearExpiredNotice,
    }),
    [session, api, user, expiredNotice, login, logout, clearExpiredNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
