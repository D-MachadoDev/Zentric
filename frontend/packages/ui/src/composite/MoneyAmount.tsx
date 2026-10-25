import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Importe monetario con disciplina OpenType (Frontend-Design-System §4.2 y §5.3).
 *
 * El servidor C# es la única autoridad financiera: la moneda y el total vienen
 * siempre del backend en el DTO (ZENTRIC.md / ADR-0012). Aquí sólo se formatea
 * con cifras tabulares (font-variant-numeric: tabular-nums) y versalitas para
 * el código ISO de la divisa (font-variant-caps: all-small-caps).
 */
export interface MoneyAmountProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number;
  /** Código ISO-4217 ("COP", "USD"...), tal cual lo entrega el servidor. */
  currency: string;
  locale?: string;
  className?: string;
}

const FALLBACK_LOCALE = 'es-CO';

function formatCurrency(amount: number, currency: string, locale: string = FALLBACK_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.trim().toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Si el servidor devolviera un código no reconocido por Intl, no rompemos la
    // interfaz: mostramos el par numérico con el código crudo recibido.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function MoneyAmount({
  amount,
  currency,
  locale = FALLBACK_LOCALE,
  className,
  ...props
}: MoneyAmountProps) {
  const formatted = formatCurrency(amount, currency, locale);

  return (
    <span
      data-slot="money-amount"
      data-currency={currency}
      className={cn(
        'font-mono tabular-nums tracking-tight [font-variant-caps:all-small-caps]',
        className
      )}
      {...props}
    >
      {formatted}
    </span>
  );
}

export { MoneyAmount };
