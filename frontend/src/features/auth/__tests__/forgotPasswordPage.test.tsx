import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

// Mock del router
const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to} data-testid={`link-to-${to}`}>
      {children}
    </a>
  ),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Pantalla de Recuperación de Contraseña (ForgotPasswordPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = {};
  });

  it('1. renderiza la tarjeta Polaris con título, input de correo y botón de acción', () => {
    renderWithClient(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: /Recuperar contraseña/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar instrucciones/i })).toBeInTheDocument();
    expect(screen.getByText(/¿Recordaste tu contraseña\?/i)).toBeInTheDocument();
  });

  it('2. valida formato de correo con Zod y muestra error sin llamar a la API si el correo es inválido', async () => {
    const mockSubmit = vi.fn();
    renderWithClient(<ForgotPasswordPage onSubmitRequest={mockSubmit} />);

    const input = screen.getByLabelText(/Correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /Enviar instrucciones/i });

    // Enviar con campo vacío
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();

    // Enviar con texto que no es email
    fireEvent.change(input, { target: { value: 'correo-invalido' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('3. envía solicitud exitosamente y transiciona a la vista de confirmación con el email enviado', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<ForgotPasswordPage onSubmitRequest={mockSubmit} />);

    const input = screen.getByLabelText(/Correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /Enviar instrucciones/i });

    fireEvent.change(input, { target: { value: 'buyer@zentric.local' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('buyer@zentric.local');
      expect(screen.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeInTheDocument();
      expect(screen.getByText('buyer@zentric.local')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Volver a iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it('4. el botón de reintento "¿No recibiste el correo?" resetea la pantalla y permite reintentar el envío limpiamente', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<ForgotPasswordPage onSubmitRequest={mockSubmit} />);

    const input = screen.getByLabelText(/Correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /Enviar instrucciones/i });

    // Primer intento
    fireEvent.change(input, { target: { value: 'primer-intento@zentric.local' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeInTheDocument();
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);

    // Clic en reintentar: "¿No recibiste el correo? Intentar con otra dirección"
    const retryBtn = screen.getByRole('button', { name: /¿No recibiste el correo\? Intentar con otra dirección/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);

    // Verifica que la pantalla regresó al formulario inicial
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Recuperar contraseña/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo electrónico/i)).toHaveValue('');
    });

    // Segundo intento (reintento con otra dirección)
    const newInput = screen.getByLabelText(/Correo electrónico/i);
    const newSubmitBtn = screen.getByRole('button', { name: /Enviar instrucciones/i });

    fireEvent.change(newInput, { target: { value: 'segundo-intento@zentric.local' } });
    fireEvent.click(newSubmitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(2);
      expect(mockSubmit).toHaveBeenLastCalledWith('segundo-intento@zentric.local');
      expect(screen.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeInTheDocument();
      expect(screen.getByText('segundo-intento@zentric.local')).toBeInTheDocument();
    });
  });

  it('5. muestra alerta de error accesible cuando la API rechaza la solicitud', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error('Servicio temporalmente no disponible'));
    renderWithClient(<ForgotPasswordPage onSubmitRequest={mockSubmit} />);

    const input = screen.getByLabelText(/Correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /Enviar instrucciones/i });

    fireEvent.change(input, { target: { value: 'buyer@zentric.local' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Servicio temporalmente no disponible/i);
    });
  });
});
