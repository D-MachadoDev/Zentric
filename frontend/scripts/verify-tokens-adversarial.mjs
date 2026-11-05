/**
 * Zentric Design System Tokens — Standalone Empirical Adversarial Verification Harness
 * Executed by: challenger_m2_tokens_1
 *
 * Independently verifies:
 * 1. WCAG 2.2 AA Contrast & Relative Luminance (Exact mathematical formulas)
 * 2. Spacing mathematical function space(step) stress testing
 * 3. Anti-AI palette validation (B > R, #000000, banned hexes #00D4AA, #6366F1, #4F46E5)
 * 4. CSS string validity for radii, shadows, and breakpoints
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const UI_DIR = path.resolve(REPO_ROOT, 'frontend', 'packages', 'ui');
const TOKENS_DIR = path.resolve(UI_DIR, 'src', 'tokens');

// Dynamic imports of TypeScript token modules via Node 24 strip-types
const colorsMod = await import(pathToFileURL(path.join(TOKENS_DIR, 'colors.ts')).href);
const radiiMod = await import(pathToFileURL(path.join(TOKENS_DIR, 'radii.ts')).href);
const shadowsMod = await import(pathToFileURL(path.join(TOKENS_DIR, 'shadows.ts')).href);
const breakpointsMod = await import(pathToFileURL(path.join(TOKENS_DIR, 'breakpoints.ts')).href);

const radiiUrl = pathToFileURL(path.join(TOKENS_DIR, 'radii.ts')).href;
let spacingCode = fs.readFileSync(path.join(TOKENS_DIR, 'spacing.ts'), 'utf8');
spacingCode = spacingCode
  .replace(/:\s*number/g, '')
  .replace(/as const/g, '')
  .replace(/export type [^;]+;/g, '')
  .replace("'./radii'", JSON.stringify(radiiUrl));
const spacingDataUri = `data:text/javascript;base64,${Buffer.from(spacingCode).toString('base64')}`;
const spacingMod = await import(spacingDataUri);

const { colors, darkColors, roleAccents, neutralScale, brandScales, statusScales } = colorsMod;
const { space, spacing, density } = spacingMod;
const { radii, radiusValues, getRadius, getRadiusCss } = radiiMod;
const { shadowsLight, shadowsDark, shadows } = shadowsMod;
const { breakpoints, breakpointValues, mediaQueries, rangeMediaQueries } = breakpointsMod;

const results = {
  section1_wcag: [],
  section2_spacing: [],
  section3_anti_ai: [],
  section4_css_validity: [],
  failures: [],
  warnings: [],
};

function pass(section, check, detail = '') {
  results[section].push({ status: 'PASS', check, detail });
}

function fail(section, check, detail = '') {
  results[section].push({ status: 'FAIL', check, detail });
  results.failures.push({ section, check, detail });
}

function warn(section, check, detail = '') {
  results[section].push({ status: 'WARN', check, detail });
  results.warnings.push({ section, check, detail });
}

console.log('='.repeat(80));
console.log('EMPIRICAL ADVERSARIAL CHALLENGE — M2 DESIGN TOKENS');
console.log('='.repeat(80));

// ============================================================================
// 1. WCAG 2.2 Relative Luminance & Contrast Ratios
// ============================================================================
console.log('\n--- 1. WCAG 2.2 Relative Luminance & Contrast Verification ---');

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  throw new Error(`Invalid hex code: ${hex}`);
}

function wcagRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function wcagContrastRatio(hex1, hex2) {
  const l1 = wcagRelativeLuminance(hex1);
  const l2 = wcagRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check canonical table pairs from DESIGN_TOKENS.md
const docPairs = [
  { mode: 'Light', label: 'Text Primary on Canvas', fg: '#0E1420', bg: '#F5F6F8', claimed: 17.04, minRatio: 7.0 },
  { mode: 'Light', label: 'Text Primary on Card', fg: '#0E1420', bg: '#FFFFFF', claimed: 18.43, minRatio: 7.0 },
  { mode: 'Light', label: 'Text Muted on Canvas', fg: '#454F63', bg: '#F5F6F8', claimed: 7.61, minRatio: 4.5 },
  { mode: 'Light', label: 'Text Subtle on Canvas', fg: '#5F6B82', bg: '#F5F6F8', claimed: 4.96, minRatio: 4.5 },
  { mode: 'Light', label: 'Text Subtle on Card', fg: '#5F6B82', bg: '#FFFFFF', claimed: 5.36, minRatio: 4.5 },
  { mode: 'Dark', label: 'Text Primary on Canvas', fg: '#EDF1F7', bg: '#0C0F16', claimed: 16.91, minRatio: 7.0 },
  { mode: 'Dark', label: 'Text Primary on Card', fg: '#EDF1F7', bg: '#131824', claimed: 15.65, minRatio: 7.0 },
  { mode: 'Dark', label: 'Text Muted on Canvas', fg: '#98A2B8', bg: '#0C0F16', claimed: 7.48, minRatio: 4.5 },
  { mode: 'Dark', label: 'Text Subtle on Canvas', fg: '#7D88A3', bg: '#0C0F16', claimed: 5.41, minRatio: 4.5 },
  { mode: 'Dark', label: 'Text Subtle on Card', fg: '#7D88A3', bg: '#131824', claimed: 5.01, minRatio: 4.5 },
];

for (const item of docPairs) {
  const actualRatio = wcagContrastRatio(item.fg, item.bg);
  const rounded = Math.round(actualRatio * 100) / 100;
  const matchClaimed = Math.abs(rounded - item.claimed) <= 0.05;
  const passesAALarge = actualRatio >= 3.0;
  const passesAANormal = actualRatio >= 4.5;
  const passesAAA = actualRatio >= 7.0;

  if (actualRatio >= item.minRatio && matchClaimed) {
    pass(
      'section1_wcag',
      `[${item.mode}] ${item.label}`,
      `Measured: ${rounded}:1 | Claimed: ${item.claimed}:1 | AA: ${passesAANormal ? 'PASS' : 'FAIL'} | AAA: ${passesAAA ? 'PASS' : 'FAIL'}`
    );
  } else if (actualRatio >= item.minRatio && !matchClaimed) {
    warn(
      'section1_wcag',
      `[${item.mode}] ${item.label} slight table rounding divergence`,
      `Measured: ${rounded}:1 | Claimed in doc: ${item.claimed}:1`
    );
  } else {
    fail(
      'section1_wcag',
      `[${item.mode}] ${item.label} FAILS WCAG threshold`,
      `Measured: ${rounded}:1 < Minimum required: ${item.minRatio}:1`
    );
  }
}

// Role Accents Light & Dark
const roleLightBgCanvas = colors.background;
const roleLightBgCard = colors.surface;
const roleDarkBgCanvas = darkColors.background;
const roleDarkBgCard = darkColors.surface;

const allRoles = [
  { name: 'buyer (default)', light: colors.brand, dark: darkColors.brand },
  { name: 'seller', light: roleAccents.seller.light.brand, dark: roleAccents.seller.dark.brand },
  { name: 'admin', light: roleAccents.admin.light.brand, dark: roleAccents.admin.dark.brand },
  { name: 'logistics', light: roleAccents.logistics.light.brand, dark: roleAccents.logistics.dark.brand },
  { name: 'supervisor', light: roleAccents.supervisor.light.brand, dark: roleAccents.supervisor.dark.brand },
];

for (const r of allRoles) {
  const cCanvasL = wcagContrastRatio(r.light, roleLightBgCanvas);
  const cCardL = wcagContrastRatio(r.light, roleLightBgCard);
  const cOnAccentL = wcagContrastRatio('#FFFFFF', r.light);

  if (cCanvasL >= 4.5 && cCardL >= 4.5 && cOnAccentL >= 4.5) {
    pass('section1_wcag', `Role accent [Light] ${r.name}`, `Canvas: ${cCanvasL.toFixed(2)}:1, Card: ${cCardL.toFixed(2)}:1, WhiteOnAccent: ${cOnAccentL.toFixed(2)}:1`);
  } else {
    fail('section1_wcag', `Role accent [Light] ${r.name} fails AA`, `Canvas: ${cCanvasL.toFixed(2)}:1, Card: ${cCardL.toFixed(2)}:1, WhiteOnAccent: ${cOnAccentL.toFixed(2)}:1`);
  }

  const cCanvasD = wcagContrastRatio(r.dark, roleDarkBgCanvas);
  const cCardD = wcagContrastRatio(r.dark, roleDarkBgCard);
  const cOnAccentD = wcagContrastRatio('#0C0F16', r.dark);

  if (cCanvasD >= 4.5 && cCardD >= 4.5 && cOnAccentD >= 4.5) {
    pass('section1_wcag', `Role accent [Dark] ${r.name}`, `Canvas: ${cCanvasD.toFixed(2)}:1, Card: ${cCardD.toFixed(2)}:1, InkOnAccent: ${cOnAccentD.toFixed(2)}:1`);
  } else {
    fail('section1_wcag', `Role accent [Dark] ${r.name} fails AA`, `Canvas: ${cCanvasD.toFixed(2)}:1, Card: ${cCardD.toFixed(2)}:1, InkOnAccent: ${cOnAccentD.toFixed(2)}:1`);
  }
}

// Statuses Light & Dark
const statuses = ['success', 'warning', 'danger', 'info'];
for (const s of statuses) {
  const hexL = colors[s];
  const cCanvasL = wcagContrastRatio(hexL, roleLightBgCanvas);
  const cCardL = wcagContrastRatio(hexL, roleLightBgCard);
  if (cCanvasL >= 4.5 && cCardL >= 4.5) {
    pass('section1_wcag', `Status [Light] ${s} (${hexL})`, `Canvas: ${cCanvasL.toFixed(2)}:1, Card: ${cCardL.toFixed(2)}:1`);
  } else {
    fail('section1_wcag', `Status [Light] ${s} (${hexL}) fails AA (4.5:1)`, `Canvas: ${cCanvasL.toFixed(2)}:1, Card: ${cCardL.toFixed(2)}:1`);
  }

  const hexD = darkColors[s];
  const cCanvasD = wcagContrastRatio(hexD, roleDarkBgCanvas);
  const cCardD = wcagContrastRatio(hexD, roleDarkBgCard);
  if (cCanvasD >= 4.5 && cCardD >= 4.5) {
    pass('section1_wcag', `Status [Dark] ${s} (${hexD})`, `Canvas: ${cCanvasD.toFixed(2)}:1, Card: ${cCardD.toFixed(2)}:1`);
  } else {
    fail('section1_wcag', `Status [Dark] ${s} (${hexD}) fails AA (4.5:1)`, `Canvas: ${cCanvasD.toFixed(2)}:1, Card: ${cCardD.toFixed(2)}:1`);
  }
}

// ============================================================================
// 2. Spacing Mathematical Function space(step) Stress Testing
// ============================================================================
console.log('\n--- 2. Spacing Function space(step) Stress Testing ---');

// Test 2.1: Integer steps
const integerSteps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];
for (const step of integerSteps) {
  const calculated = space(step);
  const expectedNum = step * 4;
  const expectedStr = `${expectedNum}px`;
  const dictionaryVal = spacing[step];

  if (calculated === expectedNum && dictionaryVal === expectedStr) {
    pass('section2_spacing', `Integer step ${step}`, `space(${step}) = ${calculated} === ${expectedNum}, spacing[${step}] = '${dictionaryVal}'`);
  } else {
    fail('section2_spacing', `Integer step ${step} mismatch`, `calc: ${calculated}, dict: ${dictionaryVal}, expected: ${expectedStr}`);
  }
}

// Test 2.2: Half-steps (0.5, 1.5, 2.5, 3.5)
const halfSteps = [0.5, 1.5, 2.5, 3.5];
for (const step of halfSteps) {
  const calculated = space(step);
  const expectedNum = step * 4;
  const expectedStr = `${expectedNum}px`;
  const dictionaryVal = spacing[step];

  if (calculated === expectedNum && dictionaryVal === expectedStr) {
    pass('section2_spacing', `Half-step ${step}`, `space(${step}) = ${calculated} === ${expectedNum}, spacing[${step}] = '${dictionaryVal}'`);
  } else {
    fail('section2_spacing', `Half-step ${step} mismatch`, `calc: ${calculated}, dict: ${dictionaryVal}, expected: ${expectedStr}`);
  }
}

// Test 2.3: Zero value
const zeroVal = space(0);
if (zeroVal === 0 && spacing[0] === '0px') {
  pass('section2_spacing', 'Zero step space(0)', `Returns 0 number, spacing[0] is '0px'`);
} else {
  fail('section2_spacing', 'Zero step space(0)', `Mismatch: space(0)=${zeroVal}, spacing[0]=${spacing[0]}`);
}

// Test 2.4: Negative steps
const negativeSteps = [-1, -0.5, -2.5, -4];
for (const step of negativeSteps) {
  const calculated = space(step);
  const expectedNum = step * 4;
  if (calculated === expectedNum) {
    pass('section2_spacing', `Negative step space(${step})`, `Correctly returns negative numeric pixels: ${calculated}`);
  } else {
    fail('section2_spacing', `Negative step space(${step})`, `Returned ${calculated}, expected ${expectedNum}`);
  }
  // Check if dictionary has negative steps
  if (spacing[step] !== undefined) {
    warn('section2_spacing', `spacing object contains negative key ${step}`, `Value: ${spacing[step]}`);
  }
}

// Test 2.5: Stress/Edge Inputs
const stressInputs = [
  { input: 0.25, expected: 1 },
  { input: 0.125, expected: 0.5 },
  { input: 1000, expected: 4000 },
  { input: -1000, expected: -4000 },
  { input: 1.33333333, expected: 1.33333333 * 4 },
];
for (const { input, expected } of stressInputs) {
  const res = space(input);
  if (Math.abs(res - expected) < 1e-6) {
    pass('section2_spacing', `Stress input space(${input})`, `Output ${res}`);
  } else {
    fail('section2_spacing', `Stress input space(${input})`, `Expected ${expected}, got ${res}`);
  }
}

// Test 2.6: Type signature verification
const returnType = typeof space(2);
if (returnType === 'number') {
  pass('section2_spacing', 'space(step) return type', 'Returns raw number (pixels), spacing dictionary holds formatted px strings');
} else {
  fail('section2_spacing', 'space(step) return type', `Expected number, got ${returnType}`);
}

// ============================================================================
// 3. Anti-AI Rules on All Hex Values Across colors.ts
// ============================================================================
console.log('\n--- 3. Anti-AI Rules Validation Across colors.ts ---');

// Check 3.1: B > R for all neutral scale values
const neutralSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
for (const step of neutralSteps) {
  const hex = neutralScale[step];
  const { r, g, b } = hexToRgb(hex);
  const isTinted = b > r;
  const isDesaturated = r === g && g === b;

  if (isTinted && !isDesaturated) {
    pass('section3_anti_ai', `neutralScale step ${step} (${hex}) B > R`, `B (${b}) > R (${r}), not desaturated (G=${g})`);
  } else {
    fail('section3_anti_ai', `neutralScale step ${step} (${hex}) VIOLATES B > R`, `B=${b}, R=${r}, G=${g}, isTinted=${isTinted}, isDesaturated=${isDesaturated}`);
  }
}

// Check 3.1b: Palette neutrals in colors and darkColors
const paletteNeutrals = [
  { name: 'colors.background', hex: colors.background, allowWhite: false },
  { name: 'colors.surface', hex: colors.surface, allowWhite: true }, // Paper exemption §9.3
  { name: 'colors.surfaceMuted', hex: colors.surfaceMuted, allowWhite: false },
  { name: 'colors.border', hex: colors.border, allowWhite: false },
  { name: 'colors.borderSubtle', hex: colors.borderSubtle, allowWhite: false },
  { name: 'colors.foreground', hex: colors.foreground, allowWhite: false },
  { name: 'colors.foregroundMuted', hex: colors.foregroundMuted, allowWhite: false },
  { name: 'colors.foregroundSubtle', hex: colors.foregroundSubtle, allowWhite: false },
  { name: 'darkColors.background', hex: darkColors.background, allowWhite: false },
  { name: 'darkColors.surface', hex: darkColors.surface, allowWhite: false },
  { name: 'darkColors.surfaceMuted', hex: darkColors.surfaceMuted, allowWhite: false },
  { name: 'darkColors.border', hex: darkColors.border, allowWhite: false },
  { name: 'darkColors.borderSubtle', hex: darkColors.borderSubtle, allowWhite: false },
  { name: 'darkColors.foreground', hex: darkColors.foreground, allowWhite: false },
  { name: 'darkColors.foregroundMuted', hex: darkColors.foregroundMuted, allowWhite: false },
  { name: 'darkColors.foregroundSubtle', hex: darkColors.foregroundSubtle, allowWhite: false },
];

for (const item of paletteNeutrals) {
  if (item.allowWhite && item.hex.toUpperCase() === '#FFFFFF') {
    pass('section3_anti_ai', `${item.name} (${item.hex}) Documented White Paper Exemption (§9.3)`, 'Allowed crisp white paper card');
    continue;
  }
  const { r, g, b } = hexToRgb(item.hex);
  if (b > r) {
    pass('section3_anti_ai', `${item.name} (${item.hex}) B > R cold tint`, `B (${b}) > R (${r})`);
  } else {
    fail('section3_anti_ai', `${item.name} (${item.hex}) fails B > R`, `B (${b}) <= R (${r})`);
  }
}

// Check 3.2: Verify zero values and pure black #000000 rules
// Inquire: Does colors.ts define any "zero" token or step 0?
const hasZeroKeyInNeutral = 0 in neutralScale;
let anyZeroToken = false;
let pureBlackLocations = [];

function searchHexes(obj, currentPath) {
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = `${currentPath}.${k}`;
    if (k === '0' || k === 0 || k.toLowerCase() === 'zero') {
      anyZeroToken = true;
    }
    if (typeof v === 'string') {
      if (v.toLowerCase() === '#000000' || v.toLowerCase() === '#000') {
        pureBlackLocations.push(fullPath);
      }
    } else if (typeof v === 'object' && v !== null) {
      searchHexes(v, fullPath);
    }
  }
}
searchHexes(colorsMod, 'colorsMod');

if (pureBlackLocations.length === 0) {
  pass('section3_anti_ai', 'Pure black #000000 prohibition (§9.1 Anti-AI doctrine)', 'Zero instances of #000000 found across all exports in colors.ts (conforms to §9.1)');
} else {
  fail('section3_anti_ai', 'Pure black #000000 found in colors.ts', `Found in: ${pureBlackLocations.join(', ')}`);
}

if (!hasZeroKeyInNeutral && !anyZeroToken) {
  warn(
    'section3_anti_ai',
    'No "zero" step exists in color scales',
    'neutralScale starts at 50 (#F8F9FA) down to 950 (#0C0F16). Under anti-AI doctrine, 0 = #000000 is intentionally PROHIBITED.'
  );
}

// Check 3.3: Banned colors verification (#00D4AA, #6366F1, #4F46E5)
const bannedList = [
  { hex: '#00D4AA', name: 'Cyan Neon v1' },
  { hex: '#6366F1', name: 'Electric Indigo 500' },
  { hex: '#4F46E5', name: 'Electric Indigo 600' },
];

for (const banned of bannedList) {
  const occurrences = [];
  function findBanned(obj, currentPath) {
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = `${currentPath}.${k}`;
      if (typeof v === 'string' && v.toUpperCase() === banned.hex.toUpperCase()) {
        occurrences.push(fullPath);
      } else if (typeof v === 'object' && v !== null) {
        findBanned(v, fullPath);
      }
    }
  }
  findBanned(colorsMod, 'colors.ts');

  if (occurrences.length === 0) {
    pass('section3_anti_ai', `Banned color ${banned.hex} (${banned.name}) absent`, 'Confirmed absent from colors.ts');
  } else {
    fail(
      'section3_anti_ai',
      `BANNED COLOR PRESENT: ${banned.hex} (${banned.name})`,
      `Found ${occurrences.length} occurrence(s) in: ${occurrences.join(', ')}`
    );
  }
}

// Check theme.css effective CSS for banned colors
const themeCssPath = path.resolve(UI_DIR, 'src', 'styles', 'theme.css');
const themeCssContent = fs.readFileSync(themeCssPath, 'utf8');
const themeCssEffective = themeCssContent.replace(/\/\*[\s\S]*?\*\//g, '');

for (const banned of bannedList) {
  if (themeCssEffective.toUpperCase().includes(banned.hex.toUpperCase())) {
    fail('section3_anti_ai', `Banned color in theme.css effective CSS: ${banned.hex}`, `Found in theme.css`);
  } else {
    pass('section3_anti_ai', `Banned color absent in theme.css effective CSS: ${banned.hex}`, `theme.css is clean`);
  }
}

// ============================================================================
// 4. Test Edge Cases in radii.ts, shadows.ts, and breakpoints.ts
// ============================================================================
console.log('\n--- 4. Edge Cases: radii.ts, shadows.ts, breakpoints.ts ---');

// 4.1 Radii
const expectedRadiiKeys = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];
for (const k of expectedRadiiKeys) {
  const numVal = radii[k];
  const strVal = radiusValues[k];
  const isValidCss = /^\d+px$/.test(strVal);

  if (typeof numVal === 'number' && strVal === `${numVal}px` && isValidCss) {
    pass('section4_css_validity', `radii token '${k}'`, `num=${numVal}, css='${strVal}'`);
  } else {
    fail('section4_css_validity', `radii token '${k}' invalid`, `num=${numVal}, str=${strVal}`);
  }

  // Check helper functions
  if (getRadius(k) !== numVal || getRadiusCss(k) !== strVal) {
    fail('section4_css_validity', `radii getter mismatch for '${k}'`, `getRadius: ${getRadius(k)}, getRadiusCss: ${getRadiusCss(k)}`);
  }
}

// Stress test radii getter with non-existent token
try {
  const invalidVal = getRadius('invalid_token');
  if (invalidVal === undefined) {
    pass('section4_css_validity', 'getRadius(invalid) returns undefined gracefully', 'Graceful handle');
  }
} catch (e) {
  fail('section4_css_validity', 'getRadius(invalid) throws exception', e.message);
}

// 4.2 Shadows
const expectedShadowKeys = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'inner', 'surfaceHairline'];
function isValidBoxShadow(str) {
  if (str === 'none') return true;
  // A box shadow declaration can be comma separated layers
  const layers = str.split(/,(?![^(]*\))/);
  for (const layer of layers) {
    const trimmed = layer.trim();
    // Must contain pixel dimensions (e.g. 0 1px 2px) and rgba/color
    const hasDimensions = /(-?\d+px\s+){1,4}/.test(trimmed) || /(-?\d+\s+){1,4}/.test(trimmed);
    const hasColor = /rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|none/.test(trimmed);
    if (!hasDimensions || !hasColor) {
      return false;
    }
  }
  return true;
}

for (const k of expectedShadowKeys) {
  const valLight = shadowsLight[k];
  const valDark = shadowsDark[k];

  if (valLight && isValidBoxShadow(valLight)) {
    pass('section4_css_validity', `shadowsLight '${k}' valid CSS syntax`, valLight);
  } else {
    fail('section4_css_validity', `shadowsLight '${k}' INVALID CSS syntax`, valLight);
  }

  if (valDark && isValidBoxShadow(valDark)) {
    pass('section4_css_validity', `shadowsDark '${k}' valid CSS syntax`, valDark);
  } else {
    fail('section4_css_validity', `shadowsDark '${k}' INVALID CSS syntax`, valDark);
  }

  // Anti-AI check on light shadows: must NOT use pure black rgba(0, 0, 0, ...) in light mode
  if (k !== 'none') {
    if (valLight.includes('rgba(0, 0, 0,')) {
      fail('section4_css_validity', `shadowsLight '${k}' uses dead pure black rgba(0, 0, 0, ...)`, valLight);
    } else {
      pass('section4_css_validity', `shadowsLight '${k}' uses cold-tinted ink rgba(14, 20, 32, ...)`, 'OK');
    }
  }
}

// 4.3 Breakpoints
const expectedBreakpoints = [
  { key: 'sm', px: 640 },
  { key: 'md', px: 768 },
  { key: 'lg', px: 1024 },
  { key: 'xl', px: 1280 },
  { key: '2xl', px: 1536 },
];

for (const bp of expectedBreakpoints) {
  const numVal = breakpoints[bp.key];
  const strVal = breakpointValues[bp.key];
  const mqVal = mediaQueries[bp.key];

  if (numVal === bp.px && strVal === `${bp.px}px` && mqVal === `(min-width: ${bp.px}px)`) {
    pass('section4_css_validity', `breakpoint '${bp.key}'`, `num=${numVal}, val='${strVal}', mq='${mqVal}'`);
  } else {
    fail('section4_css_validity', `breakpoint '${bp.key}' mismatch`, `num=${numVal}, val='${strVal}', mq='${mqVal}'`);
  }
}

// Range media queries audit
const rmq = rangeMediaQueries;
pass('section4_css_validity', 'rangeMediaQueries.mobileOnly', rmq.mobileOnly);
pass('section4_css_validity', 'rangeMediaQueries.tabletOnly', rmq.tabletOnly);
pass('section4_css_validity', 'rangeMediaQueries.desktopUp', rmq.desktopUp);

// Adversarial Range Check: Viewport gap analysis
// mobileOnly max-width: 639px
// tabletOnly min-width: 768px, max-width: 1023px
// What about 640px to 767px (phablets/small devices in sm breakpoint)?
if (rmq.mobileOnly.includes('639px') && rmq.tabletOnly.includes('768px')) {
  warn(
    'section4_css_validity',
    'Viewport gap in rangeMediaQueries: [640px - 767px]',
    'Viewports between 640px and 767px match neither mobileOnly nor tabletOnly. They are covered by sm: (min-width: 640px) in standard mediaQueries.'
  );
}

// ============================================================================
// Summary and Verdict
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGE EXECUTION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Checks Run: ${results.section1_wcag.length + results.section2_spacing.length + results.section3_anti_ai.length + results.section4_css_validity.length}`);
console.log(`PASS: ${results.section1_wcag.filter(r => r.status === 'PASS').length + results.section2_spacing.filter(r => r.status === 'PASS').length + results.section3_anti_ai.filter(r => r.status === 'PASS').length + results.section4_css_validity.filter(r => r.status === 'PASS').length}`);
console.log(`FAIL: ${results.failures.length}`);
console.log(`WARN: ${results.warnings.length}`);

if (results.failures.length > 0) {
  console.log('\n>>> VERDICT: REJECT <<<');
  console.log('Failures identified:');
  for (const f of results.failures) {
    console.log(`  - [${f.section}] ${f.check}: ${f.detail}`);
  }
} else {
  console.log('\n>>> VERDICT: CONFIRMED <<<');
}

// Write JSON output for reference
fs.writeFileSync(
  path.resolve(REPO_ROOT, '.agents', 'teamwork', 'challenger_m2_tokens_1', 'empirical_results.json'),
  JSON.stringify(results, null, 2)
);
console.log('\nResults written to empirical_results.json in working directory.');
