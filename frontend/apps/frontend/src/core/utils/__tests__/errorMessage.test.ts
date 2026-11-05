import { describe, expect, it } from 'vitest';
import { ApiError } from '../../types/models/ApiError';
import { mensajeDeError } from '../errorMessage';

/**
 * Traducción de errores a mensaje (Frontend-Architecture sección 5).
 *
 * Lo que se fija aquí no es sólo el texto, sino lo que NO se dice: un `401` no
 * significa lo mismo en el formulario de acceso que en el resto de la consola,
 * y un `5xx` nunca puede arrastrar un detalle técnico al usuario.
 */
describe('mensajeDeError (sección 5)', () => {
  it('un 401 en el resto de la consola anuncia la caducidad', () => {
    const mensaje = mensajeDeError(new ApiError(401, 'Unauthorized'));

    expect(mensaje).toContain('caducado');
  });

  it('un 401 en la pantalla de acceso anuncia credenciales incorrectas', () => {
    const mensaje = mensajeDeError(new ApiError(401, 'Unauthorized'), { enAcceso: true });

    // Decirle a alguien que su sesión caducó justo cuando está intentando entrar
    // sería mentirle: allí un `401` significa que las credenciales no valen.
    expect(mensaje).toContain('no son correctos');
    expect(mensaje).not.toContain('caducado');
  });

  it('un 403 anuncia permiso insuficiente', () => {
    expect(mensajeDeError(new ApiError(403, 'Forbidden'))).toContain('permiso');
  });

  it('propaga el detalle del servidor en un 400', () => {
    // sección 5: "Mostrar el mensaje del servidor junto al formulario". El `detail` del
    // RFC 7807 ya lo escribió el servidor pensando en el usuario.
    const detalle = 'El documento ya está registrado.';

    expect(mensajeDeError(new ApiError(400, detalle))).toBe(detalle);
  });

  it('en un 5xx ofrece el traceId como referencia de soporte', () => {
    const mensaje = mensajeDeError(new ApiError(500, 'Internal Server Error', 'abc-123'));

    expect(mensaje).toContain('abc-123');
  });

  it('en un 5xx sin traceId no inventa una referencia', () => {
    const mensaje = mensajeDeError(new ApiError(502, 'Bad Gateway'));

    expect(mensaje).not.toContain('ref.');
    expect(mensaje).toContain('Inténtalo de nuevo');
  });

  it('un error de red genérico o timeout tiene mensaje claro', () => {
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toContain('conexión');
    expect(mensajeDeError(new Error('timeout exceeded'))).toContain('conexión');
  });
});
