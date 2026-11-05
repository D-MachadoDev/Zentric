import { describe, it, expect } from 'vitest';

// 1. Direct imports from the tokens module entry point
import * as TokensNamespace from './index';

import {
  // Colors
  colors,
  darkColors,
  roleAccents,
  neutralScale,
  brandScales,
  statusScales,
  type ColorToken,
  type DarkColorToken,
  type RoleAccent,
  type ColorScaleStep,
  type SemanticStatus,

  // Typography
  typography,
  typeScale,
  typographySpecs,
  fontWeights,
  lineHeights,
  letterSpacing,
  dataFontFamily,
  type TypeScaleToken,

  // Spacing & Density
  space,
  spacing,
  density,
  rowHeight,
  rowHeightCompact,
  durations,
  transitions,
  type SpacingToken,

  // Radii
  radii,
  radiusValues,
  getRadius,
  getRadiusCss,
  type RadiusToken,

  // Shadows
  shadows,
  shadowsLight,
  shadowsDark,
  type ShadowToken,

  // Breakpoints
  tokenBreakpoints,
  screenBreakpoints,
  breakpointValues,
  mediaQueries,
  rangeMediaQueries,
  type BreakpointToken,
} from './index';

// 2. Re-exported imports from the root package entry point
import {
  colors as rootColors,
  typography as rootTypography,
  spacing as rootSpacing,
  radii as rootRadii,
  shadows as rootShadows,
  density as rootDensity,
  mediaQueries as rootMediaQueries,
  radiusValues as rootRadiusValues,
  tokenBreakpoints as rootTokenBreakpoints,
  screenBreakpoints as rootScreenBreakpoints,
  breakpointValues as rootBreakpointValues,
  rangeMediaQueries as rootRangeMediaQueries,
  // Note: root exports 'breakpoints' from hooks/useMediaQuery
  breakpoints as rootBreakpoints,
} from '../index';

describe('Adversarial Verification: Consumer Imports & Module Resolution', () => {
  describe('1. Completeness of Exports from tokens/index.ts', () => {
    it('exports all color objects and scales without undefined values', () => {
      expect(colors).toBeDefined();
      expect(darkColors).toBeDefined();
      expect(roleAccents).toBeDefined();
      expect(neutralScale).toBeDefined();
      expect(brandScales).toBeDefined();
      expect(statusScales).toBeDefined();

      expect(Object.keys(colors).length).toBe(14);
      expect(Object.keys(darkColors).length).toBe(14);
      // roleAccents contains 4 non-default roles: seller, admin, logistics, supervisor
      expect(Object.keys(roleAccents).length).toBe(4);
      expect(Object.keys(neutralScale).length).toBe(11);
      // brandScales contains 5 role scales: buyer, seller, admin, logistics, supervisor
      expect(Object.keys(brandScales).length).toBe(5);
      expect(Object.keys(statusScales).length).toBe(4);
    });

    it('exports all typography definitions and type scale specs', () => {
      expect(typography).toBeDefined();
      expect(typeScale).toBeDefined();
      expect(typographySpecs).toBeDefined();
      expect(fontWeights).toBeDefined();
      expect(lineHeights).toBeDefined();
      expect(letterSpacing).toBeDefined();
      expect(dataFontFamily).toBeDefined();

      expect(typeScale['2xs']).toEqual(['0.625rem', '1.4']);
      expect(typeScale.caption).toEqual(['0.6875rem', '1.45']);
      expect(typographySpecs['2xs'].letterSpacing).toBe('0.01em');
      expect(typographySpecs.caption.letterSpacing).toBe('0.005em');
    });

    it('exports spacing grid, half-steps, density, and animation motion', () => {
      expect(space).toBeTypeOf('function');
      expect(space(0.5)).toBe(2);
      expect(space(1.5)).toBe(6);
      expect(space(2.5)).toBe(10);
      expect(space(3.5)).toBe(14);

      expect(spacing).toBeDefined();
      expect(spacing[0.5]).toBe('2px');
      expect(spacing[1.5]).toBe('6px');
      expect(spacing[2.5]).toBe('10px');
      expect(spacing[3.5]).toBe('14px');

      expect(density).toBeDefined();
      expect(rowHeight).toBe(40);
      expect(rowHeightCompact).toBe(32);
      expect(durations).toBeDefined();
      expect(transitions).toBeDefined();

      expect(density.comfortable.tableRowHeight).toBe(40);
      expect(density.compact.tableRowHeight).toBe(32);
    });

    it('exports radii tokens and helper functions', () => {
      expect(radii).toBeDefined();
      expect(radiusValues).toBeDefined();
      expect(getRadius).toBeTypeOf('function');
      expect(getRadiusCss).toBeTypeOf('function');

      expect(radii.none).toBe(0);
      expect(radii.xs).toBe(4);
      expect(radii.full).toBe(9999);
      expect(radiusValues.xs).toBe('4px');
      expect(getRadius('xs')).toBe(4);
      expect(getRadiusCss('xs')).toBe('4px');
    });

    it('exports shadows for light, dark, and elevation helpers', () => {
      expect(shadows).toBeDefined();
      expect(shadowsLight).toBeDefined();
      expect(shadowsDark).toBeDefined();

      expect(shadows.xs).toBeDefined();
      expect(shadows.surfaceHairline).toBeDefined();
      expect(shadowsDark.surfaceHairline).toContain('inset 0 1px 0 rgba(255, 255, 255, 0.04)');
    });

    it('exports responsive breakpoints and media queries', () => {
      expect(tokenBreakpoints).toBeDefined();
      expect(screenBreakpoints).toBeDefined();
      expect(breakpointValues).toBeDefined();
      expect(mediaQueries).toBeDefined();
      expect(rangeMediaQueries).toBeDefined();

      expect(tokenBreakpoints.sm).toBe(640);
      expect(tokenBreakpoints.md).toBe(768);
      expect(tokenBreakpoints.lg).toBe(1024);
      expect(tokenBreakpoints.xl).toBe(1280);
      expect(tokenBreakpoints['2xl']).toBe(1536);

      expect(mediaQueries.md).toBe('(min-width: 768px)');
      expect(rangeMediaQueries.tabletOnly).toBe('(min-width: 768px) and (max-width: 1023px)');
    });
  });

  describe('2. Root Package Re-export Parity (@zentric/ui vs @zentric/ui/tokens)', () => {
    it('mirrors token objects identically between root and tokens submodule', () => {
      expect(rootColors).toBe(colors);
      expect(rootTypography).toBe(typography);
      expect(rootSpacing).toBe(spacing);
      expect(rootRadii).toBe(radii);
      expect(rootShadows).toBe(shadows);
      expect(rootDensity).toBe(density);
      expect(rootRadiusValues).toBe(radiusValues);
      expect(rootMediaQueries).toBe(mediaQueries);
      expect(rootTokenBreakpoints).toBe(tokenBreakpoints);
      expect(rootScreenBreakpoints).toBe(screenBreakpoints);
      expect(rootBreakpointValues).toBe(breakpointValues);
      expect(rootRangeMediaQueries).toBe(rangeMediaQueries);
    });

    it('differentiates rootBreakpoints (legacy hook) from tokenBreakpoints (design tokens)', () => {
      // Legacy hook breakpoint object in packages/ui/src/hooks/useMediaQuery.ts
      expect(rootBreakpoints).toHaveProperty('sidebar', '(min-width: 901px)');
      expect(rootBreakpoints).toHaveProperty('compact', '(max-width: 900px)');
      expect(rootBreakpoints).toHaveProperty('stacked', '(max-width: 560px)');

      // Token breakpoints in packages/ui/src/tokens/breakpoints.ts
      expect(rootTokenBreakpoints).toHaveProperty('sm', 640);
      expect(rootTokenBreakpoints).toHaveProperty('md', 768);
      expect(rootTokenBreakpoints).toHaveProperty('lg', 1024);
    });
  });

  describe('3. Circular References & Object Integrity', () => {
    it('contains no circular references in tokens namespace', () => {
      expect(() => JSON.stringify(TokensNamespace)).not.toThrow();
    });

    it('all token properties are non-empty and well-typed', () => {
      for (const [_key, val] of Object.entries(colors)) {
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      }
      for (const [_key, val] of Object.entries(radii)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
      }
      for (const [_key, val] of Object.entries(tokenBreakpoints)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThan(0);
      }
    });
  });

  describe('4. Type Level Invariant Verification', () => {
    it('verifies TypeScript types can be assigned without compile errors', () => {
      const c: ColorToken = 'brand';
      const dc: DarkColorToken = 'brandStrong';
      const r: RoleAccent = 'seller';
      const step: ColorScaleStep = 500;
      const status: SemanticStatus = 'success';
      const ts: TypeScaleToken = '2xs';
      const sp: SpacingToken = '1.5';
      const rad: RadiusToken = 'xs';
      const sh: ShadowToken = 'surfaceHairline';
      const bp: BreakpointToken = 'md';

      expect(c).toBe('brand');
      expect(dc).toBe('brandStrong');
      expect(r).toBe('seller');
      expect(step).toBe(500);
      expect(status).toBe('success');
      expect(ts).toBe('2xs');
      expect(sp).toBe('1.5');
      expect(rad).toBe('xs');
      expect(sh).toBe('surfaceHairline');
      expect(bp).toBe('md');
    });
  });
});
