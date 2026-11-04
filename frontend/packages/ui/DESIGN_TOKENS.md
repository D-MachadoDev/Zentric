# Zentric Design System Tokens & Visual Direction Architecture

**Package:** `@zentric/ui`  
**Milestone:** Milestone 2 (Phase 2: Design System & Tokens)  
**Date:** 2026-11-04  
**Status:** CANONICAL SPECIFICATION & IMPLEMENTATION GUIDE  

---

## Executive Summary

The Zentric Design System establishes a token-driven, multi-tenant UI architecture supporting both consumer e-commerce (`Buyer`) and operational backoffice workflows (`Seller`, `Admin`, `Logistics`, `Supervisor`).

This document presents the visual direction evaluation mandated by Phase 2 (R2), comparing **Option A (Modern Enterprise Slate / Balanced Density)** and **Option B (High-Precision FinTech / Compact Data-Dense)**, detailing the mathematical contrast validations under **WCAG 2.2 AA**, explaining the strategic rationale for the chosen direction, and defining the complete token contracts for Colors, Typography, Spacing, Radii, Shadows, and Breakpoints.

---

## 1. Visual Direction Evaluation

To address the visual inventory anomalies diagnosed during Phase 1 (55 hex codes, 18 raw Tailwind color bypasses, 79 files with micro-typography fragmentation, 16 half-step spacing utilities, and 13 border radius variants), two distinct visual directions were modeled and evaluated.

### 1.1 Option A: Modern Enterprise Slate / Balanced Density ("Porcelana y Grafito Evolucionado")

- **Philosophy:** Calm, mature, high-trust enterprise marketplace aesthetic. Balances commercial retail warmth for buyers with operational gravitas for merchant and administrative workflows (modeled after industry leaders like Stripe Dashboard, GitHub, and Shopify).
- **Color Architecture:** 
  - *Light Mode ("Estudio Porcelana"):* Porcelain canvas (`#F5F6F8`) with subtle cool-tinted blue undertone ($B > R$), crisp white paper cards (`#FFFFFF`), ink-toned high-contrast typography (`#0E1420`, 17.04:1 contrast).
  - *Dark Mode ("Bóveda Grafito"):* Deep graphite-ink canvas (`#0C0F16`, avoiding lifeless flat black `#000000`), elevated container surfaces (`#131824`), and luminous cold bone text (`#EDF1F7`, 16.91:1 contrast).
- **Typography:** Geist Sans Variable for all UI text and numerical values (enforcing `font-variant-numeric: tabular-nums` for tabular alignment); Geist Mono Variable strictly reserved for technical hashes, UUIDs, SKUs, and logs.
- **Spacing & Rhythm:** Balanced 4px base grid (`step * 4px`) augmented by intentional half-step tokens (`0.5` [2px], `1.5` [6px], `2.5` [10px], `3.5` [14px]). Standard 40px table row height, 40px standard buttons and inputs, generous 20px–24px card padding.
- **Radii & Elevation:** Smooth, human-centric curves (`rounded-md` 8px for controls, `rounded-lg` 12px for cards, `rounded-xl` 16px for dialogs). Layered ambient shadows in light mode; dual-mode `.surface-hairline` (1px specular border + dark ambient shadow) in dark mode.

### 1.2 Option B: High-Precision FinTech / Compact Data-Dense ("Zinc & Carbón de Precisión")

- **Philosophy:** High-throughput financial/telemetry terminal aesthetic tailored for continuous backoffice triage (modeled after Bloomberg Terminal, Linear Compact Mode, and Flexport).
- **Color Architecture:** Stark neutral zinc and carbon monochrome palette (`#FAFAFA` light canvas / `#09090B` dark canvas), near-pure black text (`#09090B`, 19.06:1), high-intensity tactical role accents.
- **Typography:** Heavy monospace integration (financial amounts, stock counts, dates rendered in Geist Mono); all-small-caps status indicators (`[font-variant-caps:all-small-caps]`); ultra-tight line heights (`1.2`–`1.35`).
- **Spacing & Rhythm:** Aggressive data density. 32px table row height (+50% visible rows per 1080p viewport), 32px–36px compact button and input controls, tight 14px–16px card padding.
- **Radii & Elevation:** Sharp, technical, geometric corners (`rounded-xs` 2px, `rounded-sm` 4px, `rounded-md` 6px). Flat, border-dominant surfaces with box-shadows virtually eliminated.

---

## 2. Multi-Dimensional Comparison & Mathematical WCAG 2.2 AA Contrast

| Evaluation Axis | Option A: Modern Enterprise Slate | Option B: High-Precision FinTech | Strategic Tradeoff |
|---|---|---|---|
| **WCAG 2.2 Contrast** | • Primary Text: 17.04:1 (L) / 16.91:1 (D)<br>• Muted Text: 7.61:1 (L) / 7.48:1 (D)<br>• Subtle Text: 4.96:1 (L) / 5.41:1 (D)<br>• 100% Native AAA/AA Pass | • Primary Text: 19.06:1 (L) / 19.06:1 (D)<br>• Muted Text: 10.01:1 (L) / 7.76:1 (D)<br>• Subtle Text: 7.41:1 (L) / 5.25:1 (D, tuned)<br>• Standard zinc-500 fails AA (4.12:1) | **Option A** guarantees native AA compliance without artificial tint corrections and prevents optical fatigue over 8-hour operator shifts. |
| **Typographic Ergonomics** | Geist Sans with tabular figures for numbers; Geist Mono for technical hashes | Geist Mono for all numbers, SKUs, and dates; small-caps badges | **Option A** offers superior readability for consumer catalog descriptions and mixed content while preserving tabular column alignment. |
| **Spacing & Density** | Standard 40px table row, 40px button/input, comfortable touch targets | 32px table row (+50% data density), 34px input, compact touch targets | **Option B** excels at high-speed data scanning; **Option A** complies with WCAG 2.5.8 touch target standards with zero misclicks. |
| **Brand Alignment** | Unifies B2C Buyer and B2B Backoffice seamlessly; preserves "Porcelana y Grafito" | Superb for Logistics/Supervisor; **alienating and cold for consumer retail buyers** | **Option A** matches Zentric's identity as a multi-tenant marketplace platform. |

### 2.1 Contrast Ratio Verification Table

```
WCAG 2.2 AA Thresholds:
- Normal Text (< 18pt / 24px):       Minimum 4.50 : 1
- Large Text (≥ 18pt bold / 24px):   Minimum 3.00 : 1
- Non-Text UI (Borders, Focus Rings): Minimum 3.00 : 1
```

| Mode | Token Pair | FG Color | BG Color | Measured Ratio | WCAG 2.2 Status |
|---|---|---|---|---|---|
| Light | Text Primary on Canvas | `#0E1420` | `#F5F6F8` | **17.04 : 1** | PASS (AAA) |
| Light | Text Primary on Card | `#0E1420` | `#FFFFFF` | **18.43 : 1** | PASS (AAA) |
| Light | Text Muted on Canvas | `#454F63` | `#F5F6F8` | **7.61 : 1** | PASS (AAA) |
| Light | Text Subtle on Canvas | `#5F6B82` | `#F5F6F8` | **4.96 : 1** | PASS (AA) |
| Light | Text Subtle on Card | `#5F6B82` | `#FFFFFF` | **5.36 : 1** | PASS (AA) |
| Dark | Text Primary on Canvas | `#EDF1F7` | `#0C0F16` | **16.91 : 1** | PASS (AAA) |
| Dark | Text Primary on Card | `#EDF1F7` | `#131824` | **15.65 : 1** | PASS (AAA) |
| Dark | Text Muted on Canvas | `#98A2B8` | `#0C0F16` | **7.48 : 1** | PASS (AAA) |
| Dark | Text Subtle on Canvas | `#7D88A3` | `#0C0F16` | **5.41 : 1** | PASS (AA) |
| Dark | Text Subtle on Card | `#7D88A3` | `#131824` | **5.01 : 1** | PASS (AA) |

---

## 3. Recommendation & Strategic Rationale

### 3.1 Definitive Recommendation
**We recommend and implement OPTION A (Modern Enterprise Slate / Balanced Density) enriched with a first-class "Density Adaptability Axis" (`density.comfortable` vs `density.compact`).**

### 3.2 Strategic Rationale
1. **Unified Multi-Tenant Identity:** Zentric is a unified marketplace. Imposing Option B's cold terminal aesthetic globally would hurt consumer conversion on public buyer routes. Option A delivers high-trust retail elegance to buyers while maintaining executive rigor for merchants and admins.
2. **Preservation of Architectural Doctrine:** Option A perfectly implements the "Porcelana y Grafito" visual doctrine specified in SDD §9, with 100% test parity in `tokens.test.ts` and zero regressions.
3. **Density Adaptability Axis:** By formalizing `density.compact` (32px table row, 34px input, 16px card padding) alongside `density.comfortable` (40px table row, 40px input, 24px card padding), backoffice portals (Logistics fulfillment queues, Supervisor audit tables) can adopt compact density where throughput matters, without bifurcating the design system.
4. **Ergonomic Eye Comfort:** The cool slate tinting ($B > R$) eliminates optical halation and glare during extended 8-hour operator shifts.

---

## 4. Complete Design Token Specifications

### 4.1 Color System (`colors.ts`)

#### Dual Semantic Palette (14 Canonical Tokens)
| Token | Light Mode Value | Dark Mode Value | Semantic Role |
|---|---|---|---|
| `background` | `#F5F6F8` | `#0C0F16` | Base canvas background |
| `foreground` | `#0E1420` | `#EDF1F7` | Primary text and headings |
| `foregroundMuted` | `#454F63` | `#98A2B8` | Secondary labels, descriptions |
| `foregroundSubtle` | `#5F6B82` | `#7D88A3` | Captions, timestamps, placeholders |
| `brand` | `#0F766E` | `#2DD4BF` | Primary brand accent (Buyer default) |
| `brandStrong` | `#0B5D56` | `#5EEAD4` | Primary button hover / active |
| `warning` | `#B45309` | `#FBBF24` | Warning alert, checkout countdown |
| `surface` | `#FFFFFF` | `#131824` | Card, dialog, popover surface |
| `surfaceMuted` | `#EEF0F4` | `#1A2030` | Table headers, secondary zones |
| `border` | `#E1E5EB` | `#252D40` | Structural 1px container border |
| `borderSubtle` | `#EBEEF2` | `#1D2334` | Hairline divider, table row separator |
| `success` | `#15803D` | `#4ADE80` | Confirmed, active, delivered status |
| `danger` | `#B91C1C` | `#F87171` | Error, cancelled, destructive status |
| `info` | `#1D4ED8` | `#60A5FA` | Informational, in-transit status |

#### Role-Scoped Accents (`[data-role]`)
| Role | Light Brand | Light BrandStrong | Dark Brand | Dark BrandStrong | Context |
|---|---|---|---|---|---|
| **Seller** | `#6D28D9` | `#5B21B6` | `#A78BFA` | `#C4B5FD` | Studio Violet (Inventory, Catalog) |
| **Admin** | `#4338CA` | `#3730A3` | `#818CF8` | `#A5B4FC` | Command Indigo (Governance) |
| **Logistics** | `#0E7490` | `#0A5C74` | `#22D3EE` | `#67E8F9` | Operational Cyan (Fulfillment) |
| **Supervisor**| `#A21CAF` | `#86198F` | `#E879F9` | `#F0ABFC` | Forensic Fuchsia (Audit, Ledger) |

#### 50–950 Scales Exported
- `neutralScale`: Complete cool-tinted Zentric Slate (`50: #F8F9FA` through `950: #0C0F16`).
- `brandScales`: Scales for `buyer`, `seller`, `admin`, `logistics`, `supervisor`.
- `statusScales`: Scales for `success`, `warning`, `danger`, `info`.

##### Command Indigo Scale (`brandScales.admin`) — Governance Role
| Step | Hex | Relative Luminance | Usage / Context |
|---|---|---|---|
| `50` | `#EEF2FF` | 0.8847 | Lightest tint, selected row background |
| `100` | `#E0E7FF` | 0.8173 | Subtle tag fill, hover badge |
| `200` | `#C7D2FE` | 0.6726 | Soft borders, light focus ring |
| `300` | `#A5B4FC` | 0.5103 | Dark mode secondary accent (`--brand-strong`) |
| `400` | `#818CF8` | 0.3020 | Dark mode primary accent (`--brand`) |
| `500` | `#5C52E5` | 0.1397 | Mid-tone interactive, non-banned Command Indigo |
| `600` | `#4B40D6` | 0.1002 | Deep interactive, non-banned Command Indigo |
| `700` | `#4338CA` | 0.0829 | Light mode primary brand accent (`--brand`) |
| `800` | `#3730A3` | 0.0557 | Light mode brand hover/active (`--brand-strong`) |
| `900` | `#312E81` | 0.0384 | Deep dark surface container, headers |
| `950` | `#1E1B4B` | 0.0197 | Darkest navy base |

---

### 4.2 Typography System (`typography.ts`)

#### Font Families
- `typography.sans`: `"'Geist Variable', system-ui, sans-serif"` (UI text, headings, tabular figures).
- `typography.mono`: `"'Geist Mono Variable', ui-monospace, monospace"` (UUIDs, SKUs, hashes).
- `dataFontFamily`: `typography.sans` (enforces tabular figures for financial numbers).

#### Type Scale (Resolving 79 Bracketed Fragmentation Files)
| Token | Font Size | Line Height | Relative LH | Tracking | Weight | Semantic Application |
|---|---|---|---|---|---|---|
| **`2xs`** | `0.625rem` (10px) | `1.4` | `0.875rem` (14px) | `+0.01em` | 500 | Micro-indicators, trend badges, sub-pills |
| **`caption`** | `0.6875rem` (11px) | `1.45` | `1rem` (16px) | `+0.005em` | 400/500 | Table column headers, timestamps, metadata |
| **`xs`** | `0.75rem` (12px) | `1.5` | `1.125rem` (18px) | `0` | 400/500 | Standard badges, secondary button text |
| **`sm`** | `0.875rem` (14px) | `1.5` | `1.3125rem` (21px) | `0` | 400/500 | Table cells, form inputs, button labels |
| **`base`** | `1.000rem` (16px) | `1.5` | `1.500rem` (24px) | `0` | 400/500 | Body copy, card descriptions, modal paragraphs |
| **`lg`** | `1.125rem` (18px) | `1.4` | `1.575rem` (25.2px) | `-0.01em` | 600 | Card section titles, lead subtitles |
| **`xl`** | `1.250rem` (20px) | `1.35` | `1.6875rem` (27px) | `-0.01em` | 600 | Modal titles, drawer titles, subheadings |
| **`2xl`** | `1.500rem` (24px) | `1.3` | `1.950rem` (31.2px) | `-0.02em` | 700 | Dialog headers, section headers |
| **`3xl`** | `1.875rem` (30px) | `1.25` | `2.344rem` (37.5px) | `-0.02em` | 700 | Page titles, primary KPI metric figures |
| **`4xl`** | `2.250rem` (36px) | `1.2` | `2.700rem` (43.2px) | `-0.03em` | 700 | Marketing hero headlines |

---

### 4.3 Spacing & Density System (`spacing.ts`)

#### 4px Base Grid with Intentional Half-Steps
| Token | Multiplier | Pixels | Application |
|---|---|---|---|
| `0` | 0 | `0px` | Reset |
| `0.5` | 0.5 | `2px` | Half-step: micro-gap, status dot offsets, pill padding |
| `1` | 1 | `4px` | Tight icon spacing, sub-item margin |
| `1.5` | 1.5 | `6px` | Half-step: button icon+label gap, compact badge padding |
| `2` | 2 | `8px` | Standard input icon gap, table cell spacing |
| `2.5` | 2.5 | `10px` | Half-step: badge horizontal padding, compact row py |
| `3` | 3 | `12px` | Form field vertical gap, small card padding |
| `3.5` | 3.5 | `14px` | Half-step: compact card padding, alert internal padding |
| `4` | 4 | `16px` | Standard component padding, dialog gap |
| `5` | 5 | `20px` | Compact card padding, modal content padding |
| `6` | 6 | `24px` | Standard card padding, grid layout gap |
| `7` | 7 | `28px` | Expanded section padding |
| `8` | 8 | `32px` | Section spacing, compact table row height |
| `9` | 9 | `36px` | Standard button height (`h-9`), toolbar height |
| `10` | 10 | `40px` | Standard table row height (`40px`), form input height |
| `11` | 11 | `44px` | Touch target height (WCAG 2.5.5 minimum 44px) |
| `12` | 12 | `48px` | Large button height, header bar height |
| `14` | 14 | `56px` | Navigation bar height, dialog top padding |
| `16` | 16 | `64px` | Top-level layout container padding |
| `18` | 18 | `72px` | Hero section padding |
| `20` | 20 | `80px` | Page footer vertical padding |
| `24` | 24 | `96px` | Marketing hero vertical spacing |

#### Density Configurations
- **`density.comfortable` (Default):**
  - Table Row Height: `40px` (`rowHeight = 40`)
  - Table Cell Padding: `10px 16px` (`py-2.5 px-4`)
  - Form Input Height: `40px` (`h-10`)
  - Button Small: `36px` (`h-9`)
  - Card Padding: `24px` (`p-6`)
- **`density.compact` (Backoffice Portals):**
  - Table Row Height: `32px` (`rowHeightCompact = 32`)
  - Table Cell Padding: `6px 12px` (`py-1.5 px-3`)
  - Form Input Height: `34px`
  - Button Small: `32px` (`h-8`)
  - Card Padding: `16px` (`p-4`)

---

### 4.4 Border Radii System (`radii.ts`)

| Token | Pixels | CSS String | Tailwind Utility | Semantic Application |
|---|---|---|---|---|
| `none` | `0` | `'0px'` | `rounded-none` | Sharp container edges, flush table outer corners |
| `xs` | `4` | `'4px'` | `rounded-xs` | Checkboxes, radio indicators, micro-badges (replaces `rounded-[4px]`) |
| `sm` | `6` | `'6px'` | `rounded-sm` | Badges, small tags, tooltips, trend indicators |
| `md` | `8` | `'8px'` | `rounded-md` | Standard form inputs, buttons, dropdown triggers |
| `lg` | `12` | `'12px'` | `rounded-lg` | Standard cards, flyout panels, alerts, popovers |
| `xl` | `16` | `'16px'` | `rounded-xl` | Large cards, modal dialogs, drawer panels, stat cards |
| `2xl` | `20` | `'20px'` | `rounded-2xl` | Hero banners, corporate auth containers |
| `3xl` | `24` | `'24px'` | `rounded-3xl` | Marketing promo containers, buyer showcase rails |
| `4xl` | `28` | `'28px'` | `rounded-4xl` | Brand showcase containers |
| `full` | `9999` | `'9999px'` | `rounded-full` | Status dots, avatars, pill badges, toggle switches |

---

### 4.5 Shadows & Elevation System (`shadows.ts`)

| Token | Level | Light CSS Value | Dark CSS Value | Common Uses |
|---|---|---|---|---|
| `none` | 0 | `none` | `none` | Flat items, active states |
| `xs` | 1 | `0 1px 2px 0 rgba(14, 20, 32, 0.05)` | `0 1px 2px 0 rgba(0, 0, 0, 0.4)` | Buttons, badges, checkbox |
| `sm` | 2 | `0 1px 3px 0 rgba(14, 20, 32, 0.08), 0 1px 2px -1px rgba(14, 20, 32, 0.06)` | `0 1px 3px 0 rgba(0, 0, 0, 0.45), 0 1px 2px -1px rgba(0, 0, 0, 0.35)` | Alerts, toolbars |
| `md` | 3 | `0 4px 6px -1px rgba(14, 20, 32, 0.08), 0 2px 4px -2px rgba(14, 20, 32, 0.05)` | `0 4px 8px -1px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)` | Standard cards, dropdown menus, StatCards |
| `lg` | 4 | `0 10px 15px -3px rgba(14, 20, 32, 0.08), 0 4px 6px -4px rgba(14, 20, 32, 0.04)` | `0 10px 20px -3px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04)` | Popover overlays, sticky action bars |
| `xl` | 5 | `0 20px 25px -5px rgba(14, 20, 32, 0.09), 0 8px 10px -6px rgba(14, 20, 32, 0.04)` | `0 20px 30px -5px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)` | Auth panels, floating panels |
| `2xl` | 6 | `0 25px 50px -12px rgba(14, 20, 32, 0.18)` | `0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)` | Modal dialogs, drawer overlays |
| `inner` | — | `inset 0 2px 4px 0 rgba(14, 20, 32, 0.05)` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)` | Inset progress tracks, pressed states |
| `surfaceHairline` | — | `0 1px 3px 0 rgba(14, 20, 32, 0.04), 0 1px 2px -1px rgba(14, 20, 32, 0.04)` | `0 1px 2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)` | Cards, tables, backoffice containers |

---

### 4.6 Responsive Breakpoints System (`breakpoints.ts`)

| Token | Min Width | Target Devices | Responsive Strategy |
|---|---|---|---|
| `sm` | `640px` | Phablets, large mobile landscape | 2-column product grid, stacked dialog action buttons |
| `md` | `768px` | Tablets portrait (iPad), netbooks | Collapsible sidebar drawer, 2-3 column grids (eradicates tablet layout jump) |
| `lg` | `1024px` | Tablets landscape, laptops (13") | Fixed operational sidebar, full multi-column data tables |
| `xl` | `1280px` | Standard desktop monitors (1080p) | 4-column catalog grids, dual detail panes |
| `2xl` | `1536px` | Large desktop displays (1440p / 4K) | Maximum content container width (max 1440px centered) |

---

## 5. Implementation Architecture & Runtime Bridge

- **Single Source of Truth:** `frontend/packages/ui/src/styles/theme.css` is the runtime authority.
- **Dynamic Variable Resolution:** Tailwind CSS v4's `@theme inline` dynamically resolves runtime custom properties (`var(--background)`, `var(--brand)`, `var(--surface)`), ensuring that theme switching (`.dark`) and multi-tenant role switching (`[data-role="seller"]`, `[data-role="logistics"]`, etc.) occur instantaneously without CSS re-compilation.
- **TypeScript Mirror:** Token TypeScript files (`colors.ts`, `typography.ts`, `spacing.ts`, `radii.ts`, `shadows.ts`, `breakpoints.ts`) provide strict types, programmatic math utilities, and contrast verification harnesses.
- **Parity Test Suite:** `tokens.test.ts` continuously verifies that every token declared in TypeScript strictly mirrors `theme.css`. If values diverge, the test suite immediately fails.
