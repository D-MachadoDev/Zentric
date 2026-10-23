import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthToken,
  CurrentUser,
  CreateUserInput,
  LoginInput,
  SessionPort,
  User,
  UserProfile,
  UpdateUserProfileInput,
  UserRole,
  ZentricApiPort,
} from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi, resolveSession } from './apiContext';

/**
 * Hook de mutación para inicio de sesión.
 *
 * Guarda el token y el perfil en SessionPort en memoria RAM (ADR-0009) y
 * actualiza la clave ['auth', 'me'] en TanStack Query.
 */
export function useLoginMutation(api?: ZentricApiPort, session?: SessionPort) {
  const queryClient = useQueryClient();
  const apiPort = api;
  const sessionPort = session;

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<AuthToken> => {
      const activeApi = resolveApi(apiPort);
      const activeSession = resolveSession(sessionPort);

      const result = await activeApi.login(input);
      activeSession.setAccessToken(result.token);
      activeSession.setUser?.({
        userId: result.userId,
        email: result.email,
        fullName: result.fullName,
        role: result.role,
      });

      queryClient.setQueryData(queryKeys.auth.me(), {
        userId: result.userId,
        email: result.email,
        fullName: result.fullName,
        role: result.role,
      });

      return result;
    },
  });
}

/**
 * Hook de consulta para el usuario autenticado actual.
 */
export function useCurrentUserQuery(
  api?: ZentricApiPort,
  session?: SessionPort,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async (): Promise<CurrentUser> => {
      const activeApi = resolveApi(api);
      const activeSession = resolveSession(session);
      const user = await activeApi.getCurrentUser();
      activeSession.setUser?.(user);
      return user;
    },

    enabled: options?.enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Hook de mutación local para cierre de sesión (ADR-0009).
 * Purga la memoria RAM y limpia la caché completa del QueryClient.
 */
export function useLogoutMutation(session?: SessionPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const activeSession = resolveSession(session);
      activeSession.clear();
      queryClient.clear();
    },
  });
}

/**
 * Hook de consulta para listar usuarios (Exclusivo Administrador).
 */
export function useUsersQuery(role?: UserRole, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.users.list({ role }),
    queryFn: () => resolveApi(api).listUsers(role),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para obtener ficha técnica de un usuario por id.
 */
export function useUserQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => resolveApi(api).getUserById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para dar de alta un usuario.
 * No altera la sesión del llamante (INV-APP-01).
 */
export function useCreateUserMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => resolveApi(api).createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Hook de mutación para bloquear un usuario.
 */
export function useBlockUserMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).blockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Hook de mutación para reactivar un usuario.
 */
export function useActivateUserMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Hook de consulta para el perfil del usuario autenticado (Slice 3).
 * GET /api/users/profile
 */
export function useUserProfileQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: (): Promise<UserProfile> => resolveApi(api).getUserProfile(),
    staleTime: 30_000,
  });
}

export const useUserProfile = useUserProfileQuery;

/**
 * Hook de mutación para actualizar el perfil del usuario autenticado (Slice 3).
 * PUT /api/users/profile
 */
export function useUpdateUserProfileMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserProfileInput) => resolveApi(api).updateUserProfile(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.users.profile(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export const useUpdateUserProfile = useUpdateUserProfileMutation;

// ── Clases de servicio heredadas para compatibilidad total ──────────────────

export class IniciarSesionService {
  constructor(
    private readonly api: ZentricApiPort,
    private readonly session: SessionPort,
  ) {}

  async ejecutar(input: LoginInput): Promise<CurrentUser> {
    const auth: AuthToken = await this.api.login(input);
    this.session.setAccessToken(auth.token);
    if (this.session.setUser) {
      this.session.setUser({
        userId: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        role: auth.role,
      });
    } else {
      this.session.setRole(auth.role);
      this.session.setUserId(auth.userId);
    }

    return {
      userId: auth.userId,
      email: auth.email,
      fullName: auth.fullName,
      role: auth.role,
    };
  }
}

export class RestaurarSesionService {
  constructor(
    private readonly api: ZentricApiPort,
    private readonly session: SessionPort,
  ) {}

  async ejecutar(): Promise<CurrentUser | null> {
    if (this.session.getAccessToken() === null) return null;

    const user = this.api.getCurrentUser
      ? await this.api.getCurrentUser()
      : await this.api.currentUser();

    if (this.session.setUser) {
      this.session.setUser(user);
    } else {
      this.session.setRole(user.role);
      this.session.setUserId(user.userId);
    }
    return user;
  }
}


export class CerrarSesionService {
  constructor(private readonly session: SessionPort) {}

  ejecutar(): void {
    this.session.clear();
  }
}

export class RegistrarUsuarioService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: CreateUserInput): Promise<string> {
    return this.api.createUser(input);
  }
}

export class ConsultarUsuariosService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(): Promise<User[]> {
    return this.api.listUsers();
  }
}
