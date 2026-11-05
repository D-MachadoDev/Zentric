import { describe, it, expect } from 'vitest';

// Test consumer imports from @zentric/ui/tokens
import {
  colors,
  darkColors,
  roleAccents,
  neutralScale,
  brandScales,
  statusScales,
  typography,
  typeScale,
  typographySpecs,
  fontWeights,
  lineHeights,
  letterSpacing,
  dataFontFamily,
  space,
  spacing,
  density,
  rowHeight,
  rowHeightCompact,
  durations,
  transitions,
  radii,
  radiusValues,
  getRadius,
  getRadiusCss,
  shadows,
  shadowsLight,
  shadowsDark,
  tokenBreakpoints,
  screenBreakpoints,
  breakpointValues,
  mediaQueries,
  rangeMediaQueries,
  type ColorToken,
  type DarkColorToken,
  type RoleAccent,
  type ColorScaleStep,
  type ColorScale,
  type SemanticStatus,
  type TypeScaleToken,
  type SpacingToken,
  type RadiusToken,
  type ShadowToken,
  type BreakpointToken,
} from '@zentric/ui/tokens';

// Test consumer imports from @zentric/ui root
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
} from '@zentric/ui';

describe('Cross-Package Consumer Imports (@zentric/frontend -> @zentric/ui)', () => {
  it('successfully consumes tokens from @zentric/ui/tokens in frontend app', () => {
    expect(colors.brand).toBe('#0F766E');
    expect(darkColors.brand).toBe('#2DD4BF');
    expect(roleAccents.seller.light.brand).toBe('#6D28D9');
    expect(neutralScale[50]).toBe('#F8F9FA');
    expect(brandScales.buyer[500]).toBeDefined();
    expect(statusScales.success[500]).toBeDefined();

    expect(typography.sans).toContain('Geist Variable');
    expect(typeScale['2xs']).toEqual(['0.625rem', '1.4']);
    expect(typeScale.caption).toEqual(['0.6875rem', '1.45']);
    expect(typographySpecs['2xs'].letterSpacing).toBe('0.01em');
    expect(fontWeights.medium).toBe(500);
    expect(lineHeights.normal).toBe(1.5);
    expect(letterSpacing.micro).toBe('0.01em');
    expect(dataFontFamily).toBe(typography.sans);

    expect(space(1.5)).toBe(6);
    expect(spacing[1.5]).toBe('6px');
    expect(density.comfortable.tableRowHeight).toBe(40);
    expect(rowHeight).toBe(40);
    expect(rowHeightCompact).toBe(32);
    expect(durations.hover).toBe(120);
    expect(transitions.easeOutExpo).toContain('cubic-bezier');

    expect(radii.xs).toBe(4);
    expect(radiusValues.xs).toBe('4px');
    expect(getRadius('sm')).toBe(6);
    expect(getRadiusCss('sm')).toBe('6px');

    expect(shadows.xs).toBeDefined();
    expect(shadowsLight.surfaceHairline).toBeDefined();
    expect(shadowsDark.surfaceHairline).toBeDefined();

    expect(tokenBreakpoints.sm).toBe(640);
    expect(screenBreakpoints.md).toBe(768);
    expect(breakpointValues.lg).toBe('1024px');
    expect(mediaQueries.xl).toBe('(min-width: 1280px)');
    expect(rangeMediaQueries.tabletOnly).toBe('(min-width: 768px) and (max-width: 1023px)');
  });

  it('successfully consumes re-exported tokens from @zentric/ui root in frontend app', () => {
    expect(rootColors.brand).toBe('#0F766E');
    expect(rootTypography.mono).toContain('Geist Variable');
    expect(rootSpacing[2.5]).toBe('10px');
    expect(rootRadii.full).toBe(9999);
    expect(rootRadiusValues.md).toBe('8px');
    expect(rootShadows.surfaceHairline).toBeDefined();
    expect(rootDensity.compact.tableRowHeight).toBe(32);
    expect(rootMediaQueries.md).toBe('(min-width: 768px)');
    expect(rootTokenBreakpoints.lg).toBe(1024);
    expect(rootScreenBreakpoints.xl).toBe(1280);
    expect(rootBreakpointValues['2xl']).toBe('1536px');
    expect(rootRangeMediaQueries.mobileOnly).toBe('(max-width: 639px)');
  });

  it('validates TypeScript types compile without errors across package boundary', () => {
    const color: ColorToken = 'brand';
    const darkColor: DarkColorToken = 'brandStrong';
    const role: RoleAccent = 'seller';
    const step: ColorScaleStep = 500;
    const scale: ColorScale = neutralScale;
    const status: SemanticStatus = 'success';
    const typeScaleTok: TypeScaleToken = 'caption';
    const spaceTok: SpacingToken = 1.5;
    const radTok: RadiusToken = 'md';
    const shadowTok: ShadowToken = 'surfaceHairline';
    const bpTok: BreakpointToken = 'sm';

    expect(color).toBe('brand');
    expect(darkColor).toBe('brandStrong');
    expect(role).toBe('seller');
    expect(step).toBe(500);
    expect(scale[500]).toBe('#7D88A3');
    expect(status).toBe('success');
    expect(typeScaleTok).toBe('caption');
    expect(spaceTok).toBe(1.5);
    expect(radTok).toBe('md');
    expect(shadowTok).toBe('surfaceHairline');
    expect(bpTok).toBe('sm');
  });
});
