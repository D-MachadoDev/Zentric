import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
} from './index';

describe('Primitivas Atómicas (packages/ui/src/primitives)', () => {
  describe('Button', () => {
    it('renderiza con rol accesible y maneja eventos de click', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Aceptar</Button>);

      const button = screen.getByRole('button', { name: 'Aceptar' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-slot', 'button');

      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('aplica las clases de foco y anillo de teclado (focus-visible)', () => {
      render(<Button>Foco Teclado</Button>);
      const button = screen.getByRole('button', { name: 'Foco Teclado' });
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-ring');
      expect(button).toHaveClass('focus-visible:ring-offset-2');
    });

    it('aplica las clases de variantes semánticas canónicas', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');
      expect(screen.getByRole('button')).toHaveClass('text-primary-foreground');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-surface');
      expect(screen.getByRole('button')).toHaveClass('border-border/80');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');

      rerender(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-destructive');
      expect(screen.getByRole('button')).toHaveClass('bg-destructive/15');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-surface-muted');

      rerender(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-primary');
    });

    it('maneja el estado isLoading inhabilitando interacción y mostrando spinner accesible', async () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Guardando
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Guardando' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');

      const spinner = button.querySelector('[data-slot="button-spinner"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');

      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('inhabilita interacción cuando disabled=true', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Deshabilitado
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Deshabilitado' });
      expect(button).toBeDisabled();
      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('soporta composición semántica con asChild', () => {
      render(
        <Button asChild>
          <a href="/pedidos">Ver Pedidos</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Ver Pedidos' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('data-slot', 'button');
      expect(link).toHaveClass('bg-primary');
    });
  });

  describe('Input', () => {
    it('renderiza con data-slot y permite entrada de texto', async () => {
      render(<Input placeholder="Buscar por SKU..." />);
      const input = screen.getByPlaceholderText('Buscar por SKU...');

      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('data-slot', 'input');
      expect(input).toHaveClass('bg-surface/90');
      expect(input).toHaveClass('border-border/90');

      await userEvent.type(input, 'SKU-1002');
      expect(input).toHaveValue('SKU-1002');
    });

    it('aplica anillos de foco de teclado accesibles (focus-visible)', () => {
      render(<Input aria-label="Cantidad" />);
      const input = screen.getByLabelText('Cantidad');
      expect(input).toHaveClass('focus-visible:ring-2');
      expect(input).toHaveClass('focus-visible:ring-ring');
      expect(input).toHaveClass('focus-visible:border-ring');
    });

    it('refleja estado inhabilitado correctamente', () => {
      render(<Input aria-label="Bloqueado" disabled />);
      const input = screen.getByLabelText('Bloqueado');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });

    it('soporta indicador de error aria-invalid', () => {
      render(<Input aria-label="Código Postal" aria-invalid="true" />);
      const input = screen.getByLabelText('Código Postal');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveClass('aria-invalid:border-destructive');
    });
  });

  describe('Badge', () => {
    it('renderiza con texto accesible y data-slot', () => {
      render(<Badge>Activo</Badge>);
      const badge = screen.getByText('Activo');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-slot', 'badge');
      expect(badge).toHaveAttribute('data-variant', 'default');
      expect(badge).toHaveClass('bg-primary');
    });

    it('aplica clases correspondientes a cada variante de estado', () => {
      const { rerender } = render(<Badge variant="secondary">Secundario</Badge>);
      expect(screen.getByText('Secundario')).toHaveClass('bg-surface-muted');

      rerender(<Badge variant="destructive">Cancelado</Badge>);
      expect(screen.getByText('Cancelado')).toHaveClass('text-destructive');
      expect(screen.getByText('Cancelado')).toHaveClass('border-destructive/30');

      rerender(<Badge variant="warning">Pendiente</Badge>);
      expect(screen.getByText('Pendiente')).toHaveClass('text-warning');
      expect(screen.getByText('Pendiente')).toHaveClass('border-warning/30');

      rerender(<Badge variant="success">Entregado</Badge>);
      expect(screen.getByText('Entregado')).toHaveClass('text-success');
      expect(screen.getByText('Entregado')).toHaveClass('border-success/30');

      rerender(<Badge variant="info">En Tránsito</Badge>);
      expect(screen.getByText('En Tránsito')).toHaveClass('text-info');
      expect(screen.getByText('En Tránsito')).toHaveClass('border-info/30');

      rerender(<Badge variant="outline">Esquema</Badge>);
      expect(screen.getByText('Esquema')).toHaveClass('border-border/80');
    });

    it('soporta composición semántica con asChild', () => {
      render(
        <Badge asChild>
          <a href="/tags/nuevo">Nuevo</a>
        </Badge>,
      );
      const link = screen.getByRole('link', { name: 'Nuevo' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('data-slot', 'badge');
    });
  });

  describe('Skeleton', () => {
    it('renderiza como elemento de estado accesible con pulsación', () => {
      render(<Skeleton className="h-6 w-32" data-testid="test-skeleton" />);
      const skeleton = screen.getByTestId('test-skeleton');

      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('bg-muted');
      expect(skeleton).toHaveClass('h-6');
      expect(skeleton).toHaveClass('w-32');
    });
  });

  describe('Label', () => {
    it('asocia texto descriptivo al campo de formulario indicado', () => {
      render(
        <div>
          <Label htmlFor="inventory-count">Existencias en Bodega</Label>
          <Input id="inventory-count" />
        </div>,
      );

      const label = screen.getByText('Existencias en Bodega');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('data-slot', 'label');

      const input = screen.getByLabelText('Existencias en Bodega');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'inventory-count');
    });
  });

  describe('Card', () => {
    it('compone cabecera, título, descripción, acción, contenido y pie', () => {
      render(
        <Card size="default">
          <CardHeader>
            <CardTitle>Orden #1004</CardTitle>
            <CardDescription>Resumen de despacho</CardDescription>
            <CardAction>
              <Button size="xs" variant="outline">Detalle</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>1x Laptop Pro 16</p>
          </CardContent>
          <CardFooter>
            <span>Total: $2.450.000 COP</span>
          </CardFooter>
        </Card>,
      );

      expect(screen.getByText('Orden #1004')).toBeInTheDocument();
      expect(screen.getByText('Resumen de despacho')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument();
      expect(screen.getByText('1x Laptop Pro 16')).toBeInTheDocument();
      expect(screen.getByText('Total: $2.450.000 COP')).toBeInTheDocument();

      const card = screen.getByText('Orden #1004').closest('[data-slot="card"]');
      expect(card).toHaveAttribute('data-size', 'default');
      expect(card).toHaveClass('bg-surface');
      expect(card).toHaveClass('border-border/80');
    });

    it('soporta tamaño compacto size="sm"', () => {
      render(
        <Card size="sm">
          <CardTitle>Métrica Compacta</CardTitle>
        </Card>,
      );

      const card = screen.getByText('Métrica Compacta').closest('[data-slot="card"]');
      expect(card).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Alert', () => {
    it('expone role="alert" y variantes semánticas', () => {
      const { rerender } = render(
        <Alert variant="default">
          <AlertTitle>Información</AlertTitle>
          <AlertDescription>El inventario ha sido actualizado.</AlertDescription>
        </Alert>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('data-slot', 'alert');
      expect(alert).toHaveClass('bg-surface/90');
      expect(screen.getByText('Información')).toHaveAttribute('data-slot', 'alert-title');
      expect(screen.getByText('El inventario ha sido actualizado.')).toHaveAttribute('data-slot', 'alert-description');

      rerender(
        <Alert variant="destructive">
          <AlertTitle>Error Crítico</AlertTitle>
          <AlertDescription>Stock agotado en todas las bodegas.</AlertDescription>
          <AlertAction>
            <button type="button">Reintentar</button>
          </AlertAction>
        </Alert>,
      );

      const alertDestructive = screen.getByRole('alert');
      expect(alertDestructive).toHaveClass('text-destructive');
      expect(alertDestructive).toHaveClass('bg-destructive/10');
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    });

    it('soporta variantes warning, success e info', () => {
      const { rerender } = render(
        <Alert variant="warning">
          <AlertTitle>Advertencia</AlertTitle>
        </Alert>,
      );
      expect(screen.getByRole('alert')).toHaveClass('text-warning');

      rerender(
        <Alert variant="success">
          <AlertTitle>Éxito</AlertTitle>
        </Alert>,
      );
      expect(screen.getByRole('alert')).toHaveClass('text-success');

      rerender(
        <Alert variant="info">
          <AlertTitle>Aviso</AlertTitle>
        </Alert>,
      );
      expect(screen.getByRole('alert')).toHaveClass('text-info');
    });
  });

  describe('Dialog', () => {
    it('abre modal interactivo con accesibilidad ARIA completa y permite cerrar', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir Inspección</Button>
          </DialogTrigger>
          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>Inspección de Calidad</DialogTitle>
              <DialogDescription>
                Verifique los sellos de seguridad del paquete.
              </DialogDescription>
            </DialogHeader>
            <div>Formulario de inspección</div>
            <DialogFooter showCloseButton>
              <Button variant="default">Aprobar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      const trigger = screen.getByRole('button', { name: 'Abrir Inspección' });
      expect(trigger).toBeInTheDocument();

      // Al hacer click, el diálogo abre
      await userEvent.click(trigger);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-slot', 'dialog-content');
      expect(screen.getByText('Inspección de Calidad')).toBeInTheDocument();
      expect(screen.getByText('Verifique los sellos de seguridad del paquete.')).toBeInTheDocument();

      // Botón de cierre en header
      const closeButtons = screen.getAllByRole('button', { name: 'Close' });
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);

      // Cerrar modal vía botón Close
      await userEvent.click(closeButtons[0]);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('permite cerrar el modal con la tecla Escape', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Ver Términos</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Términos del Marketplace</DialogTitle>
            <DialogDescription>Condiciones de despacho.</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Ver Términos' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('soporta botón de cierre personalizado con DialogClose', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir Personalizado</Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Modal Personalizado</DialogTitle>
            <DialogClose asChild>
              <Button variant="outline">Cancelar Acción</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Abrir Personalizado' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar Acción' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
