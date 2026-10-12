import { Toaster as SonnerToaster, toast } from 'sonner';

/**
 * Avisos flotantes del design system (Frontend-Adapters §5).
 *
 * Adaptado del patrón shadcn con los tokens de Q7/Q8: no se añade una segunda
 * librería de avisos, se tematiza `sonner` para que un toast pinte con las
 * mismas superficies, radios y tipografía que el resto de la consola.
 *
 * `toast` se reexporta aquí —y no desde la app— porque el paquete de diseño es
 * el dueño del aviso: con pnpm estricto la aplicación no puede resolver una
 * dependencia que no declara, y tampoco debería poder cambiar de librería de
 * avisos por su cuenta.
 *
 * El tema es **oscuro por defecto** (Q3), así que no se lee de un proveedor de
 * temas: si algún día hay tema claro, aquí se inyecta y ya.
 */
function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      // §7: los avisos no bloquean la lectura ni retienen la atención.
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-sm group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-xs group-[.toast]:text-foreground/70',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-foreground/70',
        },
      }}
    />
  );
}

export { Toaster, toast };
