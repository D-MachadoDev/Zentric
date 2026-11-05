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
} from '@zentric/ui';
import { Toaster, toast } from '@zentric/ui';
import type { ConfirmacionAlerta } from '../../core/utils/AlertAdapter';
import { alertAdapter } from '../providers/alertAdapter';

/**
 * Conecta el adaptador global de alertas con los componentes visuales.
 * Se monta una vez en `main.tsx`; el adaptador conserva la resolución de confirmaciones.
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
    // Radix puede notificar el cierre después de la acción; el adaptador ignora
    // esa segunda resolución.
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
