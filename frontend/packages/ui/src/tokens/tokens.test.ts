import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors } from './colors';
import { typography } from './typography';
import { radii, spacing } from './spacing';

// Frontend-Design-System.md seccion 2: "Si ambos divergen, MANDA EL CSS".
// Esa precedencia no se puede hacer cumplir en tiempo de ejecucion, pero sí
// aquí: si alguien cambia un valor en TS sin tocar theme.css, la suite falla.
// Se resuelve por cwd (vitest corre con el cwd del paquete) porque bajo jsdom
// import.meta.url no es un file:// y fileURLToPath lanza.
const css = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8');

/** Extrae la declaracion `--nombre: valor;` del bloque @theme. */
function cssToken(name: string): string | undefined {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

/**
 * Normaliza las comillas de una pila de fuentes.
 * `'A', B` y `"A", B` declaran lo mismo; compararlas literales solo produciria
 * ruido, asi que el test juzga las familias y no el estilo de comilla.
 */
function normalizeFontStack(value: string | undefined): string {
  return (value ?? '').replace(/['"]/g, '');
}

const cssTokenByTsKey: Record<keyof typeof colors, string> = {
  background: 'color-background',
  foreground: 'color-foreground',
  brand: 'color-brand',
  brandStrong: 'color-brand-strong',
  warning: 'color-warning',
  surface: 'color-surface',
  surfaceMuted: 'color-surface-muted',
  border: 'color-border',
  success: 'color-success',
  danger: 'color-danger',
  info: 'color-info',
};

describe('tokens de color', () => {
  it('espeja theme.css sin divergir en ningun valor', () => {
    for (const [tsKey, cssName] of Object.entries(cssTokenByTsKey)) {
      const fromCss = cssToken(cssName);
      expect(fromCss, `--${cssName} no existe en theme.css`).toBeDefined();
      expect(
        colors[tsKey as keyof typeof colors].toLowerCase(),
        `TS y CSS divergen en --${cssName}: manda el CSS`,
      ).toBe(fromCss?.toLowerCase());
    }
  });

  it('declara las dos familias tipograficas decididas en Q8-B', () => {
    expect(normalizeFontStack(cssToken('font-sans'))).toBe(normalizeFontStack(typography.sans));
    expect(normalizeFontStack(cssToken('font-mono'))).toBe(normalizeFontStack(typography.mono));
  });

  it('ancla el anillo de foco al color de marca (accesibilidad, seccion 5)', () => {
    expect(css).toMatch(/--ring:\s*var\(--color-brand\)/);
  });

  it('respeta prefers-reduced-motion desactivando transiciones', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});

describe('espaciado y forma', () => {
  it('usa la escala de 4 px sin valores intermedios', () => {
    for (const value of Object.values(spacing)) {
      if (value === '0px') continue;
      expect(Number.parseInt(value, 10) % 4).toBe(0);
    }
  });

  it('declara los mismos radios que la spec (6/8/12/16)', () => {
    // Se cubre `full` tambien: no hacerlo dejo pasar un 999 vs 9999 entre
    // theme.css y spacing.ts hasta que se comprobo contra el bundle.
    expect(radii).toMatchObject({ sm: 6, md: 8, lg: 12, xl: 16, full: 9999 });
  });

  it('espeja los radios en theme.css sin divergir', () => {
    for (const [name, px] of Object.entries(radii)) {
      const fromCss = cssToken(`radius-${name}`);
      expect(fromCss, `--radius-${name} no existe en theme.css`).toBeDefined();
      expect(
        fromCss,
        `TS y CSS divergen en --radius-${name}: manda el CSS`,
      ).toBe(`${px}px`);
    }
  });
});
