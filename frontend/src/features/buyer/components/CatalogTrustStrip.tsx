import { RotateCcw, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';

interface Guarantee {
  Icon: LucideIcon;
  label: string;
  detail: string;
}

const GUARANTEES: Guarantee[] = [
  {
    Icon: ShieldCheck,
    label: 'Pago en Custodia Segura',
    detail:
      'Tus fondos quedan protegidos y solo se transfieren al vendedor tras confirmación de entrega conforme.',
  },
  {
    Icon: RotateCcw,
    label: 'Devolución Fácil y Rápida',
    detail:
      '5 días hábiles de retracto garantizado para devolución sin trámites y reembolso íntegro.',
  },
  {
    Icon: Truck,
    label: 'Despacho en 24h desde Bodega Central',
    detail:
      'Stock real en bodega central listo para entrega express con seguimiento en tiempo real.',
  },
];

/**
 * Franja de garantías institucionales en 3 columnas de alta fidelidad,
 * alineada con el prototipo v2 del marketplace de comprador.
 */
export function CatalogTrustStrip() {
  return (
    <section
      aria-label="Garantías Institucionales"
      className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-2xs"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {GUARANTEES.map(({ Icon, label, detail }) => (
          <div key={label} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-foreground">
              <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {label}
              </h4>
              <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
