import type {
  AuthToken,
  CurrentUser,
  CreateUserInput,
  LoginInput,
  SessionPort,
  User,
  ZentricApiPort,
} from '../../domain';

/**
 * Casos de uso de identidad y acceso (Frontend-Domain-Services §2.1).
 *
 * El access token vive SOLO en memoria (ADR-0009): no hay refresh, así que
 * ninguna sesión sobrevive a recargar la página.
 */

export class IniciarSesionService {
  constructor(
    private readonly api: ZentricApiPort,
    private readonly session: SessionPort,
  ) {}

  /**
   * `POST /api/auth/login`. Guarda el token en memoria y devuelve la identidad.
   * No devuelve el token: quien llama no debe manipularlo.
   */
  async ejecutar(input: LoginInput): Promise<CurrentUser> {
    const auth: AuthToken = await this.api.login(input);
    this.session.setAccessToken(auth.token);
    this.session.setRole(auth.role);
    this.session.setUserId(auth.userId);

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

  /**
   * Reconstruye la identidad al abrir la app. Sin token no se restaura nada:
   * no existe refresh (ADR-0009), de modo que hay que volver a autenticarse.
   */
  async ejecutar(): Promise<CurrentUser | null> {
    if (this.session.getAccessToken() === null) return null;

    const user = await this.api.currentUser();
    this.session.setRole(user.role);
    this.session.setUserId(user.userId);
    return user;
  }
}

export class CerrarSesionService {
  constructor(private readonly session: SessionPort) {}

  /** Limpia la sesión en memoria y devuelve el estado inicial. */
  ejecutar(): void {
    this.session.clear();
  }
}

export class RegistrarUsuarioService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/users`. La unicidad de documento y correo la valida el servidor
   * (Validación crítica); el cliente no la replica, la pide y propaga el error.
   *
   * La sesión **no** se toca: el `Guid` devuelto pertenece al usuario CREADO,
   * no al llamante. Sobrescribir el `userId` de la sesión con él dejaría al
   * Administrador que da de alta un Vendedor creyéndose ese Vendedor.
   */
  ejecutar(input: CreateUserInput): Promise<string> {
    return this.api.createUser(input);
  }
}

export class ConsultarUsuariosService {
  constructor(private readonly api: ZentricApiPort) {}

  /** Listado para el panel del Administrador. */
  ejecutar(): Promise<User[]> {
    return this.api.listUsers();
  }
}
