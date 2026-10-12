import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyAmount, isFree } from './money';

describe('formatMoney', () => {
  it('pinta COP con el locale del backend', () => {
    // El backend es la autoridad (Q-16): la moneda llega en el DTO.
    expect(formatMoney({ amount: 36000, currency: 'COP' })).toContain('36.000');
    expect(formatMoney({ amount: 36000, currency: 'COP' })).toContain('$');
  });

  it('normaliza la divisa a mayusculas antes de formatear', () => {
    expect(formatMoney({ amount: 1000, currency: 'cop' })).toBe(
      formatMoney({ amount: 1000, currency: 'COP' }),
    );
  });

  it('no silencia una divisa fuera de la lista blanca', () => {
    // Ocultarla mentiria sobre un dato que el backend ya acepto.
    expect(formatMoney({ amount: 5, currency: 'XYZ' })).toContain('XYZ');
  });

  it('respeta el numero de decimales que mande el llamador', () => {
    expect(formatMoney({ amount: 1.5, currency: 'COP' }, { maximumFractionDigits: 0 })).not.toContain(
      ',5',
    );
  });
});

describe('formatMoneyAmount', () => {
  it('devuelve solo cifras, para columnas con cabecera de moneda', () => {
    expect(formatMoneyAmount({ amount: 36000, currency: 'COP' })).toBe('36.000');
  });
});

describe('isFree', () => {
  it('distingue un importe cero de un precio ausente', () => {
    expect(isFree({ amount: 0, currency: 'COP' })).toBe(true);
    expect(isFree({ amount: 1, currency: 'COP' })).toBe(false);
  });
});
