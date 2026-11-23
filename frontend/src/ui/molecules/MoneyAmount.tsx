import * as React from 'react';
import { cn } from '../lib/cn';

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
        'tabular-nums font-semibold tracking-tight inline-flex items-baseline',
        className
      )}
      {...props}
    >
      {formatted}
    </span>
  );
}

export { MoneyAmount };
