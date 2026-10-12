import { describe, expect, it } from 'vitest';
import { toApiError } from '../problemDetails';

describe('toApiError (Frontend-Adapters §3.4)', () => {
  it('prefiere `detail` del ProblemDetails del controlador', () => {
    const error = toApiError(404, JSON.stringify({ status: 404, detail: 'Order with ID x not found.' }));

    expect(error.status).toBe(404);
    expect(error.detail).toBe('Order with ID x not found.');
  });

  it('usa `title` cuando el middleware no envía `detail`', () => {
    const error = toApiError(
      400,
      JSON.stringify({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { role: ['The JSON value could not be converted…'] },
        traceId: '00-979ade00',
      }),
    );

    expect(error.detail).toBe('One or more validation errors occurred.');
  });

  it('aplana `errors` conservando el campo cuando no hay ni detail ni title', () => {
    const error = toApiError(
      400,
      JSON.stringify({ status: 400, errors: { role: ['Rol no válido'], email: ['Requerido'] } }),
    );

    expect(error.detail).toBe('role: Rol no válido email: Requerido');
  });

  it('conserva el traceId para soporte', () => {
    const error = toApiError(500, JSON.stringify({ status: 500, detail: 'Fallo.', traceId: '00-abc' }));

    expect(error.traceId).toBe('00-abc');
  });

  it('degrada a un mensaje genérico con el estado si el cuerpo no es JSON', () => {
    const error = toApiError(502, '<html>Bad Gateway</html>');

    expect(error.detail).toBe('El servidor devolvió un error (502).');
    expect(error.traceId).toBeUndefined();
  });

  it('tolera un cuerpo vacío', () => {
    const error = toApiError(500, '');

    expect(error.detail).toBe('El servidor devolvió un error (500).');
  });
});
