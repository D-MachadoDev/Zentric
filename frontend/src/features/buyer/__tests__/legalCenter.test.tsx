import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LegalCenterPage } from '../LegalCenterPage';

// Mock de @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-testid={`link-to-${to}`}>
      {children}
    </a>
  ),
}));

describe('Centro Legal y Normativo Polaris (LegalCenterPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renderiza por defecto los Términos y Condiciones Generales y el índice lateral TOC', () => {
    render(<LegalCenterPage />);

    // Título y badge del documento activo por defecto
    expect(
      screen.getByRole('heading', {
        name: /Términos y Condiciones Generales de Uso del Marketplace/i,
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('active-doc-badge')).toHaveTextContent('Términos');

    // Índice lateral con los capítulos
    expect(screen.getByText(/Capítulos del contrato/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Índice de capítulos/i })).toBeInTheDocument();

    // Comprobar presencia de capítulos clave de términos en los encabezados h2
    expect(
      screen.getByRole('heading', {
        name: /Ámbito de Aplicación, Partes y Definiciones Contractuales/i,
        level: 2,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /Tarifas de Servicio, Custodia y Dispersión de Fondos/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('2. permite cambiar interactivamente a la Política de Privacidad al hacer clic en la pestaña', () => {
    render(<LegalCenterPage />);

    const privacyTab = screen.getByRole('button', { name: /Tratamiento de Datos/i });
    fireEvent.click(privacyTab);

    expect(
      screen.getByRole('heading', {
        name: /Política de Tratamiento de Datos Personales/i,
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('active-doc-badge')).toHaveTextContent('Privacidad');
    expect(
      screen.getByRole('heading', {
        name: /Categorías de Datos Objeto de Tratamiento y Exclusión de Datos Financieros/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('3. permite cambiar interactivamente a la Política de Cookies al hacer clic en la pestaña', () => {
    render(<LegalCenterPage />);

    const cookiesTab = screen.getByRole('button', { name: /^Cookies$/i });
    fireEvent.click(cookiesTab);

    expect(
      screen.getByRole('heading', {
        name: /Política de Cookies y Tecnologías de Almacenamiento Local/i,
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('active-doc-badge')).toHaveTextContent('Cookies');
    expect(
      screen.getByRole('heading', {
        name: /Cookies Técnicas Esenciales/i,
        level: 3,
      }),
    ).toBeInTheDocument();
  });

  it('4. permite cambiar interactivamente al Estatuto del Consumidor al hacer clic en la pestaña', () => {
    render(<LegalCenterPage />);

    const consumerTab = screen.getByRole('button', { name: /Estatuto del Consumidor/i });
    fireEvent.click(consumerTab);

    expect(
      screen.getByRole('heading', {
        name: /Régimen de Protección al Consumidor/i,
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('active-doc-badge')).toHaveTextContent('Consumidor');
    expect(
      screen.getByRole('heading', {
        name: /Mecanismo de Reversión del Pago/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('5. respeta el documento inicial provisto mediante la prop defaultTab', () => {
    render(<LegalCenterPage defaultTab="consumer" />);

    expect(
      screen.getByRole('heading', {
        name: /Régimen de Protección al Consumidor/i,
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('active-doc-badge')).toHaveTextContent('Consumidor');
  });

  it('6. filtra capítulos y cláusulas en tiempo real cuando el usuario escribe en el buscador', () => {
    render(<LegalCenterPage />);

    const searchInput = screen.getByPlaceholderText(/Buscar capítulo o término/i);

    // Búsqueda de un término específico: "Retracto"
    fireEvent.change(searchInput, { target: { value: 'Retracto' } });

    // El capítulo de retracto debe seguir visible
    expect(
      screen.getByRole('heading', {
        name: /Derecho de Retracto Legal y Reversión del Pago/i,
        level: 2,
      }),
    ).toBeInTheDocument();

    // Un capítulo que no contiene ese término debe quedar oculto
    expect(
      screen.queryByRole('heading', {
        name: /Ámbito de Aplicación, Partes y Definiciones Contractuales/i,
        level: 2,
      }),
    ).not.toBeInTheDocument();
  });

  it('7. muestra un aviso de cero resultados cuando el término buscado no coincide con ninguna cláusula', () => {
    render(<LegalCenterPage />);

    const searchInput = screen.getByPlaceholderText(/Buscar capítulo o término/i);
    fireEvent.change(searchInput, { target: { value: 'termino_inexistente_xyz_123' } });

    expect(screen.getByText(/No se encontraron cláusulas o capítulos/i)).toBeInTheDocument();
  });

  it('8. invoca window.print al hacer clic en el botón Imprimir PDF', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<LegalCenterPage />);

    const printButton = screen.getByRole('button', { name: /Imprimir PDF/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('9. incluye los datos regulatorios e institucionales de Colombia en la vista legal', () => {
    render(<LegalCenterPage />);

    expect(screen.getAllByText(/NIT 900.123.456-7/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ley 527 de 1999/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ley 1480 de 2011/i).length).toBeGreaterThanOrEqual(1);
  });
});
