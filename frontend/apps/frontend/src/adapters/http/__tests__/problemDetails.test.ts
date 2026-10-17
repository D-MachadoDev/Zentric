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

  it('tolera un cuerpo vacío y códigos 4xx no-JSON o arreglos JSON', () => {
    const error500 = toApiError(500, '');
    expect(error500.detail).toBe('El servidor devolvió un error (500).');

    const error400 = toApiError(400, 'Bad Request Text');
    expect(error400.title).toBe('Error de solicitud');

    const errorArray = toApiError(422, JSON.stringify(['no-es-record']));
    expect(errorArray.title).toBe('Error de solicitud');
  });

  it('soporta errores de validación como string directo y objetos de error vacíos en 500', () => {
    const withStringError = toApiError(
      400,
      JSON.stringify({
        errors: {
          email: 'Formato inválido',
          tags: [123, 'Etiqueta vacía'],
          ignored: 42,
        },
      }),
    );
    expect(withStringError.detail).toBe('email: Formato inválido tags: Etiqueta vacía');

    const withEmptyErrors = toApiError(503, JSON.stringify({ errors: {} }));
    expect(withEmptyErrors.title).toBe('Error del servidor');
    expect(withEmptyErrors.detail).toBe('El servidor devolvió un error (503).');
  });
});

