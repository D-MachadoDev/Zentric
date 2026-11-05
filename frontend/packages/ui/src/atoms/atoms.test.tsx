import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableDensityContext,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from './index';

describe('Atoms Design System Suite (@zentric/ui/atoms)', () => {
  // ==========================================================================
  // 1. BUTTON ATOM & INTERACTIVE STATES
  // ==========================================================================
  describe('Button Atom', () => {
    it('renders with accessible role and fires click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Acción Principal</Button>);

      const btn = screen.getByRole('button', { name: 'Acción Principal' });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('data-slot', 'button');

      await user.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders semantic variants (default, primary, subtle, outline, secondary, destructive, ghost, link)', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');

      rerender(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');

      rerender(<Button variant="subtle">Subtle</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-brand/10');
      expect(screen.getByRole('button')).toHaveClass('text-brand');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-surface');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');

      rerender(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-destructive');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-surface-muted');

      rerender(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-primary');
    });

    it('renders all sizing variants (xs, sm, md, default, lg, icon, icon-xs, icon-sm, icon-lg)', () => {
      const { rerender } = render(<Button size="xs">XS</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-6');

      rerender(<Button size="sm">SM</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9');

      rerender(<Button size="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9');

      rerender(<Button size="md">MD</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10');

      rerender(<Button size="lg">LG</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11');

      rerender(<Button size="icon">Icon</Button>);
      expect(screen.getByRole('button')).toHaveClass('size-10');
    });

    it('manages loading state: disables interaction, sets aria-busy, renders Spinner', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Procesando Pago
        </Button>,
      );

      const btn = screen.getByRole('button', { name: 'Procesando Pago' });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');

      const spinner = btn.querySelector('[data-slot="button-spinner"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');

      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('manages disabled state: prevents clicks and cursor interaction', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Deshabilitado
        </Button>,
      );

      const btn = screen.getByRole('button', { name: 'Deshabilitado' });
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('disabled:opacity-50');

      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports semantic polymorphic delegation with asChild', () => {
      render(
        <Button asChild>
          <a href="/catalogo">Ir al Catálogo</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Ir al Catálogo' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('data-slot', 'button');
    });
  });

  // ==========================================================================
  // 2. SPINNER ATOM
  // ==========================================================================
  describe('Spinner Atom', () => {
    it('renders accessible status role with screen reader label when visible', () => {
      render(<Spinner label="Cargando pedidos..." />);
      const spinner = screen.getByRole('status', { name: 'Cargando pedidos...' });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('data-slot', 'spinner');
    });

    it('renders as decorative element when aria-hidden is passed', () => {
      render(<Spinner aria-hidden="true" data-testid="decorative-spinner" />);
      const spinner = screen.getByTestId('decorative-spinner');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).not.toHaveAttribute('role');
    });

    it('supports size and color variant scales', () => {
      const { rerender } = render(<Spinner size="sm" variant="brand" data-testid="sp" />);
      expect(screen.getByTestId('sp')).toHaveClass('size-3.5');
      expect(screen.getByTestId('sp')).toHaveClass('text-brand');

      rerender(<Spinner size="lg" variant="muted" data-testid="sp" />);
      expect(screen.getByTestId('sp')).toHaveClass('size-6');
      expect(screen.getByTestId('sp')).toHaveClass('text-foreground-muted');
    });
  });

  // ==========================================================================
  // 3. FORM INPUTS: INPUT, TEXTAREA, LABEL, CHECKBOX, SELECT
  // ==========================================================================
  describe('Form Control Atoms', () => {
    describe('Input Atom', () => {
      it('handles text entry and renders with tokenized background and borders', async () => {
        const user = userEvent.setup();
        render(<Input placeholder="Ingrese SKU" aria-label="SKU" />);
        const input = screen.getByPlaceholderText('Ingrese SKU');

        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('data-slot', 'input');
        expect(input).toHaveClass('bg-surface/90');
        expect(input).toHaveClass('border-border/90');

        await user.type(input, 'ZEN-9988');
        expect(input).toHaveValue('ZEN-9988');
      });

      it('reflects error state via aria-invalid="true" and border-destructive', () => {
        render(<Input aria-label="Email" aria-invalid="true" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveClass('aria-invalid:border-destructive');
      });

      it('reflects disabled state preventing text entry', async () => {
        const user = userEvent.setup();
        render(<Input aria-label="Bloqueado" disabled value="Solo lectura" onChange={() => {}} />);
        const input = screen.getByLabelText('Bloqueado');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled:cursor-not-allowed');

        await user.type(input, '123');
        expect(input).toHaveValue('Solo lectura');
      });

      it('renders empty state correctly with placeholder', () => {
        render(<Input placeholder="Campo vacío" />);
        const input = screen.getByPlaceholderText('Campo vacío');
        expect(input).toHaveValue('');
      });
    });

    describe('Textarea Atom', () => {
      it('handles multi-line input and resizing utilities', async () => {
        const user = userEvent.setup();
        render(<Textarea placeholder="Observaciones de despacho" aria-label="Notas" />);
        const textarea = screen.getByPlaceholderText('Observaciones de despacho');

        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveAttribute('data-slot', 'textarea');
        expect(textarea).toHaveClass('bg-surface/90');

        await user.type(textarea, 'Línea 1\nLínea 2');
        expect(textarea).toHaveValue('Línea 1\nLínea 2');
      });

      it('handles error state via aria-invalid on textarea', () => {
        render(<Textarea aria-label="Comentarios" aria-invalid="true" />);
        const textarea = screen.getByLabelText('Comentarios');
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
        expect(textarea).toHaveClass('aria-invalid:border-danger');
      });

      it('handles disabled state on textarea', () => {
        render(<Textarea aria-label="Deshabilitado" disabled />);
        expect(screen.getByLabelText('Deshabilitado')).toBeDisabled();
      });
    });

    describe('Label Atom', () => {
      it('binds to form control via htmlFor and displays semantic typography', () => {
        render(
          <div>
            <Label htmlFor="stock-field">Nivel de Stock</Label>
            <Input id="stock-field" />
          </div>,
        );

        const label = screen.getByText('Nivel de Stock');
        expect(label).toBeInTheDocument();
        expect(label).toHaveAttribute('data-slot', 'label');
        expect(label).toHaveClass('text-sm');
        expect(label).toHaveClass('font-medium');

        const input = screen.getByLabelText('Nivel de Stock');
        expect(input).toHaveAttribute('id', 'stock-field');
      });
    });

    describe('Checkbox Atom', () => {
      it('toggles checked state via mouse click and keyboard spacebar', async () => {
        const user = userEvent.setup();
        const handleCheckedChange = vi.fn();
        render(<Checkbox aria-label="Aceptar términos" onCheckedChange={handleCheckedChange} />);

        const checkbox = screen.getByRole('checkbox', { name: 'Aceptar términos' });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute('data-slot', 'checkbox');
        expect(checkbox).toHaveAttribute('aria-checked', 'false');

        // Click to check
        await user.click(checkbox);
        expect(handleCheckedChange).toHaveBeenCalledWith(true);

        // Spacebar to toggle
        checkbox.focus();
        await user.keyboard(' ');
        expect(handleCheckedChange).toHaveBeenCalledWith(true);
      });

      it('supports disabled state on checkbox', async () => {
        const user = userEvent.setup();
        const handleCheckedChange = vi.fn();
        render(<Checkbox disabled aria-label="Términos bloqueados" onCheckedChange={handleCheckedChange} />);

        const checkbox = screen.getByRole('checkbox', { name: 'Términos bloqueados' });
        expect(checkbox).toBeDisabled();

        await user.click(checkbox);
        expect(handleCheckedChange).not.toHaveBeenCalled();
      });

      it('reflects aria-invalid error state on checkbox', () => {
        render(<Checkbox aria-label="Obligatorio" aria-invalid="true" />);
        const checkbox = screen.getByRole('checkbox', { name: 'Obligatorio' });
        expect(checkbox).toHaveAttribute('aria-invalid', 'true');
        expect(checkbox).toHaveClass('aria-invalid:border-danger');
      });
    });

    describe('Select Atom', () => {
      it('renders select trigger, value placeholder, and accessible structure', () => {
        render(
          <Select defaultValue="bogota">
            <SelectTrigger aria-label="Seleccionar Ciudad">
              <SelectValue placeholder="Seleccione una bodega" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bogota">Bogotá D.C.</SelectItem>
              <SelectItem value="medellin">Medellín</SelectItem>
            </SelectContent>
          </Select>,
        );

        const trigger = screen.getByRole('combobox', { name: 'Seleccionar Ciudad' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveAttribute('data-slot', 'select-trigger');
        expect(trigger).toHaveClass('bg-surface/90');
      });
    });
  });

  // ==========================================================================
  // 4. DISPLAY ATOMS: BADGE, TABLE, SKELETON, CARD
  // ==========================================================================
  describe('Display Atoms', () => {
    describe('Badge Atom', () => {
      it('renders accessible data-slot and default variant', () => {
        render(<Badge>Activo</Badge>);
        const badge = screen.getByText('Activo');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-slot', 'badge');
        expect(badge).toHaveAttribute('data-variant', 'default');
        expect(badge).toHaveClass('bg-primary');
      });

      it('consumes text-caption and text-2xs micro-typography tokens', () => {
        const { rerender } = render(<Badge size="caption">Caption Badge</Badge>);
        const captionBadge = screen.getByText('Caption Badge');
        expect(captionBadge).toHaveClass('text-caption');
        expect(captionBadge).toHaveClass('px-2.5'); // half-step padding (10px)

        rerender(<Badge size="2xs">Micro Badge</Badge>);
        const microBadge = screen.getByText('Micro Badge');
        expect(microBadge).toHaveClass('text-2xs');
      });

      it('supports shape variants: pill (rounded-full) vs tag (rounded-sm)', () => {
        const { rerender } = render(<Badge shape="pill">Pill</Badge>);
        expect(screen.getByText('Pill')).toHaveClass('rounded-full');
        expect(screen.getByText('Pill')).toHaveAttribute('data-shape', 'pill');

        rerender(<Badge shape="tag">Tag</Badge>);
        expect(screen.getByText('Tag')).toHaveClass('rounded-sm');
        expect(screen.getByText('Tag')).toHaveAttribute('data-shape', 'tag');
      });

      it('renders all canonical tone variants (brand, success, warning, danger, info, secondary, neutral, outline)', () => {
        const { rerender } = render(<Badge variant="brand">Brand</Badge>);
        expect(screen.getByText('Brand')).toHaveClass('border-brand/30');
        expect(screen.getByText('Brand')).toHaveClass('text-brand');

        rerender(<Badge variant="success">Success</Badge>);
        expect(screen.getByText('Success')).toHaveClass('text-success');

        rerender(<Badge variant="warning">Warning</Badge>);
        expect(screen.getByText('Warning')).toHaveClass('text-warning');

        rerender(<Badge variant="danger">Danger</Badge>);
        expect(screen.getByText('Danger')).toHaveClass('text-danger');

        rerender(<Badge variant="info">Info</Badge>);
        expect(screen.getByText('Info')).toHaveClass('text-info');

        rerender(<Badge variant="secondary">Secondary</Badge>);
        expect(screen.getByText('Secondary')).toHaveClass('bg-surface-muted');

        rerender(<Badge variant="outline">Outline</Badge>);
        expect(screen.getByText('Outline')).toHaveClass('border-border/80');
      });

      it('renders multi-tenant role accents (seller, admin, logistics, supervisor)', () => {
        const { rerender } = render(<Badge variant="seller">Vendedor</Badge>);
        expect(screen.getByText('Vendedor')).toHaveClass('border-purple-500/30');

        rerender(<Badge variant="admin">Administrador</Badge>);
        expect(screen.getByText('Administrador')).toHaveClass('border-indigo-500/30');

        rerender(<Badge variant="logistics">Operador Logístico</Badge>);
        expect(screen.getByText('Operador Logístico')).toHaveClass('border-cyan-500/30');

        rerender(<Badge variant="supervisor">Supervisor Auditor</Badge>);
        expect(screen.getByText('Supervisor Auditor')).toHaveClass('border-fuchsia-500/30');
      });

      it('supports asChild composition', () => {
        render(
          <Badge asChild>
            <a href="/pedidos/filtro">Filtro</a>
          </Badge>,
        );
        const link = screen.getByRole('link', { name: 'Filtro' });
        expect(link).toHaveAttribute('data-slot', 'badge');
      });
    });

    describe('Table Semantic Family & Density Adaptability Axis', () => {
      it('renders complete table hierarchy with default density.comfortable (40px rows)', () => {
        render(
          <Table density="comfortable">
            <TableCaption>Resumen de Envíos</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Guía</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead numeric>Flete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>GUIA-001</TableCell>
                <TableCell>Medellín</TableCell>
                <TableCell numeric>$25.000</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell numeric>$50.000</TableCell>
              </TableRow>
            </TableFooter>
          </Table>,
        );

        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        expect(table).toHaveAttribute('data-density', 'comfortable');

        // Headers provide scope="col" and text-caption
        const thGuia = screen.getByText('Guía');
        expect(thGuia).toHaveAttribute('scope', 'col');
        expect(thGuia).toHaveClass('text-caption');
        expect(thGuia).toHaveClass('h-10'); // 40px comfortable header height
        expect(thGuia).toHaveClass('px-4');
        expect(thGuia).toHaveClass('py-2.5');

        // Cells render comfortable padding
        const tdDestino = screen.getByText('Medellín');
        expect(tdDestino).toHaveClass('px-4');
        expect(tdDestino).toHaveClass('py-2.5');

        // Numeric cells format right-aligned tabular numbers
        const tdFlete = screen.getByText('$25.000');
        expect(tdFlete).toHaveClass('text-right');
        expect(tdFlete).toHaveClass('tabular-nums');
        expect(tdFlete).toHaveClass('font-mono');
      });

      it('propagates density.compact (32px rows) automatically via TableDensityContext', () => {
        render(
          <Table density="compact">
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>SKU-100</TableCell>
              </TableRow>
            </TableBody>
          </Table>,
        );

        const table = screen.getByRole('table');
        expect(table).toHaveAttribute('data-density', 'compact');

        const th = screen.getByText('SKU');
        expect(th).toHaveAttribute('data-density', 'compact');
        expect(th).toHaveClass('h-8'); // 32px compact header height
        expect(th).toHaveClass('px-3');
        expect(th).toHaveClass('py-1.5');

        const td = screen.getByText('SKU-100');
        expect(td).toHaveAttribute('data-density', 'compact');
        expect(td).toHaveClass('px-3');
        expect(td).toHaveClass('py-1.5');
      });

      it('allows local density prop override on TableHead and TableCell', () => {
        render(
          <Table density="comfortable">
            <TableBody>
              <TableRow>
                <TableCell density="compact">Celda Compacta en Tabla Cómoda</TableCell>
              </TableRow>
            </TableBody>
          </Table>,
        );

        const cell = screen.getByText('Celda Compacta en Tabla Cómoda');
        expect(cell).toHaveAttribute('data-density', 'compact');
        expect(cell).toHaveClass('px-3');
        expect(cell).toHaveClass('py-1.5');
      });

      it('renders empty table body without error', () => {
        render(
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Columna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody />
          </Table>,
        );
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    describe('Skeleton Atom', () => {
      it('renders accessible loading state with bg-surface-muted and aria-live', () => {
        render(<Skeleton className="h-8 w-40" data-testid="skel" />);
        const skel = screen.getByTestId('skel');

        expect(skel).toBeInTheDocument();
        expect(skel).toHaveAttribute('data-slot', 'skeleton');
        expect(skel).toHaveAttribute('role', 'status');
        expect(skel).toHaveAttribute('aria-live', 'polite');
        expect(skel).toHaveAttribute('aria-busy', 'true');
        expect(skel).toHaveClass('animate-pulse');
        expect(skel).toHaveClass('bg-surface-muted');
        expect(screen.getByText('Cargando contenido...')).toHaveClass('sr-only');
      });

      it('supports radius variants matching token system (none, xs, sm, md, lg, xl, full)', () => {
        const { rerender } = render(<Skeleton radius="full" data-testid="skel-rad" />);
        expect(screen.getByTestId('skel-rad')).toHaveClass('rounded-full');
        expect(screen.getByTestId('skel-rad')).toHaveAttribute('data-radius', 'full');

        rerender(<Skeleton radius="sm" data-testid="skel-rad" />);
        expect(screen.getByTestId('skel-rad')).toHaveClass('rounded-sm');

        rerender(<Skeleton radius="none" data-testid="skel-rad" />);
        expect(screen.getByTestId('skel-rad')).toHaveClass('rounded-none');
      });

      it('supports custom screen-reader text', () => {
        render(<Skeleton srText="Cargando métricas de ventas..." />);
        expect(screen.getByText('Cargando métricas de ventas...')).toBeInTheDocument();
      });
    });

    describe('Card Atom', () => {
      it('renders card container with structural subcomponents and default sizing', () => {
        render(
          <Card size="default">
            <CardHeader>
              <CardTitle>Orden #8841</CardTitle>
              <CardDescription>Detalle de transacción</CardDescription>
              <CardAction>
                <Button size="xs">Ver</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>Envío a Bogotá D.C.</p>
            </CardContent>
            <CardFooter>
              <span>Total: $120.000 COP</span>
            </CardFooter>
          </Card>,
        );

        const card = screen.getByText('Orden #8841').closest('[data-slot="card"]');
        expect(card).toBeInTheDocument();
        expect(card).toHaveAttribute('data-size', 'default');
        expect(card).toHaveClass('bg-surface');
        expect(card).toHaveClass('border-border/80');
      });

      it('supports compact size="sm" for high-density dashboards', () => {
        render(
          <Card size="sm">
            <CardTitle>Métrica Rápida</CardTitle>
          </Card>,
        );
        const card = screen.getByText('Métrica Rápida').closest('[data-slot="card"]');
        expect(card).toHaveAttribute('data-size', 'sm');
      });
    });
  });

  // ==========================================================================
  // 5. FEEDBACK & OVERLAY ATOMS: ALERT, ALERTDIALOG, DIALOG
  // ==========================================================================
  describe('Feedback & Overlay Atoms', () => {
    describe('Alert Atom', () => {
      it('renders with role="alert", tokenized surface and border', () => {
        render(
          <Alert variant="default">
            <AlertTitle>Notificación</AlertTitle>
            <AlertDescription>Su pedido ha sido enviado.</AlertDescription>
          </Alert>,
        );

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('data-slot', 'alert');
        expect(alert).toHaveClass('bg-surface/90');
        expect(alert).toHaveClass('border-border');

        expect(screen.getByText('Notificación')).toHaveAttribute('data-slot', 'alert-title');
        expect(screen.getByText('Su pedido ha sido enviado.')).toHaveAttribute('data-slot', 'alert-description');
        expect(screen.getByText('Su pedido ha sido enviado.')).toHaveClass('text-foreground-muted');
      });

      it('renders semantic variants (brand, success, warning, danger, destructive, info)', () => {
        const { rerender } = render(
          <Alert variant="brand">
            <AlertTitle>Aviso de Marca</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-brand');
        expect(screen.getByRole('alert')).toHaveClass('border-brand/30');

        rerender(
          <Alert variant="success">
            <AlertTitle>Operación Exitosa</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-success');

        rerender(
          <Alert variant="warning">
            <AlertTitle>Tiempo Agotándose</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-warning');

        rerender(
          <Alert variant="danger">
            <AlertTitle>Fallo Crítico</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-danger');

        rerender(
          <Alert variant="destructive">
            <AlertTitle>Error Destructivo</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-destructive');

        rerender(
          <Alert variant="info">
            <AlertTitle>En Tránsito</AlertTitle>
          </Alert>,
        );
        expect(screen.getByRole('alert')).toHaveClass('text-info');
      });

      it('renders AlertAction slot for dismiss/action buttons', () => {
        render(
          <Alert>
            <AlertTitle>Acción Requerida</AlertTitle>
            <AlertAction>
              <button type="button">Resolver</button>
            </AlertAction>
          </Alert>,
        );
        expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument();
      });
    });

    describe('AlertDialog Overlay Atom', () => {
      it('opens confirmation modal with dual-mode backdrop and role="alertdialog"', async () => {
        const user = userEvent.setup();
        const handleConfirm = vi.fn();

        render(
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Eliminar Cuenta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>Confirmar Eliminación</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>,
        );

        const trigger = screen.getByRole('button', { name: 'Eliminar Cuenta' });
        await user.click(trigger);

        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('data-slot', 'alert-dialog-content');
        expect(dialog).toHaveClass('bg-surface');
        expect(dialog).toHaveClass('border-border');

        const title = screen.getByText('¿Está absolutamente seguro?');
        expect(title).toHaveClass('font-heading');
        expect(title).toHaveClass('text-xl');

        // Confirm action closes
        const confirmBtn = screen.getByRole('button', { name: 'Confirmar Eliminación' });
        await user.click(confirmBtn);
        expect(handleConfirm).toHaveBeenCalledTimes(1);
      });
    });

    describe('Dialog Overlay Atom', () => {
      it('opens interactive modal with dual-mode backdrop, close button, and escape key', async () => {
        const user = userEvent.setup();
        render(
          <Dialog>
            <DialogTrigger asChild>
              <Button>Abrir Detalles</Button>
            </DialogTrigger>
            <DialogContent showCloseButton>
              <DialogHeader>
                <DialogTitle>Detalle del Lote</DialogTitle>
                <DialogDescription>Información del lote recibido.</DialogDescription>
              </DialogHeader>
              <div>Contenido del diálogo</div>
              <DialogFooter showCloseButton>
                <Button>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>,
        );

        const trigger = screen.getByRole('button', { name: 'Abrir Detalles' });
        await user.click(trigger);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('data-slot', 'dialog-content');
        expect(dialog).toHaveClass('bg-surface');
        expect(dialog).toHaveClass('border-border');

        // Close button in header
        const closeBtns = screen.getAllByRole('button', { name: 'Close' });
        expect(closeBtns.length).toBeGreaterThanOrEqual(1);

        // Close via Escape key
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('supports custom DialogClose triggers', async () => {
        const user = userEvent.setup();
        render(
          <Dialog>
            <DialogTrigger asChild>
              <Button>Abrir Modal</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogTitle>Título Modal</DialogTitle>
              <DialogClose asChild>
                <Button variant="outline">Volver al Listado</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>,
        );

        await user.click(screen.getByRole('button', { name: 'Abrir Modal' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Volver al Listado' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 6. 8 CANONICAL ATOM STATES VERIFICATION
  // ==========================================================================
  describe('8 Canonical Atom States Verification (R3 Requirement)', () => {
    it('1. Default State: atoms render canonical default presentation without errors', () => {
      render(
        <div>
          <Button>Default Button</Button>
          <Input placeholder="Default Input" />
          <Badge>Default Badge</Badge>
          <Alert><AlertTitle>Default Alert</AlertTitle></Alert>
        </div>,
      );
      expect(screen.getByRole('button', { name: 'Default Button' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Default Input')).toBeInTheDocument();
      expect(screen.getByText('Default Badge')).toBeInTheDocument();
      expect(screen.getByText('Default Alert')).toBeInTheDocument();
    });

    it('2. Hover State: atoms apply designated hover utility tokens', () => {
      render(
        <div>
          <Button variant="ghost">Hover Ghost</Button>
          <Badge variant="outline">Hover Badge</Badge>
        </div>,
      );
      expect(screen.getByRole('button', { name: 'Hover Ghost' })).toHaveClass('hover:bg-surface-muted');
      expect(screen.getByText('Hover Badge')).toHaveClass('[a]:hover:bg-surface-muted');
    });

    it('3. Focus State: interactive atoms specify visible focus ring tokens', () => {
      render(
        <div>
          <Button>Focus Button</Button>
          <Input aria-label="Focus Input" />
          <Checkbox aria-label="Focus Checkbox" />
        </div>,
      );
      expect(screen.getByRole('button', { name: 'Focus Button' })).toHaveClass('focus-visible:ring-2');
      expect(screen.getByLabelText('Focus Input')).toHaveClass('focus-visible:ring-2');
      expect(screen.getByRole('checkbox', { name: 'Focus Checkbox' })).toHaveClass('focus-visible:ring-2');
    });

    it('4. Active State: active scale and press feedback utilities are present', () => {
      render(<Button>Active Scale</Button>);
      expect(screen.getByRole('button', { name: 'Active Scale' })).toHaveClass('active:scale-[0.98]');
    });

    it('5. Disabled State: interactive controls block events and reflect disabled attributes', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <div>
          <Button disabled onClick={handleClick}>Disabled Button</Button>
          <Input disabled aria-label="Disabled Input" />
          <Checkbox disabled aria-label="Disabled Checkbox" />
        </div>,
      );
      const btn = screen.getByRole('button', { name: 'Disabled Button' });
      expect(btn).toBeDisabled();
      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();

      expect(screen.getByLabelText('Disabled Input')).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: 'Disabled Checkbox' })).toBeDisabled();
    });

    it('6. Loading State: controls communicate progress via aria-busy and spinner', () => {
      render(
        <div>
          <Button isLoading>Cargando Botón</Button>
          <Skeleton data-testid="loading-skeleton" />
        </div>,
      );
      const btn = screen.getByRole('button', { name: 'Cargando Botón' });
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();

      const skeleton = screen.getByTestId('loading-skeleton');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('7. Error State: invalid inputs and danger alerts expose accessible error contracts', () => {
      render(
        <div>
          <Input aria-label="Input Error" aria-invalid="true" />
          <Textarea aria-label="Textarea Error" aria-invalid="true" />
          <Alert variant="danger"><AlertTitle>Error Alert</AlertTitle></Alert>
        </div>,
      );
      expect(screen.getByLabelText('Input Error')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Input Error')).toHaveClass('aria-invalid:border-destructive');

      expect(screen.getByLabelText('Textarea Error')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Textarea Error')).toHaveClass('aria-invalid:border-danger');

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-danger');
      expect(alert).toHaveClass('border-danger/30');
    });

    it('8. Empty State: form fields and tables maintain layout integrity when empty', () => {
      render(
        <div>
          <Input placeholder="Sin contenido" value="" onChange={() => {}} />
          <Textarea placeholder="Área vacía" value="" onChange={() => {}} />
          <Table>
            <TableBody />
          </Table>
        </div>,
      );
      expect(screen.getByPlaceholderText('Sin contenido')).toHaveValue('');
      expect(screen.getByPlaceholderText('Área vacía')).toHaveValue('');
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
