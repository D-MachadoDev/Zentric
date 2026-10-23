import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@zentric/ui/components/ui/alert-dialog';
import { Toaster, toast } from '@zentric/ui/components/ui/sonner';
import type { ConfirmacionAlerta } from '../../adapters/alert/AlertAdapter';
import { alertAdapter } from '../../app/providers/alertAdapter';

/**
 * Punto de pintado de `AlertPort`.
 *
 * Es la mitad de presentación del adaptador: el adaptador decide QUÉ hay que
 * avisar o confirmar y resuelve las promesas; aquí sólo se traduce eso a los
 * componentes del design system (`Toaster` para avisos, `AlertDialog` para
 * confirmaciones). Se monta una vez en `main.tsx`.
 */
export function AlertHost() {
  const [confirmacion, setConfirmacion] = useState<ConfirmacionAlerta | null>(null);

  useEffect(
    () =>
      alertAdapter.bind({
        mostrarAviso: ({ kind, title, message }) => toast[kind](title, { description: message }),
        abrirConfirmacion: setConfirmacion,
      }),
    [],
  );

  const cerrar = (aceptada: boolean) => {
    // El propio `cerrar` del adaptador ignora la segunda invocación, así que el
    // `onOpenChange` que Radix dispara tras pulsar la acción no puede voltear la
    // respuesta ya dada.
    confirmacion?.cerrar(aceptada);
    setConfirmacion(null);
  };

  return (
    <>
      <Toaster />

      <AlertDialog open={confirmacion !== null} onOpenChange={(open) => !open && cerrar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmacion?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmacion?.message}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => cerrar(true)}>
              {confirmacion?.confirmLabel ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
