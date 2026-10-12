import { cn } from '../../lib/cn';

/**
 * Importe monetario (Frontend-Design-System §3).
 *
 * La moneda y el total los decide el **servidor**: aquí sólo se formatea. La Ley
 * prohíbe recalcular el total en el cliente como fuente de verdad, y por eso
 * este componente ni siquiera acepta un importe "calculado" — recibe el par
 * `amount`/`currency` tal cual lo entrega el backend.
 */
export interface MoneyAmountProps {
  amount: number;
  /** ISO-4217 (`"COP"`, `"USD"`…), tal cual lo devuelve el servidor. */
  currency: string;
  className?: string;
}

const FALLBACK_LOCALE = 'es-AR';

function format(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(FALLBACK_LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Un código de moneda mal formado lanza RangeError en Intl. El servidor no
    // debería mandarlo, pero un valor inesperado debe verse en pantalla, no
    // tumbarla: se muestra el par crudo, que es lo que el servidor afirmó.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function MoneyAmount({ amount, currency, className }: MoneyAmountProps) {
  return (
    <span
      data-slot="money-amount"
      data-currency={currency}
      className={cn('font-mono tabular-nums', className)}
    >
      {format(amount, currency)}
    </span>
  );
}

export { MoneyAmount };
