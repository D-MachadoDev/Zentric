import { Clock, RotateCcw, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';

/**
 * Franja de garantias del marketplace (S6, §8-A3).
 *
 * No son cuatro tarjetas: son cuatro COMPROMISOS en una sola fila editorial
 * separada por hairlines. §2.2 prohibe las "tarjetas clonadas de igual
 * jerarquia" y §9.6 pide una banda de indicadores con jerarquia, no una
 * cuadricula de 4 cajas identicas. Ademas, cuatro iconsos con cuatro colores
 * de estado simultaneos seria el "arcoiris visual" que §2.2 veta: aqui el
 * color lo aporta el texto de estado, y el icono es tinta neutra.
 */

interface Guarantee {
  Icon: LucideIcon;
  /** Rotulo corto en mono-caps (§4.1 Voz 3: el rotulo tecnico va en Geist Mono). */
  label: string;
  /** Una linea de apoyo en prosa operativa (Geist Sans 400). */
  detail: string;
}

/**
 * Las tres garantias que el backend sostiene de verdad (§8-A3):
 * reserva atomica de 15 minutos, despacho particionado y split de
 * facturacion. El cuarto hueco es la devolucion con inspeccion tecnica.
 */
const GUARANTEES: Guarantee[] = [
  {
    Icon: Clock,
    label: 'Reserva 15 min',
    detail: 'Stock bloqueado en tu checkout',
  },
  {
    Icon: Truck,
    label: 'Despacho multi-bodega',
    detail: 'Rastreable de punta a punta',
  },
  {
    Icon: ShieldCheck,
    label: 'Split 5/95',
    detail: 'Facturacion transparente',
  },
  {
    Icon: RotateCcw,
    label: 'Inspeccion tecnica',
    detail: 'Devolucion sin friccion',
  },
];

export function CatalogTrustStrip() {
  return (
    <section
      aria-label="Garantias del marketplace"
      className="surface-hairline overflow-hidden rounded-2xl"
    >
      <ul className="divide-y divide-border-subtle sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {GUARANTEES.map(({ Icon, label, detail }) => (
          <li
            key={label}
            className="flex items-center gap-3 px-4 py-3.5 sm:border-l sm:border-border-subtle sm:first:border-l-0 lg:px-5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[11px] font-semibold tracking-[0.12em] text-foreground uppercase">
                {label}
              </span>
              <span className="block truncate text-[11px] text-foreground-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
