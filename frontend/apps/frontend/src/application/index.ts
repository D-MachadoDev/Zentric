/**
 * Capa de aplicación del cliente (Frontend-Architecture §2).
 *
 * Casos de uso que orquestan los puertos del dominio. No conocen HTTP, React
 * ni diálogos, y sólo importan de `domain/`.
 */
export * from './dto';
export * from './schemas';
export * from './services';
