/**
 * Formateadores de dinero.
 *
 * El backend es la autoridad (Q-15/Q16): la moneda viene SIEMPRE del servidor
 * en el DTO, y la lista blanca habilita hoy sólo "COP". Por eso aquí no se
 * decide la divisa, sólo se pinta la que llega.
 */

/** Lista blanca del backend, reflejada para poder formatear sin red. */
export const SUPPORTED_CURRENCIES = ['COP'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
  COP: 'es-CO',
};

export interface MoneyLike {
  /** Importe con dos decimales, ya redondeados por el dominio. */
  amount: number;
  /** Código ISO 4217 de 3 letras, mayúsculas. */
  currency: string;
}

/**
 * Formatea un importe con la moneda que envía el servidor.
 *
 * Si llega una divisa fuera de la lista blanca no se silencia: se pinta el
 * código tal cual, porque ocultarlo sería mentir sobre el dato que el backend
 * ya aceptó.
 */
export function formatMoney(money: MoneyLike, options?: Intl.NumberFormatOptions): string {
  const currency = money.currency.trim().toUpperCase();
  const locale = LOCALE_BY_CURRENCY[currency as SupportedCurrency] ?? 'es-CO';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(money.amount);
}

/** Importe sin símbolo: útil en columnas de tabla donde la cabecera ya dice la moneda. */
export function formatMoneyAmount(money: MoneyLike, locale = 'es-CO'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(money.amount);
}

/** `true` si el importe es cero, para distinguir "gratis" de "sin precio". */
export function isFree(money: MoneyLike): boolean {
  return money.amount === 0;
}
