import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../domain';
import { ApiError } from '../../domain/models/ApiError';
import { RolNoAutorizadoError } from '../guards/routeGuards';
import { RouteErrorComponent } from '../routes/RouteErrorComponent';

describe('RouteErrorComponent (Frontend-Role-Modules §3)', () => {
  it('renderiza pantalla 403 ante RolNoAutorizadoError preservando mensaje explicativo', () => {
    const error = new RolNoAutorizadoError(UserRole.Administrator);
    const reset = vi.fn();

    render(<RouteErrorComponent error={error} reset={reset} info={{ componentStack: '' }} />);

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sección reservada' })).toBeInTheDocument();
    expect(
      screen.getByText('Esta sección está reservada al rol Administrator.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tu sesión sigue iniciada: sólo esta sección no corresponde a tu rol.'),
    ).toBeInTheDocument();

    const volverBtn = screen.getByRole('button', { name: 'Volver' });
    fireEvent.click(volverBtn);
    expect(reset).toHaveBeenCalledOnce();
  });

  it('renderiza pantalla 500 genérica ante excepción inesperada sin exponer detalles técnicos', () => {
    const error = new Error('Database connection failed with internal credentials');
    const reset = vi.fn();

    render(<RouteErrorComponent error={error} reset={reset} info={{ componentStack: '' }} />);

    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText(/No se pudo cargar esta sección/)).toBeInTheDocument();
    expect(screen.queryByText(/Database connection failed/)).not.toBeInTheDocument();

    const reintentarBtn = screen.getByRole('button', { name: 'Reintentar' });
    fireEvent.click(reintentarBtn);
    expect(reset).toHaveBeenCalledOnce();
  });

  it('incluye traceId de soporte cuando el error es un ApiError', () => {
    const error = new ApiError(500, 'Error de servidor', 'trace-xyz-987');
    const reset = vi.fn();

    render(<RouteErrorComponent error={error} reset={reset} info={{ componentStack: '' }} />);

    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText(/reporta la referencia trace-xyz-987/)).toBeInTheDocument();
  });
});
