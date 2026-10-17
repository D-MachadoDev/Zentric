import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../LoginPage';
import { RegisterBuyerPage } from '../RegisterBuyerPage';
import { HealthStatusPage } from '../HealthStatusPage';
import { appServices } from '../../../app/providers/appServices';
import { UserRole } from '../../../domain';

// Mock del router para navegación e inyección de search params
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

describe('Módulo de Autenticación y Salud (W4-S01-auth-module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = {};
    appServices.session.clear();
  });

  describe('LoginPage', () => {
    it('renderiza estructura Split-Frame, pilares normativos y formulario', () => {
      renderWithClient(<LoginPage />);

      expect(screen.getByText(/Control centralizado y transaccionalidad sin fricción/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Checkout Atómico/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Seguridad RG-01\/02/i)).toBeInTheDocument();
      expect(screen.getByText(/Facturación Split/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Entrar a la consola/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Acceder a la Consola/i })).toBeInTheDocument();
    });

    it('muestra aviso contextual cuando search.aviso es sin-sesion', () => {
      mockSearch = { aviso: 'sin-sesion' };
      renderWithClient(<LoginPage />);

      expect(screen.getByText(/Sesión Requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/Debe iniciar sesión para acceder/i)).toBeInTheDocument();
    });

    it('muestra aviso contextual cuando search.aviso es expirada', () => {
      mockSearch = { aviso: 'expirada' };
      renderWithClient(<LoginPage />);

      expect(screen.getByText(/Sesión Expirada/i)).toBeInTheDocument();
    });

    it('muestra aviso contextual cuando search.aviso es cuenta-creada', () => {
      mockSearch = { aviso: 'cuenta-creada' };
      renderWithClient(<LoginPage />);

      expect(screen.getByText(/Cuenta Creada Exitosamente/i)).toBeInTheDocument();
    });

    it('valida campos obligatorios en cliente sin invocar API si están vacíos', async () => {
      const loginSpy = vi.spyOn(appServices.api, 'login');
      renderWithClient(<LoginPage />);

      const submitBtn = screen.getByRole('button', { name: /Acceder a la Consola/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/El correo electrónico es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/La contraseña es obligatoria/i)).toBeInTheDocument();
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it('autentica exitosamente y navega a la ruta de rol (/buyer)', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-buyer-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'buyer@zentric.me',
        fullName: 'Comprador Demo',
        role: UserRole.Buyer,
      });

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'buyer@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/Contraseña/i), {
        target: { value: 'Secret123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Acceder a la Consola/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer' });
      });
    });

    it('muestra alerta de error cuando la API rechaza credenciales', async () => {
      vi.spyOn(appServices.api, 'login').mockRejectedValue(new Error('Credenciales inválidas o cuenta inactiva'));

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'wrong@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/Contraseña/i), {
        target: { value: 'BadPassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Acceder a la Consola/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Credenciales inválidas o cuenta inactiva/i)).toBeInTheDocument();
    });
  });

  describe('RegisterBuyerPage', () => {
    it('renderiza formulario de alta pública y beneficios de comprador', () => {
      renderWithClient(<RegisterBuyerPage />);

      expect(screen.getByText(/Compre con garantía de inventario y trazabilidad física/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Registro de Comprador/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Documento de Identidad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre y Apellidos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Contraseña/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirmar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear Cuenta de Comprador/i })).toBeInTheDocument();
    });

    it('valida coincidencia de contraseñas y requisitos mínimos limpiando errores al escribir', async () => {
      renderWithClient(<RegisterBuyerPage />);

      // Enviar vacío primero para mostrar todos los errores de campo
      fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta de Comprador/i }));
      expect(await screen.findByText(/El documento de identidad es obligatorio/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Documento de Identidad/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Nombre y Apellidos/i), {
        target: { value: 'Ana Gómez' },
      });
      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'ana@ejemplo.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i), {
        target: { value: 'Pass123' },
      });
      fireEvent.change(screen.getByLabelText(/Confirmar/i), {
        target: { value: 'PassMismatch' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta de Comprador/i }));

      expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
    });

    it('registra exitosamente un comprador y navega a /login con aviso', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createUser').mockResolvedValue('user-created-guid');

      renderWithClient(<RegisterBuyerPage />);

      fireEvent.change(screen.getByLabelText(/Documento de Identidad/i), {
        target: { value: '987654321' },
      });
      fireEvent.change(screen.getByLabelText(/Nombre y Apellidos/i), {
        target: { value: 'Carlos Ruiz' },
      });
      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'carlos@ejemplo.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i), {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.change(screen.getByLabelText(/Confirmar/i), {
        target: { value: 'ValidPassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta de Comprador/i }));

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          identityDocument: '987654321',
          fullName: 'Carlos Ruiz',
          email: 'carlos@ejemplo.com',
          password: 'ValidPassword123',
          role: UserRole.Buyer,
        });
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/login',
          search: { aviso: 'cuenta-creada' },
        });
      });
    });

    it('muestra alerta si el registro falla en la API', async () => {
      vi.spyOn(appServices.api, 'createUser').mockRejectedValue(new Error('El correo electrónico ya se encuentra registrado'));

      renderWithClient(<RegisterBuyerPage />);

      fireEvent.change(screen.getByLabelText(/Documento de Identidad/i), {
        target: { value: '987654321' },
      });
      fireEvent.change(screen.getByLabelText(/Nombre y Apellidos/i), {
        target: { value: 'Carlos Ruiz' },
      });
      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'duplicado@ejemplo.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i), {
        target: { value: 'ValidPassword123' },
      });
      fireEvent.change(screen.getByLabelText(/Confirmar/i), {
        target: { value: 'ValidPassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta de Comprador/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/El correo electrónico ya se encuentra registrado/i)).toBeInTheDocument();
    });
  });

  describe('HealthStatusPage', () => {
    it('muestra datos de telemetría y base de datos cuando la sonda responde', async () => {
      vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
        status: 'healthy',
        database: 'up',
        timestamp: '2026-10-17T02:00:00Z',
      });

      renderWithClient(<HealthStatusPage />);

      expect(await screen.findByText(/OPERACIONAL \(HEALTHY\)/i)).toBeInTheDocument();
      expect(screen.getByText(/CONECTADO \(UP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/API Core v1.1.0/i)).toBeInTheDocument();
      expect(screen.getByText(/PostgreSQL 16/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^Actualizar$/i }));
    });

    it('muestra alerta descriptiva cuando la sonda técnica falla', async () => {
      vi.spyOn(appServices.api, 'getHealth').mockRejectedValue(new Error('Servicio temporalmente fuera de línea'));

      renderWithClient(<HealthStatusPage />);

      expect(await screen.findByText(/Fallo de Conexión con la API/i)).toBeInTheDocument();
      expect(screen.getByText(/Servicio temporalmente fuera de línea/i)).toBeInTheDocument();
    });

    it('muestra insignias para estados degradado y base de datos desconectada', async () => {
      vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
        status: 'degraded',
        database: 'down',
        timestamp: '2026-10-17T02:00:00Z',
      });

      renderWithClient(<HealthStatusPage />);

      expect(await screen.findByText(/DEGRADADO \(DEGRADED\)/i)).toBeInTheDocument();
      expect(screen.getByText(/DESCONECTADO \(DOWN\)/i)).toBeInTheDocument();
    });

    it('muestra insignia de fuera de línea cuando el estado no es saludable ni degradado', async () => {
      vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
        status: 'unhealthy' as never,
        database: 'down',
        timestamp: new Date().toISOString(),
      });

      renderWithClient(<HealthStatusPage />);

      expect(await screen.findByText(/FUERA DE LÍNEA \(UNHEALTHY\)/i)).toBeInTheDocument();
    });
  });
});

