import { Clock, RotateCcw, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';

interface Guarantee {
  Icon: LucideIcon;
  label: string;
  detail: string;
}

const GUARANTEES: Guarantee[] = [
  {
    Icon: Clock,
    label: 'Reserva 15 min',
    detail: 'Stock bloqueado durante el checkout',
  },
  {
    Icon: Truck,
    label: 'Despacho multi-bodega',
    detail: 'Trazabilidad de punta a punta',
  },
  {
    Icon: ShieldCheck,
    label: 'Split 5/95',
    detail: 'Facturación transparente',
  },
  {
    Icon: RotateCcw,
    label: 'Inspección técnica',
    detail: 'Devoluciones sin fricción',
  },
];

/**
 * Franja de garantías operativas: iconos lineales, textos breves
 * y divisores finos. Sin tarjetas ni acentos de color innecesarios.
 */
export function CatalogTrustStrip() {
  return (
    <section aria-label="Garantías del marketplace" className="border-y border-border/60">
      <ul className="grid grid-cols-2 divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        {GUARANTEES.map(({ Icon, label, detail }) => (
          <li key={label} className="flex items-start gap-3 px-1 py-4 first:pl-0 last:pr-0 sm:px-5">
            <Icon
              className="mt-0.5 h-5 w-5 shrink-0 text-brand"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                {label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-foreground-muted">
                {detail}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
