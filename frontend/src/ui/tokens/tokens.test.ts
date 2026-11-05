import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  colors,
  darkColors,
  roleAccents,
  neutralScale,
  brandScales,
  statusScales,
} from './colors';
import {
  typography,
  typeScale,
  fontWeights,
  lineHeights,
  letterSpacing,
  typographySpecs,
  dataFontFamily,
} from './typography';
import {
  space,
  spacing,
  density,
  rowHeight,
  rowHeightCompact,
  durations,
  transitions,
} from './spacing';
import { radii, radiusValues, getRadius, getRadiusCss } from './radii';
import { shadows, shadowsLight, shadowsDark } from './shadows';
import {
  breakpoints,
  breakpointValues,
  mediaQueries,
  rangeMediaQueries,
} from './breakpoints';

// Frontend-Design-System.md sección 9: "Si ambos divergen, MANDA EL CSS".
// Esa precedencia no se puede hacer cumplir en tiempo de ejecucion, pero sí
// aquí: si alguien cambia un valor en TS sin tocar theme.css, la suite falla.
const css = readFileSync(join(process.cwd(), 'src/ui/styles/theme.css'), 'utf8');

/** Extrae la declaración `--nombre: valor;` de todo el fichero (primera aparición). */
function cssToken(name: string): string | undefined {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

/** Extrae una declaración `--nombre: valor;` DENTRO de un bloque dado (:root o .dark). */
function cssTokenIn(block: string, name: string): string | undefined {
  const section = css.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
  if (!section) return undefined;
  const match = section[1]!.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

/** Extrae el valor de --brand/--brand-strong de un scope [data-role] en un modo. */
function cssRoleToken(role: string, name: string, mode: 'light' | 'dark'): string | undefined {
  const prefix = mode === 'dark' ? `.dark [data-role='${role}']` : `[data-role='${role}']`;
  const section = css.match(new RegExp(`${prefix.replace(/[.[\]]/g, (m) => `\\${m}`)}\\s*\\{([\\s\\S]*?)\\}`));
  if (!section) return undefined;
  const match = section[1]!.match(new RegExp(`--${name}:\\s*([^;]+);`));
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

describe('tokens de color y paridad con theme.css (dual theme sección 9)', () => {
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

  it('espeja los acentos de rol [data-role] en ambos modos (sección 9.2)', () => {
    for (const [role, modes] of Object.entries(roleAccents)) {
      for (const mode of ['light', 'dark'] as const) {
        expect(cssRoleToken(role, 'brand', mode)).toBe(modes[mode].brand);
        expect(cssRoleToken(role, 'brand-strong', mode)).toBe(modes[mode].brandStrong);
      }
    }
    // El Comprador hereda :root / .dark: no existe scope propio.
    expect(css).not.toMatch(/\[data-role='buyer'\]/);
  });

  it('cumple exactamente con los codigos hex canonicos del SDD v2 (sección 9.1)', () => {
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

  it('mapea el contrato shadcn y las derivaciones en theme.css (@theme inline sección 9)', () => {
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

describe('accesibilidad y contraste WCAG 2.1 (AA) en AMBOS modos (sección 9.4)', () => {
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

describe('doctrina visual anti-IA generica v2 (AGENTS.md sección 4.14 y SDD sección 9.3)', () => {
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
    // Exención documentada sección 9.3: la superficie clara es papel nítido #FFFFFF
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
    // El acento del Administrador NO es el "índigo eléctrico" de sección 8.
    expect(roleAccents.admin.light.brand).not.toBe('#4F46E5');
    expect(roleAccents.admin.dark.brand).not.toBe('#6366F1');
  });

  it('prohibe colores vetados (#00D4AA, #6366F1, #4F46E5, #000000) en TODAS las escalas exportadas', () => {
    const banned = ['#00D4AA', '#6366F1', '#4F46E5', '#000000', '#000'];
    const allHexValues: { path: string; hex: string }[] = [];

    function collectHexes(obj: unknown, currentPath: string): void {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, val] of Object.entries(obj)) {
        const itemPath = `${currentPath}.${key}`;
        if (typeof val === 'string' && val.startsWith('#')) {
          allHexValues.push({ path: itemPath, hex: val.toUpperCase() });
        } else if (typeof val === 'object') {
          collectHexes(val, itemPath);
        }
      }
    }

    collectHexes(
      { colors, darkColors, roleAccents, neutralScale, brandScales, statusScales },
      'colorsMod'
    );

    for (const bannedHex of banned) {
      const occurrences = allHexValues.filter(
        (item) => item.hex === bannedHex.toUpperCase()
      );
      expect(
        occurrences,
        `Color prohibido ${bannedHex} detectado en: ${occurrences.map((o) => o.path).join(', ')}`
      ).toHaveLength(0);
    }
  });

  it('la escala brandScales.admin utiliza el Índigo de Mando conforme a la doctrina anti-IA', () => {
    expect(brandScales.admin[500]).toBe('#5C52E5');
    expect(brandScales.admin[600]).toBe('#4B40D6');

    const adminSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (let i = 0; i < adminSteps.length - 1; i++) {
      const current = relativeLuminance(brandScales.admin[adminSteps[i]!]);
      const next = relativeLuminance(brandScales.admin[adminSteps[i + 1]!]);
      expect(current, `Luminancia paso ${adminSteps[i]} > ${adminSteps[i + 1]}`).toBeGreaterThan(next);
    }
  });

  it('define la curva de movimiento canonica --ease-out-expo en CSS y TS', () => {
    const fromCss = cssToken('ease-out-expo');
    expect(fromCss).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(transitions.easeOutExpo).toBe(fromCss);
  });

  it('declara duraciones de movimiento operativas (<= 200ms para interactividad)', () => {
    expect(durations.hover).toBe(120);
    expect(durations.dialog).toBe(200);
    expect(durations.skeletonLoop).toBe(1400);
    expect(durations.spinnerLap).toBe(700);
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
  it('usa la escala de 4 px y la funcion space(step) incluyendo medios pasos', () => {
    expect(space(0)).toBe(0);
    expect(space(0.5)).toBe(2);
    expect(space(1)).toBe(4);
    expect(space(1.5)).toBe(6);
    expect(space(2)).toBe(8);
    expect(space(2.5)).toBe(10);
    expect(space(3)).toBe(12);
    expect(space(3.5)).toBe(14);
    expect(space(4)).toBe(16);
    expect(space(6)).toBe(24);
    expect(space(8)).toBe(32);

    for (const [stepStr, value] of Object.entries(spacing)) {
      if (value === '0px') continue;
      const px = Number.parseInt(value, 10);
      expect(px % 2, `Token de espaciado ${stepStr} (${value}) debe respetar la retícula de medios pasos de 2px`).toBe(0);
      if (!stepStr.includes('.')) {
        expect(px % 4, `Paso entero ${stepStr} (${value}) debe respetar la retícula base de 4px`).toBe(0);
      }
    }
  });

  it('declara los mismos radios que la spec (none/xs/sm/md/lg/xl/2xl/3xl/4xl/full)', () => {
    expect(radii).toMatchObject({
      none: 0,
      xs: 4,
      sm: 6,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 20,
      '3xl': 24,
      '4xl': 28,
      full: 9999,
    });
    expect(getRadius('xs')).toBe(4);
    expect(getRadiusCss('xs')).toBe('4px');
    expect(radiusValues.full).toBe('9999px');
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

  it('declara presets de densidad de fila e interfaz (compact vs comfortable)', () => {
    expect(rowHeight).toBe(40);
    expect(rowHeightCompact).toBe(32);
    expect(density.comfortable.tableRowHeight).toBe(40);
    expect(density.compact.tableRowHeight).toBe(32);
    expect(density.comfortable.inputHeight).toBe(40);
    expect(density.compact.inputHeight).toBe(34);
  });
});

describe('sombras y elevaciones (shadows.ts y theme.css)', () => {
  it('exporta las sombras canónicas para modo claro y oscuro', () => {
    expect(shadowsLight.xs).toBeDefined();
    expect(shadowsLight.sm).toBeDefined();
    expect(shadowsLight.md).toBeDefined();
    expect(shadowsLight.lg).toBeDefined();
    expect(shadowsLight.xl).toBeDefined();
    expect(shadowsLight['2xl']).toBeDefined();
    expect(shadowsLight.surfaceHairline).toBeDefined();

    expect(shadowsDark.xs).toBeDefined();
    expect(shadowsDark.surfaceHairline).toBeDefined();
    expect(shadows).toBe(shadowsLight);
  });

  it('espeja los tokens de sombra estándar en theme.css', () => {
    const shadowKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'] as const;
    for (const key of shadowKeys) {
      const fromCss = cssToken(`shadow-${key}`);
      expect(fromCss, `--shadow-${key} no existe en theme.css`).toBeDefined();
      expect(fromCss).toBe(shadowsLight[key]);
    }
    expect(cssToken('shadow-surface-hairline')).toBe(shadowsLight.surfaceHairline);
  });
});

describe('rupturas responsivas (breakpoints.ts y theme.css)', () => {
  it('declara la escala canónica de 5 puntos de ruptura (sm/md/lg/xl/2xl)', () => {
    expect(breakpoints.sm).toBe(640);
    expect(breakpoints.md).toBe(768);
    expect(breakpoints.lg).toBe(1024);
    expect(breakpoints.xl).toBe(1280);
    expect(breakpoints['2xl']).toBe(1536);

    expect(breakpointValues.sm).toBe('640px');
    expect(breakpointValues.md).toBe('768px');
    expect(breakpointValues.lg).toBe('1024px');
    expect(breakpointValues.xl).toBe('1280px');
    expect(breakpointValues['2xl']).toBe('1536px');
  });

  it('declara media queries mobile-first y de rango acotado', () => {
    expect(mediaQueries.sm).toBe('(min-width: 640px)');
    expect(mediaQueries.md).toBe('(min-width: 768px)');
    expect(mediaQueries.lg).toBe('(min-width: 1024px)');
    expect(rangeMediaQueries.tabletOnly).toBe('(min-width: 768px) and (max-width: 1023px)');
    expect(rangeMediaQueries.desktopUp).toBe('(min-width: 1024px)');
  });

  it('espeja los breakpoints en theme.css', () => {
    for (const [name, pxStr] of Object.entries(breakpointValues)) {
      const fromCss = cssToken(`breakpoint-${name}`);
      expect(fromCss, `--breakpoint-${name} no existe en theme.css`).toBeDefined();
      expect(fromCss).toBe(pxStr);
    }
  });
});

describe('escala tipográfica formal y micro-tipografía (typography.ts y theme.css)', () => {
  it('incluye tokens micro-tipográficos dedicados (2xs y caption)', () => {
    expect(typeScale['2xs']).toEqual(['0.625rem', '1.4']);
    expect(typeScale.caption).toEqual(['0.6875rem', '1.45']);
    expect(typographySpecs['2xs'].fontSize).toBe('0.625rem');
    expect(typographySpecs.caption.fontSize).toBe('0.6875rem');
  });

  it('espeja 2xs y caption en theme.css', () => {
    expect(cssToken('text-2xs')).toBe('0.625rem');
    expect(cssToken('text-2xs--line-height')).toBe('0.875rem');
    expect(cssToken('text-caption')).toBe('0.6875rem');
    expect(cssToken('text-caption--line-height')).toBe('1rem');
  });

  it('provee constantes de pesos, line-heights, tracking y datos numéricos', () => {
    expect(fontWeights.regular).toBe(400);
    expect(fontWeights.medium).toBe(500);
    expect(fontWeights.semibold).toBe(600);
    expect(fontWeights.bold).toBe(700);

    expect(lineHeights.normal).toBe(1.5);
    expect(letterSpacing.micro).toBe('0.01em');
    expect(letterSpacing.caption).toBe('0.005em');

    expect(dataFontFamily).toBe(typography.sans);
  });
});

describe('escalas tonales 50-950 (colors.ts y theme.css)', () => {
  it('la escala neutra Zentric Slate tiene todos los pasos 50-950 y tinte frío (B > R)', () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (const step of steps) {
      const hex = neutralScale[step];
      expect(hex, `Paso ${step} en neutralScale`).toBeDefined();
      assertTintedBlue(`neutralScale ${step}`, hex);
    }
  });

  it('las escalas de rol tienen todos los pasos 50-950', () => {
    const roles = ['buyer', 'seller', 'admin', 'logistics', 'supervisor'] as const;
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (const role of roles) {
      for (const step of steps) {
        expect(brandScales[role][step], `brandScales.${role}.${step}`).toBeDefined();
      }
    }
  });

  it('las escalas de estado tienen todos los pasos 50-950', () => {
    const statuses = ['success', 'warning', 'danger', 'info'] as const;
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (const status of statuses) {
      for (const step of steps) {
        expect(statusScales[status][step], `statusScales.${status}.${step}`).toBeDefined();
      }
    }
  });

  it('espeja la escala neutra slate en theme.css', () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (const step of steps) {
      const fromCss = cssToken(`color-slate-${step}`);
      expect(fromCss, `--color-slate-${step} no existe en theme.css`).toBeDefined();
      expect(fromCss?.toLowerCase()).toBe(neutralScale[step].toLowerCase());
    }
  });
});

