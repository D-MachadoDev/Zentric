import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatDateTime, formatRelativeTime } from './dates';
import { formatCount, formatRate, shortId } from './format';

// Zona fija: sin ella el resultado dependria del reloj de la maquina.
const ISO = '2026-10-10T14:32:00Z';
const TZ = 'America/Bogota';

describe('fechas', () => {
  it('formatea la fecha corta para tablas con y sin zona explícita', () => {
    expect(formatDate(ISO, TZ)).toMatch(/2026/);
    expect(formatDate(ISO)).toMatch(/2026/);
  });

  it('usa hora de 24 digitos en fecha y hora', () => {
    expect(formatDateTime(ISO, TZ)).toMatch(/\b(14|09):32\b/);
  });

  it('formatea tiempos relativos en minutos y cae a fecha absoluta pasados 7 dias', () => {
    expect(formatRelativeTime(ISO, new Date('2026-10-10T14:35:00Z'))).toBeTruthy();
    expect(formatRelativeTime(ISO, new Date('2026-10-20T14:32:00Z'))).toMatch(/2026/);
  });

  it('formatea un rango de fechas compacto', () => {
    const range = formatDateRange('2026-10-10T14:32:00Z', '2026-10-14T14:32:00Z', TZ);
    expect(range).toContain('–');
    expect(range).toMatch(/2026/);
  });
});

describe('identificadores y cantidades', () => {
  it('trunca un GUID largo conservando ambos extremos', () => {
    const id = 'e2c1a7f3-1234-5678-9abc-def012345678';
    const short = shortId(id);
    expect(short).toContain('…');
    expect(short.startsWith('e2c1a7f3')).toBe(true);
    expect(short.endsWith('5678')).toBe(true);
    expect(short.length).toBeLessThan(id.length);
  });

  it('no toca un identificador que ya es corto', () => {
    expect(shortId('abc')).toBe('abc');
  });

  it('pinta un porcentaje con una decima', () => {
    expect(formatRate(0.1234)).toBe('12,3%');
  });

  it('agrupa el contador por miles', () => {
    expect(formatCount(1234567)).toBe('1.234.567');
  });
});
