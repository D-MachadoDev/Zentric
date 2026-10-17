import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Alert, AlertDescription, AlertTitle } from './alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Checkbox } from './checkbox';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { MoneyAmount } from './money-amount';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { Skeleton } from './skeleton';
import { Toaster } from './sonner';
import { StateView } from './state-view';
import { StatusBadge } from './status-badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Textarea } from './textarea';

// Test de humo de los 13 componentes shadcn instalados en Q14.
// No replican la logica de Radix: prueban que montan, que exponen sus roles
// accesibles y que la variante aplicada llega al DOM. Si uno de estos falla,
// el componente esta roto o sus tokens no resuelven.

describe('Button', () => {
  it('renderiza y dispara onClick', async () => {
    let clicks = 0;
    render(<Button onClick={() => (clicks += 1)}>Guardar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(clicks).toBe(1);
  });

  it('expone la variante default (cian de marca) en su clase', () => {
    render(<Button>Accion</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('no es clicable cuando esta deshabilitado', async () => {
    let clicks = 0;
    render(
      <Button disabled onClick={() => (clicks += 1)}>
        Bloqueado
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Bloqueado' }));
    expect(clicks).toBe(0);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Input y Textarea', () => {
  it('Input es un campo de texto editable', async () => {
    render(<Input aria-label="Correo" />);
    const field = screen.getByLabelText('Correo');
    await userEvent.type(field, 'comprador@zentric.co');
    expect(field).toHaveValue('comprador@zentric.co');
  });

  it('Textarea es multilina', async () => {
    render(<Textarea aria-label="Notas" />);
    const field = screen.getByLabelText('Notas');
    await userEvent.type(field, 'linea uno');
    expect(field).toHaveValue('linea uno');
  });
});

describe('Checkbox y Label', () => {
  it('Checkbox alterna su estado al activarse', async () => {
    render(<Checkbox aria-label="Solo publicados" />);
    const box = screen.getByRole('checkbox', { name: 'Solo publicados' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(box).toBeChecked();
  });

  it('Label asocia su texto con el control', () => {
    render(
      <>
        <Label htmlFor="campo">Bodega</Label>
        <Input id="campo" />
      </>,
    );
    expect(screen.getByLabelText('Bodega')).toBeInTheDocument();
  });
});

describe('Card, Badge, Skeleton', () => {
  it('Card compone titulo y contenido', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Producto</CardTitle>
        </CardHeader>
        <CardContent>Contenido</CardContent>
      </Card>,
    );
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('Badge muestra el texto de estado', () => {
    render(<Badge>Confirmado</Badge>);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('es un bloque que ocupa espacio sin salto de layout (seccion 3)', () => {
    // La spec no exige aria-hidden en Skeleton; su responsabilidad declarada es
    // que la estructura sea visible antes del contenido real. Se comprueba que
    // renderiza un bloque con la animacion de pulso, que es lo que reserva el
    // espacio. No se inventa un atributo ARIA que la spec no pide.
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const skel = container.firstChild as HTMLElement;
    expect(skel.tagName).toBe('DIV');
    expect(skel).toHaveClass('animate-pulse');
    expect(skel).toHaveClass('bg-muted');
  });
});

describe('Alert', () => {
  it('expone titulo y descripcion para lectores', () => {
    render(
      <Alert>
        <AlertTitle>Error de stock</AlertTitle>
        <AlertDescription>La bodega no tiene existencias.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByText('Error de stock')).toBeInTheDocument();
    expect(screen.getByText('La bodega no tiene existencias.')).toBeInTheDocument();
  });
});

describe('Table', () => {
  it('renderiza cabeceras, pie, caption y filas densas', () => {
    render(
      <Table>
        <TableCaption>Listado de existencias</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Teclado</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const grid = screen.getByRole('table');
    expect(within(grid).getByRole('columnheader', { name: 'Producto' })).toBeInTheDocument();
    expect(within(grid).getByRole('cell', { name: 'Teclado' })).toBeInTheDocument();
    expect(within(grid).getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Listado de existencias')).toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('abre y muestra su contenido accesible', async () => {
    render(
      <Dialog>
        <DialogTrigger>Ajustar inventario</DialogTrigger>
        <DialogContent>
          <DialogTitle>Ajuste manual</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole('button', { name: 'Ajustar inventario' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Ajuste manual')).toBeInTheDocument();
  });
});

describe('AlertDialog', () => {
  it('abre y anuncia su titulo, descripcion, media y acciones como dialogo modal', async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Eliminar pedido</AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>!</AlertDialogMedia>
            <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
            <AlertDialogDescription>Esta accion es irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar pedido' }));
    // AlertDialog expone role="alertdialog" para distinguirlo de Dialog.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar eliminacion')).toBeInTheDocument();
    expect(screen.getByText('Esta accion es irreversible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('abre y selecciona una opcion con grupo, etiqueta y separador', async () => {
    render(
      <Select>
        <SelectTrigger aria-label="Moneda" size="sm">
          <SelectValue placeholder="Elegir" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            <SelectLabel>Divisas</SelectLabel>
            <SelectItem value="COP">COP</SelectItem>
            <SelectSeparator />
            <SelectItem value="USD">USD</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Moneda' }));
    expect(screen.getByText('Divisas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'COP' }));
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('COP');
  });
});

describe('StatusBadge y Toaster', () => {
  it('muestra el texto de estado, que es su único portador de significado (§5)', () => {
    render(<StatusBadge tone="success">Pagado</StatusBadge>);
    // §5: el color nunca puede ser el único indicador, así que el texto es
    // obligatorio y el punto va sólo como refuerzo (aria-hidden).
    const insignia = screen.getByText('Pagado');
    expect(insignia).toBeInTheDocument();
    expect(insignia.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('expone el tono aplicado y tono neutral por defecto', () => {
    render(
      <>
        <StatusBadge tone="danger">Reembolsada</StatusBadge>
        <StatusBadge>Borrador</StatusBadge>
        <Toaster />
      </>,
    );
    expect(screen.getByText('Reembolsada')).toHaveAttribute('data-tone', 'danger');
    expect(screen.getByText('Borrador')).toHaveAttribute('data-tone', 'neutral');
  });
});

describe('MoneyAmount', () => {
  it('formatea con la moneda que devuelve el servidor, en mono', () => {
    render(<MoneyAmount amount={1500} currency="COP" />);
    const node = screen.getByText(/1\.500/);
    expect(node).toHaveClass('font-mono');
    expect(node).toHaveAttribute('data-currency', 'COP');
  });

  it('no se rompe con un código de moneda que Intl no reconoce', () => {
    // Un código MAL formado ('CO') lanza RangeError en Intl; el servidor nunca
    // debería mandarlo, pero un valor inesperado debe verse, no tumbar la pantalla.
    render(<MoneyAmount amount={10} currency="CO" />);
    expect(screen.getByText('10.00 CO')).toBeInTheDocument();
  });
});

describe('StateView', () => {
  it('el vacío se anuncia como estado y ofrece la acción siguiente (§4)', () => {
    render(
      <StateView
        title="Todavía no hay bodegas registradas."
        description="Registrar la primera bodega para poder asignarle inventario."
        action={{ label: 'Registrar bodega', onClick: () => undefined }}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar bodega' })).toBeInTheDocument();
  });

  it('el error usa role="alert" y su acción es el reintento', () => {
    let retries = 0;
    render(
      <StateView
        tone="error"
        title="No se pudo cargar."
        action={{ label: 'Reintentar', onClick: () => (retries += 1) }}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retries).toBe(1);
  });
});
