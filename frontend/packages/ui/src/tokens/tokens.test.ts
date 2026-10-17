import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors, darkColors, roleAccents } from './colors';
import { typography } from './typography';
import { radii, space, spacing, transitions } from './spacing';

// Frontend-Design-System.md §9: "Si ambos divergen, MANDA EL CSS".
// Esa precedencia no se puede hacer cumplir en tiempo de ejecucion, pero sí
// aquí: si alguien cambia un valor en TS sin tocar theme.css, la suite falla.
const css = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8');

/** Extrae la declaración `--nombre: valor;` de todo el fichero (primera aparición). */
function cssToken(name: string): string | undefined {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

/** Extrae una declaración `--nombre: valor;` DENTRO de un bloque dado (:root o .dark). */
function cssTokenIn(block: string, name: string): string | undefined {
  const section = css.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
  if (!section) return undefined;
  const match = section[1].match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

/** Extrae el valor de --brand/--brand-strong de un scope [data-role] en un modo. */
function cssRoleToken(role: string, name: string, mode: 'light' | 'dark'): string | undefined {
  const prefix = mode === 'dark' ? `.dark [data-role='${role}']` : `[data-role='${role}']`;
  const section = css.match(new RegExp(`${prefix.replace(/[.[\]]/g, (m) => `\\${m}`)}\\s*\\{([\\s\\S]*?)\\}`));
  if (!section) return undefined;
  const match = section[1].match(new RegExp(`--${name}:\\s*([^;]+);`));
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

/** Tinte frio exigido por la doctrina anti-gris-muerto: canal azul > canal rojo. */
function assertTintedBlue(label: string, hex: string): void {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.substring(0, 2), 16);
  const g = Number.parseInt(clean.substring(2, 4), 16);
  const b = Number.parseInt(clean.substring(4, 6), 16);
  expect(b, `${label} (${hex}) debe tener tinte frio (B > R)`).toBeGreaterThan(r);
  expect(r === g && g === b, `${label} (${hex}) es un gris desaturado muerto`).toBe(false);
}

/** Par TS↔CSS por token de paleta en un bloque (:root claro / .dark oscuro). */
const paletteByToken = {
  background: 'background',
  foreground: 'foreground',
  foregroundMuted: 'foreground-muted',
  foregroundSubtle: 'foreground-subtle',
  brand: 'brand',
  brandStrong: 'brand-strong',
  warning: 'warning',
  surface: 'surface',
  surfaceMuted: 'surface-muted',
  border: 'border',
  borderSubtle: 'border-subtle',
  success: 'success',
  danger: 'danger',
  info: 'info',
} as const;

type PaletteKey = keyof typeof paletteByToken;
type Palette = Record<PaletteKey, string>;

describe('tokens de color y paridad con theme.css (dual theme §9)', () => {
  it('espeja el modo claro (:root) sin divergir en ningun valor de la paleta', () => {
    for (const [tsKey, cssName] of Object.entries(paletteByToken)) {
      const fromCss = cssTokenIn(':root', cssName);
      expect(fromCss, `--${cssName} no existe en :root de theme.css`).toBeDefined();
      expect(
        colors[tsKey as PaletteKey].toLowerCase(),
        `TS y CSS divergen en --${cssName} (claro): manda el CSS`,
      ).toBe(fromCss?.toLowerCase());
    }
  });

  it('espeja el modo oscuro (.dark) sin divergir en ningun valor de la paleta', () => {
    for (const [tsKey, cssName] of Object.entries(paletteByToken)) {
      const fromCss = cssTokenIn('.dark', cssName);
      expect(fromCss, `--${cssName} no existe en .dark de theme.css`).toBeDefined();
      expect(
        darkColors[tsKey as PaletteKey].toLowerCase(),
        `TS y CSS divergen en --${cssName} (oscuro): manda el CSS`,
      ).toBe(fromCss?.toLowerCase());
    }
  });

  it('espeja los acentos de rol [data-role] en ambos modos (§9.2)', () => {
    for (const [role, modes] of Object.entries(roleAccents)) {
      for (const mode of ['light', 'dark'] as const) {
        expect(cssRoleToken(role, 'brand', mode)).toBe(modes[mode].brand);
        expect(cssRoleToken(role, 'brand-strong', mode)).toBe(modes[mode].brandStrong);
      }
    }
    // El Comprador hereda :root / .dark: no existe scope propio.
    expect(css).not.toMatch(/\[data-role='buyer'\]/);
  });

  it('cumple exactamente con los codigos hex canonicos del SDD v2 (§9.1)', () => {
    expect(colors.background).toBe('#F5F6F8');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.surfaceMuted).toBe('#EEF0F4');
    expect(colors.border).toBe('#E1E5EB');
    expect(colors.borderSubtle).toBe('#EBEEF2');
    expect(colors.foreground).toBe('#0E1420');
    expect(colors.foregroundMuted).toBe('#454F63');
    expect(colors.foregroundSubtle).toBe('#5F6B82');
    expect(colors.brand).toBe('#0F766E');
    expect(colors.brandStrong).toBe('#0B5D56');
    expect(colors.warning).toBe('#B45309');
    expect(colors.success).toBe('#15803D');
    expect(colors.danger).toBe('#B91C1C');
    expect(colors.info).toBe('#1D4ED8');

    expect(darkColors.background).toBe('#0C0F16');
    expect(darkColors.surface).toBe('#131824');
    expect(darkColors.surfaceMuted).toBe('#1A2030');
    expect(darkColors.border).toBe('#252D40');
    expect(darkColors.borderSubtle).toBe('#1D2334');
    expect(darkColors.foreground).toBe('#EDF1F7');
    expect(darkColors.foregroundMuted).toBe('#98A2B8');
    expect(darkColors.foregroundSubtle).toBe('#7D88A3');
    expect(darkColors.brand).toBe('#2DD4BF');
    expect(darkColors.brandStrong).toBe('#5EEAD4');
    expect(darkColors.warning).toBe('#FBBF24');
    expect(darkColors.success).toBe('#4ADE80');
    expect(darkColors.danger).toBe('#F87171');
    expect(darkColors.info).toBe('#60A5FA');
  });

  it('mapea el contrato shadcn y las derivaciones en theme.css (@theme inline §9)', () => {
    expect(cssToken('color-background')).toBe('var(--background)');
    expect(cssToken('color-surface')).toBe('var(--surface)');
    expect(cssToken('color-card')).toBe('var(--card)');
    expect(cssToken('color-card-foreground')).toBe('var(--card-foreground)');
    expect(cssToken('color-primary')).toBe('var(--primary)');
    expect(cssToken('color-primary-foreground')).toBe('var(--primary-foreground)');
    expect(cssToken('color-muted')).toBe('var(--muted)');
    expect(cssToken('color-muted-foreground')).toBe('var(--muted-foreground)');
    expect(cssToken('color-ring')).toBe('var(--ring)');

    // Derivaciones del eje de acento: el foco y el primario siguen a --brand.
    expect(cssTokenIn(':root', 'primary')).toBe('var(--brand)');
    expect(cssTokenIn(':root', 'ring')).toBe('var(--brand)');
    expect(cssTokenIn(':root', 'card')).toBe('var(--surface)');
    expect(cssTokenIn(':root', 'muted')).toBe('var(--surface-muted)');
    expect(cssTokenIn(':root', 'destructive')).toBe('var(--danger)');
    expect(cssTokenIn(':root', 'primary-foreground')).toBe('#FFFFFF');
    expect(cssTokenIn('.dark', 'primary-foreground')).toBe('#0C0F16');
  });

  it('declara el esquema de color nativo de cada modo (color-scheme)', () => {
    expect(css).toMatch(/:root\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(css).toMatch(/\.dark\s*\{[\s\S]*?color-scheme:\s*dark/);
  });
});

describe('accesibilidad y contraste WCAG 2.1 (AA) en AMBOS modos (§9.4)', () => {
  const onBrandLight = '#FFFFFF';
  const onBrandDark = '#0C0F16';

  it('modo claro: jerarquia de tinta 17 / 7.6 / 4.9:1 sobre lienzo', () => {
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThan(14);
    expect(contrastRatio(colors.foreground, colors.surface)).toBeGreaterThan(13);
    expect(contrastRatio(colors.foregroundMuted, colors.background)).toBeGreaterThanOrEqual(6.2);
    expect(contrastRatio(colors.foregroundSubtle, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.foregroundSubtle, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('modo oscuro: jerarquia de tinta 16.9 / 7.5 / 5.4:1 sobre lienzo', () => {
    expect(contrastRatio(darkColors.foreground, darkColors.background)).toBeGreaterThan(14);
    expect(contrastRatio(darkColors.foreground, darkColors.surface)).toBeGreaterThan(13);
    expect(contrastRatio(darkColors.foregroundMuted, darkColors.background)).toBeGreaterThanOrEqual(6.2);
    expect(contrastRatio(darkColors.foregroundSubtle, darkColors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkColors.foregroundSubtle, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('los 5 acentos de rol cumplen AA como texto y como relleno en modo claro', () => {
    const lightAccents: Record<string, string> = {
      buyer: colors.brand,
      ...Object.fromEntries(Object.entries(roleAccents).map(([k, v]) => [k, v.light.brand])),
    };
    for (const [role, hex] of Object.entries(lightAccents)) {
      expect(contrastRatio(hex, colors.background), `acento ${role} texto/lienzo`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hex, colors.surface), `acento ${role} texto/superficie`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(onBrandLight, hex), `acento ${role} relleno/texto`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('los 5 acentos de rol cumplen AA como texto y como relleno en modo oscuro', () => {
    const darkAccents: Record<string, string> = {
      buyer: darkColors.brand,
      ...Object.fromEntries(Object.entries(roleAccents).map(([k, v]) => [k, v.dark.brand])),
    };
    for (const [role, hex] of Object.entries(darkAccents)) {
      expect(contrastRatio(hex, darkColors.background), `acento ${role} texto/lienzo`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hex, darkColors.surface), `acento ${role} texto/superficie`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(onBrandDark, hex), `acento ${role} relleno/texto`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('los estados de dominio cumplen AA como texto en ambos modos', () => {
    for (const [hex, label] of [
      [colors.success, 'success claro'],
      [colors.warning, 'warning claro'],
      [colors.danger, 'danger claro'],
      [colors.info, 'info claro'],
    ] as const) {
      expect(contrastRatio(hex, colors.background), `${label}/lienzo`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hex, colors.surface), `${label}/superficie`).toBeGreaterThanOrEqual(4.5);
    }
    for (const [hex, label] of [
      [darkColors.success, 'success oscuro'],
      [darkColors.warning, 'warning oscuro'],
      [darkColors.danger, 'danger oscuro'],
      [darkColors.info, 'info oscuro'],
    ] as const) {
      expect(contrastRatio(hex, darkColors.background), `${label}/lienzo`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hex, darkColors.surface), `${label}/superficie`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('doctrina visual anti-IA generica v2 (AGENTS.md §4.14 y SDD §9.3)', () => {
  it('prohibe el negro puro #000000 o #000 en la paleta y en theme.css', () => {
    for (const value of [...Object.values(colors), ...Object.values(darkColors)]) {
      expect(value.toLowerCase()).not.toBe('#000000');
      expect(value.toLowerCase()).not.toBe('#000');
    }
    expect(css).not.toMatch(/--[a-z-]+:\s*#000000;/i);
    expect(css).not.toMatch(/--[a-z-]+:\s*#000;/i);
  });

  it('exige neutros tintados (B > R) en ambos modos; el unico blanco es la superficie clara', () => {
    const lightNeutrals: [string, string][] = [
      ['canvas claro', colors.background],
      ['surface-muted claro', colors.surfaceMuted],
      ['border claro', colors.border],
      ['border-subtle claro', colors.borderSubtle],
    ];
    // Exención documentada §9.3: la superficie clara es papel nítido #FFFFFF
    // (blanco puro, no gris desaturado); se exige exactamente eso.
    expect(colors.surface).toBe('#FFFFFF');

    const darkNeutrals: [string, string][] = [
      ['canvas oscuro', darkColors.background],
      ['surface oscuro', darkColors.surface],
      ['surface-muted oscuro', darkColors.surfaceMuted],
      ['border oscuro', darkColors.border],
      ['border-subtle oscuro', darkColors.borderSubtle],
    ];

    for (const [label, hex] of [...lightNeutrals, ...darkNeutrals]) {
      assertTintedBlue(label, hex);
    }
    // La tinta tambien esta matizada, nunca es negro/gris plano.
    assertTintedBlue('tinta clara', colors.foreground);
    assertTintedBlue('tinta oscura', darkColors.foreground);
  });

  it('no regresa al look v1 rechazado (cian neón sobre carbón saturado)', () => {
    expect(colors.brand).not.toBe('#00D4AA');
    expect(darkColors.background).not.toBe('#0A0E1A');
    expect(darkColors.background).not.toBe('#0A0F1D');
    // El acento del Administrador NO es el "índigo eléctrico" de §8.
    expect(roleAccents.admin.light.brand).not.toBe('#4F46E5');
    expect(roleAccents.admin.dark.brand).not.toBe('#6366F1');
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

  it('ancla el anillo de foco al acento de rol (accesibilidad, seccion 5)', () => {
    expect(css).toMatch(/--ring:\s*var\(--brand\)/);
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
