import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CerrarSesionService, IniciarSesionService, RestaurarSesionService } from '../../core';
import { isApiError } from '../../core';
import type { CurrentUser, LoginInput } from '../../core';
import { appServices } from './appServices';
import { AuthContext } from './authContext';
import type { AuthValue } from './authContext';

/**
 * Comparte la sesión activa del usuario con toda la aplicación.
 *
 * Decisión de seguridad: guardamos el token de acceso únicamente en memoria RAM.
 * Si el usuario recarga la pestaña o cierra el navegador, la sesión se reinicia
 * para proteger sus datos personales y prevenir accesos no autorizados.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, api } = appServices;
  const [user, setUser] = useState<CurrentUser | null>(() => session.getUser());
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  // Avisa al estado de React si la sesión cambia en cualquier parte de la aplicación.
  useEffect(() => {
    const unsubscribe = session.subscribe?.(() => {
      setUser(session.getUser?.() ?? null);
    });
    return () => {
      unsubscribe?.();
    };
  }, [session]);

  // Al abrir la app, sólo consultamos al servidor si ya hay un token en memoria.
  // Evitamos peticiones innecesarias si la persona todavía no ha iniciado sesión.
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
        // Si el servidor confirma 401, el token caducó y se pide iniciar sesión nuevamente.
        // Si falla por problemas de red o internet, conservamos la sesión local para reintentar luego.
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

  // Una sola fuente de la verdad para que las pantallas y las guardas de ruta vean al mismo usuario.
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
