/**
 * Primitivas Atómicas de Zentric (Atomic Design — Atoms).
 * Controles de interfaz base, interactivos y contenedores estructurales accesibles.
 *
 * Todas las primitivas consumen los tokens canónicos de diseño (theme.css)
 * y garantizan accesibilidad WCAG 2.2 AA sin lógica de fetching ni estado global.
 */

// Feedback & Overlay
export * from './Alert';
export * from './AlertDialog';
export * from './Dialog';
export * from './Sonner';
export * from './Spinner';

// Display & Data
export * from './Badge';
export * from './Card';
export * from './Skeleton';
export * from './Table';

// Form & Controls
export * from './Button';
export * from './Checkbox';
export * from './Input';
export * from './Label';
export * from './Select';
export * from './Textarea';
