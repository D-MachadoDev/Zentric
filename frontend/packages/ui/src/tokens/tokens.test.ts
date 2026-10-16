import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors } from './colors';
import { typography } from './typography';
import { radii, space, spacing, transitions } from './spacing';

// Frontend-Design-System.md seccion 2: "Si ambos divergen, MANDA EL CSS".
// Esa precedencia no se puede hacer cumplir en tiempo de ejecucion, pero sí
// aquí: si alguien cambia un valor en TS sin tocar theme.css, la suite falla.
const css = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8');

/** Extrae la declaracion `--nombre: valor;` del bloque @theme o :root. */
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

/** Calcula la luminancia relativa segun la formula WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.substring(0, 2), 16) / 255;
  const g = Number.parseInt(clean.substring(2, 4), 16) / 255;
  const b = Number.parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Calcula la razon de contraste entre dos colores hex segun WCAG 2.1. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const cssTokenByTsKey: Record<keyof typeof colors, string> = {
  background: 'color-background',
  foreground: 'color-foreground',
  foregroundMuted: 'color-foreground-muted',
  foregroundSubtle: 'color-foreground-subtle',
  brand: 'color-brand',
  brandStrong: 'color-brand-strong',
  warning: 'color-warning',
  surface: 'color-surface',
  surfaceMuted: 'color-surface-muted',
  border: 'color-border',
  borderSubtle: 'color-border-subtle',
  success: 'color-success',
  danger: 'color-danger',
  info: 'color-info',
};

describe('tokens de color y paridad con theme.css', () => {
  it('espeja theme.css sin divergir en ningun valor de la paleta', () => {
    for (const [tsKey, cssName] of Object.entries(cssTokenByTsKey)) {
      const fromCss = cssToken(cssName);
      expect(fromCss, `--${cssName} no existe en theme.css`).toBeDefined();
      expect(
        colors[tsKey as keyof typeof colors].toLowerCase(),
        `TS y CSS divergen en --${cssName}: manda el CSS`,
      ).toBe(fromCss?.toLowerCase());
    }
  });

  it('cumple exactamente con los codigos hex canonicos del SDD (Frontend-Design-System.md §3)', () => {
    expect(colors.background).toBe('#0A0E1A');
    expect(colors.surface).toBe('#111827');
    expect(colors.surfaceMuted).toBe('#161F30');
    expect(colors.border).toBe('#1F293D');
    expect(colors.borderSubtle).toBe('#192231');
    expect(colors.foreground).toBe('#F1F5F9');
    expect(colors.foregroundMuted).toBe('#94A3B8');
    expect(colors.foregroundSubtle).toBe('#64748B');
    expect(colors.brand).toBe('#00D4AA');
    expect(colors.brandStrong).toBe('#00B896');
    expect(colors.warning).toBe('#FFB800');
    expect(colors.success).toBe('#10B981');
    expect(colors.danger).toBe('#EF4444');
    expect(colors.info).toBe('#3B82F6');
  });

  it('mapea las variables shadcn y alias :root en theme.css', () => {
    expect(cssToken('color-card')).toBe('var(--color-surface)');
    expect(cssToken('color-card-foreground')).toBe('var(--color-foreground)');
    expect(cssToken('color-primary')).toBe('var(--color-brand)');
    expect(cssToken('color-primary-foreground')).toBe('#0A0E1A');
    expect(cssToken('color-muted')).toBe('var(--color-surface-muted)');
    expect(cssToken('color-muted-foreground')).toBe('var(--color-foreground-muted)');
  });
});

describe('accesibilidad y contraste WCAG 2.1 (AA / AAA)', () => {
  it('el texto primario (foreground) sobre lienzo base (background) supera 14:1', () => {
    const ratio = contrastRatio(colors.foreground, colors.background);
    expect(ratio).toBeGreaterThan(14);
  });

  it('el texto primario (foreground) sobre superficie primaria (surface) supera 13:1', () => {
    const ratio = contrastRatio(colors.foreground, colors.surface);
    expect(ratio).toBeGreaterThan(13);
  });

  it('el texto secundario (foregroundMuted) sobre lienzo base supera 6.2:1', () => {
    const ratio = contrastRatio(colors.foregroundMuted, colors.background);
    expect(ratio).toBeGreaterThanOrEqual(6.2);
  });

  it('el texto terciario / metadato (foregroundSubtle) sobre lienzo base supera 4.0:1', () => {
    const ratio = contrastRatio(colors.foregroundSubtle, colors.background);
    expect(ratio).toBeGreaterThanOrEqual(4.0);
  });

  it('el boton primario de accion (texto background sobre marca brand) cumple contraste AAA (> 7:1)', () => {
    const ratio = contrastRatio(colors.background, colors.brand);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('el acento primario de marca (brand) sobre lienzo base cumple contraste AAA (> 7:1)', () => {
    const ratio = contrastRatio(colors.brand, colors.background);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });
});

describe('doctrina visual anti-IA generica (AGENTS.md §4.14 y SDD §2.2)', () => {
  it('prohibe el negro puro #000000 o #000 en la paleta y en theme.css', () => {
    for (const [key, value] of Object.entries(colors)) {
      expect(value.toLowerCase(), `El token ${key} no debe ser negro puro`).not.toBe('#000000');
      expect(value.toLowerCase(), `El token ${key} no debe ser negro puro`).not.toBe('#000');
    }
    expect(css).not.toMatch(/--color-[a-z-]+:\s*#000000;/i);
    expect(css).not.toMatch(/--color-[a-z-]+:\s*#000;/i);
  });

  it('prohibe los grises neutros muertos desaturados (R == G == B) en superficies oscuras', () => {
    const darkNeutrals = [
      colors.background,
      colors.surface,
      colors.surfaceMuted,
      colors.border,
      colors.borderSubtle,
    ];

    for (const hex of darkNeutrals) {
      const clean = hex.replace('#', '');
      const r = Number.parseInt(clean.substring(0, 2), 16);
      const g = Number.parseInt(clean.substring(2, 4), 16);
      const b = Number.parseInt(clean.substring(4, 6), 16);

      // Los neutros tintados deben tener matiz azulado (canal azul estrictamente mayor que canal rojo)
      expect(b, `El color ${hex} debe tener tinte azulado (B > R)`).toBeGreaterThan(r);
      expect(
        r === g && g === b,
        `El color ${hex} es un gris desaturado muerto (R=G=B)`,
      ).toBe(false);
    }
  });

  it('cuenta con un unico acento primario semantico (brand = #00D4AA, brandStrong = #00B896)', () => {
    expect(colors.brand).toBe('#00D4AA');
    expect(colors.brandStrong).toBe('#00B896');
  });

  it('usa ambar canonico (#FFB800) para checkout 15 min y advertencias, no ambar opaco generico', () => {
    expect(colors.warning).toBe('#FFB800');
  });

  it('define la curva de movimiento canonica --ease-out-expo en CSS y TS', () => {
    const fromCss = cssToken('ease-out-expo');
    expect(fromCss).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(transitions.easeOutExpo).toBe(fromCss);
  });
});

describe('tipografia y reglas de entorno', () => {
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
  it('usa la escala de 4 px y la funcion space(step)', () => {
    expect(space(0)).toBe(0);
    expect(space(1)).toBe(4);
    expect(space(2)).toBe(8);
    expect(space(3)).toBe(12);
    expect(space(4)).toBe(16);
    expect(space(6)).toBe(24);
    expect(space(8)).toBe(32);

    for (const value of Object.values(spacing)) {
      if (value === '0px') continue;
      expect(Number.parseInt(value, 10) % 4).toBe(0);
    }
  });

  it('declara los mismos radios que la spec (6/8/12/16/9999)', () => {
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
