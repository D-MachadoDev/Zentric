import { describe, expect, it } from 'vitest';
import {
  colors,
  darkColors,
  roleAccents,
  neutralScale,
  brandScales,
  statusScales,
} from './colors';
import { space, spacing } from './spacing';
import { radii, radiusValues, getRadius, getRadiusCss } from './radii';
import { shadowsLight, shadowsDark } from './shadows';
import {
  breakpoints,
  breakpointValues,
  mediaQueries,
  rangeMediaQueries,
} from './breakpoints';

/**
 * Empirical Adversarial Challenge Suite: Design Tokens M2
 * Author: challenger_m2_tokens_1
 *
 * Mathematically stress-tests:
 * 1. WCAG 2.2 Relative Luminance & Contrast ratios against claimed metrics
 * 2. Spacing mathematical function space(step) across boundaries
 * 3. Anti-AI doctrine rules (B > R cold tint, #000000 prohibition, banned hex colors)
 * 4. CSS validity and unit syntax across radii, shadows, and breakpoints
 */

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '').trim();
  return {
    r: Number.parseInt(clean.substring(0, 2), 16),
    g: Number.parseInt(clean.substring(2, 4), 16),
    b: Number.parseInt(clean.substring(4, 6), 16),
  };
}

function wcagRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (val: number) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function wcagContrastRatio(hex1: string, hex2: string): number {
  const l1 = wcagRelativeLuminance(hex1);
  const l2 = wcagRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Empirical Adversarial Challenge Suite: Design Tokens M2', () => {
  describe('Challenge 1: WCAG 2.2 AA / AAA Mathematical Contrast Validation', () => {
    it('1.1 Light Mode documentation contrast table values match empirical calculations', () => {
      // Primary text on canvas
      const ratioCanvas = wcagContrastRatio(colors.foreground, colors.background);
      expect(Math.round(ratioCanvas * 100) / 100).toBe(17.04);
      expect(ratioCanvas).toBeGreaterThanOrEqual(7.0); // AAA

      // Primary text on card surface
      const ratioCard = wcagContrastRatio(colors.foreground, colors.surface);
      expect(Math.round(ratioCard * 100) / 100).toBe(18.43);
      expect(ratioCard).toBeGreaterThanOrEqual(7.0); // AAA

      // Muted text on canvas
      const ratioMuted = wcagContrastRatio(colors.foregroundMuted, colors.background);
      expect(Math.round(ratioMuted * 100) / 100).toBe(7.61);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5); // AA

      // Subtle text on canvas
      const ratioSubtle = wcagContrastRatio(colors.foregroundSubtle, colors.background);
      expect(Math.round(ratioSubtle * 100) / 100).toBe(4.96);
      expect(ratioSubtle).toBeGreaterThanOrEqual(4.5); // AA

      // Subtle text on card
      const ratioSubtleCard = wcagContrastRatio(colors.foregroundSubtle, colors.surface);
      expect(Math.round(ratioSubtleCard * 100) / 100).toBe(5.37);
      expect(ratioSubtleCard).toBeGreaterThanOrEqual(4.5); // AA
    });

    it('1.2 Dark Mode documentation contrast table values match empirical calculations', () => {
      // Dark primary text on canvas
      const ratioCanvas = wcagContrastRatio(darkColors.foreground, darkColors.background);
      expect(Math.round(ratioCanvas * 100) / 100).toBe(16.91);
      expect(ratioCanvas).toBeGreaterThanOrEqual(7.0); // AAA

      // Dark primary text on card surface
      const ratioCard = wcagContrastRatio(darkColors.foreground, darkColors.surface);
      expect(Math.round(ratioCard * 100) / 100).toBe(15.65);
      expect(ratioCard).toBeGreaterThanOrEqual(7.0); // AAA

      // Dark muted text on canvas
      const ratioMuted = wcagContrastRatio(darkColors.foregroundMuted, darkColors.background);
      expect(Math.round(ratioMuted * 100) / 100).toBe(7.48);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5); // AA

      // Dark subtle text on canvas
      const ratioSubtle = wcagContrastRatio(darkColors.foregroundSubtle, darkColors.background);
      expect(Math.round(ratioSubtle * 100) / 100).toBe(5.41);
      expect(ratioSubtle).toBeGreaterThanOrEqual(4.5); // AA

      // Dark subtle text on card
      const ratioSubtleCard = wcagContrastRatio(darkColors.foregroundSubtle, darkColors.surface);
      expect(Math.round(ratioSubtleCard * 100) / 100).toBe(5.00);
      expect(ratioSubtleCard).toBeGreaterThanOrEqual(4.5); // AA
    });

    it('1.3 Role accents pass WCAG 2.2 AA (>= 4.5:1) as text and filled button backgrounds', () => {
      const lightAccents = [
        { role: 'buyer', brand: colors.brand },
        { role: 'seller', brand: roleAccents.seller.light.brand },
        { role: 'admin', brand: roleAccents.admin.light.brand },
        { role: 'logistics', brand: roleAccents.logistics.light.brand },
        { role: 'supervisor', brand: roleAccents.supervisor.light.brand },
      ];

      for (const { role, brand } of lightAccents) {
        expect(wcagContrastRatio(brand, colors.background), `Light ${role} on canvas`).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrastRatio(brand, colors.surface), `Light ${role} on card`).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrastRatio('#FFFFFF', brand), `White text on light ${role} fill`).toBeGreaterThanOrEqual(4.5);
      }

      const darkAccents = [
        { role: 'buyer', brand: darkColors.brand },
        { role: 'seller', brand: roleAccents.seller.dark.brand },
        { role: 'admin', brand: roleAccents.admin.dark.brand },
        { role: 'logistics', brand: roleAccents.logistics.dark.brand },
        { role: 'supervisor', brand: roleAccents.supervisor.dark.brand },
      ];

      for (const { role, brand } of darkAccents) {
        expect(wcagContrastRatio(brand, darkColors.background), `Dark ${role} on canvas`).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrastRatio(brand, darkColors.surface), `Dark ${role} on card`).toBeGreaterThanOrEqual(4.5);
        expect(wcagContrastRatio('#0C0F16', brand), `Ink text on dark ${role} fill`).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe('Challenge 2: Spacing Function space(step) Stress Testing', () => {
    it('2.1 space(step) handles standard integer and half-steps deterministically', () => {
      expect(space(0)).toBe(0);
      expect(space(0.5)).toBe(2);
      expect(space(1)).toBe(4);
      expect(space(1.5)).toBe(6);
      expect(space(2)).toBe(8);
      expect(space(2.5)).toBe(10);
      expect(space(3)).toBe(12);
      expect(space(3.5)).toBe(14);
      expect(space(4)).toBe(16);
      expect(space(24)).toBe(96);
    });

    it('2.2 space(step) returns raw number and matches spacing dictionary formatted px strings', () => {
      for (const [key, val] of Object.entries(spacing)) {
        const stepNum = Number(key);
        expect(typeof space(stepNum)).toBe('number');
        expect(`${space(stepNum)}px`).toBe(val);
      }
    });

    it('2.3 space(step) handles negative and fractional edge cases mathematically', () => {
      expect(space(-1)).toBe(-4);
      expect(space(-0.5)).toBe(-2);
      expect(space(-2.5)).toBe(-10);
      expect(space(0.25)).toBe(1);
      expect(space(1000)).toBe(4000);
      expect(space(-1000)).toBe(-4000);
      expect(Number.isNaN(space(Number.NaN))).toBe(true);
    });
  });

  describe('Challenge 3: Anti-AI Rules & Banned Colors Validation', () => {
    it('3.1 All neutral scale values and palette neutrals strictly adhere to B > R (cold tint)', () => {
      const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
      for (const step of steps) {
        const { r, b } = hexToRgb(neutralScale[step]);
        expect(b, `neutralScale[${step}] (${neutralScale[step]}) must have B > R`).toBeGreaterThan(r);
      }

      const lightNeutrals = [
        colors.background,
        colors.surfaceMuted,
        colors.border,
        colors.borderSubtle,
        colors.foreground,
        colors.foregroundMuted,
        colors.foregroundSubtle,
      ];
      for (const hex of lightNeutrals) {
        const { r, b } = hexToRgb(hex);
        expect(b, `Light neutral ${hex} must have B > R`).toBeGreaterThan(r);
      }

      // Exemption: Light surface is crisp white #FFFFFF
      expect(colors.surface).toBe('#FFFFFF');

      const darkNeutrals = [
        darkColors.background,
        darkColors.surface,
        darkColors.surfaceMuted,
        darkColors.border,
        darkColors.borderSubtle,
        darkColors.foreground,
        darkColors.foregroundMuted,
        darkColors.foregroundSubtle,
      ];
      for (const hex of darkNeutrals) {
        const { r, b } = hexToRgb(hex);
        expect(b, `Dark neutral ${hex} must have B > R`).toBeGreaterThan(r);
      }
    });

    it('3.2 Pure black #000000 is strictly prohibited across all color tokens (§9.1 Anti-AI Doctrine)', () => {
      const allTokens = [
        ...Object.values(colors),
        ...Object.values(darkColors),
        ...Object.values(neutralScale),
      ];
      for (const hex of allTokens) {
        expect(hex.toLowerCase()).not.toBe('#000000');
        expect(hex.toLowerCase()).not.toBe('#000');
      }
    });

    it('3.3 Banned colors (#00D4AA, #6366F1, #4F46E5) must NOT exist anywhere in colors.ts', () => {
      const allHexValues: string[] = [];
      function collectHexes(obj: unknown) {
        if (!obj || typeof obj !== 'object') return;
        for (const val of Object.values(obj)) {
          if (typeof val === 'string' && val.startsWith('#')) {
            allHexValues.push(val.toUpperCase());
          } else if (typeof val === 'object') {
            collectHexes(val);
          }
        }
      }
      collectHexes({ colors, darkColors, roleAccents, neutralScale, brandScales, statusScales });

      // Neon cyan v1 look
      expect(allHexValues).not.toContain('#00D4AA');

      // Electric indigo 500 & 600 (rejected in section 8 / theme.css line 132)
      // THIS IS AN ADVERSARIAL CHALLENGE ASSERTION:
      // Worker included #6366F1 and #4F46E5 in brandScales.admin!
      expect(allHexValues, 'Banned color #6366F1 found in colors.ts!').not.toContain('#6366F1');
      expect(allHexValues, 'Banned color #4F46E5 found in colors.ts!').not.toContain('#4F46E5');
    });
  });

  describe('Challenge 4: Edge Cases in radii.ts, shadows.ts, and breakpoints.ts', () => {
    it('4.1 Radii tokens have exact pixel matches and standard CSS length syntax', () => {
      const keys = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'] as const;
      for (const k of keys) {
        expect(radiusValues[k]).toBe(`${radii[k]}px`);
        expect(getRadius(k)).toBe(radii[k]);
        expect(getRadiusCss(k)).toBe(`${radii[k]}px`);
        expect(/^\d+px$/.test(radiusValues[k])).toBe(true);
      }
    });

    it('4.2 Shadows have valid CSS box-shadow syntax and light shadows use cold ink', () => {
      const shadowKeys = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'inner', 'surfaceHairline'] as const;
      for (const k of shadowKeys) {
        expect(shadowsLight[k]).toBeDefined();
        expect(shadowsDark[k]).toBeDefined();

        if (k !== 'none') {
          // Must not use dead black rgba(0, 0, 0, ...) in light mode
          expect(shadowsLight[k]).not.toContain('rgba(0, 0, 0,');
          expect(shadowsLight[k]).toContain('rgba(14, 20, 32,');
        }
      }
    });

    it('4.3 Breakpoints match standard devices and media queries are formatted correctly', () => {
      expect(breakpoints.sm).toBe(640);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
      expect(breakpoints['2xl']).toBe(1536);

      for (const [k, v] of Object.entries(breakpointValues)) {
        expect(v).toBe(`${breakpoints[k as keyof typeof breakpoints]}px`);
        expect(mediaQueries[k as keyof typeof mediaQueries]).toBe(`(min-width: ${v})`);
      }

      expect(rangeMediaQueries.mobileOnly).toBe('(max-width: 639px)');
      expect(rangeMediaQueries.tabletOnly).toBe('(min-width: 768px) and (max-width: 1023px)');
      expect(rangeMediaQueries.desktopUp).toBe('(min-width: 1024px)');
    });
  });
});
