import type { Meta, StoryObj } from '@storybook/react';
import { colors, darkColors, roleAccents } from './colors';

/**
 * Hoja de muestras de la paleta dual normativa (Frontend-Design-System 9.1)
 * y de la matriz de identidad por rol (9.2).
 *
 * `packages/ui/src/styles/theme.css` es la FUENTE UNICA de verdad: cada
 * muestra se pinta con la variable de runtime (`var(--background)`) para
 * demostrar el token vivo, y el hexadecimal proviene del espejo en TypeScript
 * (`colors.ts`) que la compuerta de paridad verifica.
 */

/** Tokens de la paleta dual con su rol semantico (9.1). */
const PALETTE_TOKENS = [
  { token: '--background', label: 'Lienzo base', light: colors.background, dark: darkColors.background },
  { token: '--surface', label: 'Tarjetas, tablas y modales', light: colors.surface, dark: darkColors.surface },
  {
    token: '--surface-muted',
    label: 'Cabeceras, hover, zonas editoriales',
    light: colors.surfaceMuted,
    dark: darkColors.surfaceMuted,
  },
  { token: '--border', label: 'Borde estructural 1px', light: colors.border, dark: darkColors.border },
  {
    token: '--border-subtle',
    label: 'Hairline divisorio interno',
    light: colors.borderSubtle,
    dark: darkColors.borderSubtle,
  },
  { token: '--foreground', label: 'Texto primario', light: colors.foreground, dark: darkColors.foreground },
  {
    token: '--foreground-muted',
    label: 'Texto secundario',
    light: colors.foregroundMuted,
    dark: darkColors.foregroundMuted,
  },
  {
    token: '--foreground-subtle',
    label: 'Metadatos y placeholders',
    light: colors.foregroundSubtle,
    dark: darkColors.foregroundSubtle,
  },
  { token: '--success', label: 'Confirmado / activo', light: colors.success, dark: darkColors.success },
  { token: '--warning', label: 'Pendiente / reloj de 15 min', light: colors.warning, dark: darkColors.warning },
  { token: '--danger', label: 'Error / destructivo', light: colors.danger, dark: darkColors.danger },
  { token: '--info', label: 'Informativo / transito', light: colors.info, dark: darkColors.info },
] as const;

/** Matriz de identidad por rol (9.2): el acento se remapea por `data-role`. */
const ROLE_MATRIX = [
  { role: 'buyer', label: 'Buyer (jade de marca)', light: colors.brand, dark: darkColors.brand },
  {
    role: 'seller',
    label: 'Seller (violeta estudio)',
    light: roleAccents.seller.light.brand,
    dark: roleAccents.seller.dark.brand,
  },
  {
    role: 'admin',
    label: 'Admin (indigo de mando)',
    light: roleAccents.admin.light.brand,
    dark: roleAccents.admin.dark.brand,
  },
  {
    role: 'logistics',
    label: 'Logistics (cian operativo)',
    light: roleAccents.logistics.light.brand,
    dark: roleAccents.logistics.dark.brand,
  },
  {
    role: 'supervisor',
    label: 'Supervisor (fucsia forense)',
    light: roleAccents.supervisor.light.brand,
    dark: roleAccents.supervisor.dark.brand,
  },
] as const;

interface SwatchProps {
  token: string;
  label: string;
  hex: string;
}

function Swatch({ token, label, hex }: SwatchProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-surface p-2">
      <div
        aria-hidden="true"
        className="size-10 shrink-0 rounded-md border border-border/80"
        style={{ backgroundColor: `var(${token})` }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-xs text-foreground">{token}</span>
        <span className="truncate text-[11px] text-foreground-muted">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground-subtle">{hex}</span>
      </div>
    </div>
  );
}

const meta = {
  title: 'Design System/Tokens/Palette',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Paleta del modo claro "Estudio Porcelana" (9.1). */
export const LightMode: Story = {
  args: {},
  render: () => (
    <div className="bg-background p-8 text-foreground">
      <h2 className="font-heading text-xl font-semibold">Modo claro &middot; Estudio Porcelana</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Tokens runtime tal como los declara <code className="font-mono">:root</code> en theme.css.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTE_TOKENS.map((entry) => (
          <Swatch key={entry.token} token={entry.token} label={entry.label} hex={entry.light} />
        ))}
      </div>
    </div>
  ),
};

/** Paleta del modo oscuro "Boveda Grafito" (9.1). */
export const DarkMode: Story = {
  args: {},
  render: () => (
    <div className="dark bg-background p-8 text-foreground">
      <h2 className="font-heading text-xl font-semibold">Modo oscuro &middot; Boveda Grafito</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        El scope <code className="font-mono">.dark</code> remapea la paleta completa en runtime.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTE_TOKENS.map((entry) => (
          <Swatch key={entry.token} token={entry.token} label={entry.label} hex={entry.dark} />
        ))}
      </div>
    </div>
  ),
};

/** Identidad por rol en modo claro: el acento se remapea por `data-role` (9.2). */
export const RoleAccentsLight: Story = {
  args: {},
  render: () => (
    <div className="bg-background p-8 text-foreground">
      <h2 className="font-heading text-xl font-semibold">Identidad por rol &middot; modo claro</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Cada scope <code className="font-mono">data-role</code> re-declara solo el eje de acento
        (<code className="font-mono">--brand</code> / <code className="font-mono">--brand-strong</code>).
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_MATRIX.map((entry) => (
          <div key={entry.role} data-role={entry.role} className="rounded-lg border border-border/80 bg-surface p-3">
            <div
              aria-hidden="true"
              className="h-10 w-full rounded-md border border-border/80"
              style={{ backgroundColor: 'var(--brand)' }}
            />
            <p className="mt-2 text-sm font-medium text-foreground">{entry.label}</p>
            <p className="font-mono text-[11px] tabular-nums text-foreground-muted">{entry.light}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Identidad por rol en modo oscuro (9.2). */
export const RoleAccentsDark: Story = {
  args: {},
  render: () => (
    <div className="dark bg-background p-8 text-foreground">
      <h2 className="font-heading text-xl font-semibold">Identidad por rol &middot; modo oscuro</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Los cinco acentos estan espaciados al maximo en el circulo cromatico y ninguno coincide con
        un color de estado.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_MATRIX.map((entry) => (
          <div key={entry.role} data-role={entry.role} className="rounded-lg border border-border/80 bg-surface p-3">
            <div
              aria-hidden="true"
              className="h-10 w-full rounded-md border border-border/80"
              style={{ backgroundColor: 'var(--brand)' }}
            />
            <p className="mt-2 text-sm font-medium text-foreground">{entry.label}</p>
            <p className="font-mono text-[11px] tabular-nums text-foreground-muted">{entry.dark}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Comprobacion de paridad: el espejo TypeScript y el token CSS coinciden. */
export const TokenParity: Story = {
  args: {},
  render: () => (
    <div className="bg-background p-8 text-foreground">
      <h2 className="font-heading text-xl font-semibold">Paridad CSS &harr; TypeScript</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        La compuerta <code className="font-mono">tokens.test.ts</code> falla si theme.css y
        colors.ts divergen: manda el CSS, porque es lo que pinta la interfaz.
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-border/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Claro</th>
              <th className="px-4 py-3">Oscuro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {PALETTE_TOKENS.map((entry) => (
              <tr key={entry.token}>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{entry.token}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-foreground-muted">
                  {entry.light}
                </td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-foreground-muted">
                  {entry.dark}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
};
