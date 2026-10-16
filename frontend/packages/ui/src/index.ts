/**
 * Punto de entrada del design system.
 *
 * La app importa desde `@zentric/ui`. Los subcaminos (`@zentric/ui/tokens`,
 * `@zentric/ui/lib`, `@zentric/ui/hooks`, `@zentric/ui/logo`) también están
 * declarados en package.json para tree-shaking fino.
 *
 * Los componentes shadcn/ui (Q5/Q14) se exportan explicitamente: no hay
 * re-export genérico, para que el bundle sólo pague lo que se usa.
 */
export * from './tokens';
export * from './primitives';
export * from './lib';
export * from './hooks';
export { Logo, LogoMark, LogoWordmark } from './logo';
export type { LogoProps, LogoMarkProps, LogoWordmarkProps } from './logo';

