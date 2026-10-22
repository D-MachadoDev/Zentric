import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Envoltorio de axe-core para los E2E de Zentric.
 *
 * `@axe-core/playwright` v4 expone `AxeBuilder` (no `checkA11y`). Este helper
 * centraliza:
 *   - las reglas WCAG que aplican al proyecto (2.1 AA, el estandar de la
 *     compuerta §7.5 de `frontendSDD/Frontend-Design-System.md`),
 *   - el formato del mensaje de fallo, que debe ser legible en el reporte.
 */

/** Etiquetas WCAG que la compuerta del proyecto exige. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Impactos que bloquean el pipeline. */
const BLOCKING_IMPACTS = ['critical', 'serious'];

export interface A11yViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: Array<{ target: string[]; failureSummary?: string }>;
}

export async function analyzeAccessibility(
  page: Page,
  options: { includeImpacts?: string[]; tags?: string[] } = {},
): Promise<A11yViolation[]> {
  const { includeImpacts = BLOCKING_IMPACTS, tags = WCAG_TAGS } = options;

  const builder = new AxeBuilder({ page });
  if (tags.length > 0) builder.withTags(tags);

  const results = await builder.analyze();

  return results.violations
    .filter((violation) => {
      if (includeImpacts.length === 0) return true;
      return violation.impact !== null && includeImpacts.includes(violation.impact);
    })
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map((t) => String(t)),
        failureSummary: node.failureSummary,
      })),
    }));
}

/**
 * Falla el test si hay violaciones de accesibilidad de impacto bloqueante.
 * El mensaje lista cada regla con su ajuda y los nodos afectados, para que
 * el fallo sea accionable sin abrir el reporte HTML.
 */
export async function expectNoA11yViolations(
  page: Page,
  options: { includeImpacts?: string[]; tags?: string[] } = {},
): Promise<void> {
  const violations = await analyzeAccessibility(page, options);

  if (violations.length === 0) {
    expect(violations).toEqual([]);
    return;
  }

  const report = violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 4)
        .map((n) => `      - ${n.target.join(' ')}`)
        .join('\n');
      return `  [${v.impact}] ${v.id}: ${v.help}\n      ${v.helpUrl}\n${nodes}`;
    })
    .join('\n');

  throw new Error(
    `Se detectaron ${violations.length} violaciones de accesibilidad WCAG:\n${report}\n\n` +
      `Ayuda: ${violations[0]?.helpUrl ?? 'https://dequeuniversity.com/rules/axe/patterns/'}`,
  );
}
