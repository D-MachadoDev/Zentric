import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../LoginPage';
import { CorporateLoginPage } from '../CorporateLoginPage';
import { RegisterBuyerPage } from '../RegisterBuyerPage';
import { appServices } from '../../../app/providers/appServices';
import { UserRole } from '../../../core';

// Mock del enrutador de TanStack Router
const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-testid={`link-to-${to}`}>
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

describe('Segmentación de Fronteras de Acceso y PasswordInput (Boundary Enforcement)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = {};
    appServices.session.clear();
  });

  describe('1. PasswordInput Accesible (WCAG 2.2 AA)', () => {
    it('1.1 conmuta la visibilidad de la contraseña y actualiza sus atributos accesibles aria-label y aria-pressed', () => {
      renderWithClient(<LoginPage />);

      const passwordInput = screen.getByLabelText(/^Contraseña$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByRole('button', { name: /Mostrar contraseña/i });
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // Click para mostrar contraseña
      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(toggleButton).toHaveAttribute('aria-label', 'Ocultar contraseña');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

      // Click para ocultar contraseña de nuevo
      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'Mostrar contraseña');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('2. Boundary Enforcement en LoginPage (Portal Compradores)', () => {
    it('2.1 intercepta credenciales de Vendedor y muestra la tarjeta BoundaryNoticeCard sin navegar a /buyer', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'seller-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'seller-uuid-1234',
        email: 'vendedor@zentric.local',
        fullName: 'Comercial Andina S.A.S.',
        role: UserRole.Seller,
      });

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'vendedor@zentric.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'SellerPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      // Se debe interceptar: NO navegar a /buyer ni a /seller
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      // Debe aparecer la tarjeta de frontera
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Frontera de Acceso/i)).toBeInTheDocument();
      expect(screen.getByText(/Cuenta de Vendedor detectada/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Ir a la Consola Corporativa/i }),
      ).toBeInTheDocument();
    });

    it('2.2 permite saltar a /acceso-corporativo en 1 clic desde la tarjeta de frontera de LoginPage', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'admin-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'admin-uuid-1234',
        email: 'admin@zentric.local',
        fullName: 'Super Admin',
        role: UserRole.Administrator,
      });

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'admin@zentric.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'AdminPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      const jumpButton = await screen.findByRole('button', {
        name: /Ir a la Consola Corporativa/i,
      });
      fireEvent.click(jumpButton);

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/acceso-corporativo' });
    });

    it('2.3 permite descartar el aviso de frontera en LoginPage y reintentar con otra cuenta', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'seller-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'seller-uuid-1234',
        email: 'vendedor@zentric.local',
        fullName: 'Comercial Andina S.A.S.',
        role: UserRole.Seller,
      });

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'vendedor@zentric.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'SellerPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      const dismissButton = await screen.findByRole('button', {
        name: /Cerrar aviso de frontera/i,
      });
      fireEvent.click(dismissButton);

      // El aviso debe desaparecer
      expect(screen.queryByText(/Frontera de Acceso/i)).not.toBeInTheDocument();
    });

    it('2.4 traduce errores técnicos en inglés ("Invalid email or password.") a mensaje cortés en español en LoginPage', async () => {
      vi.spyOn(appServices.api, 'login').mockRejectedValue(new Error('Invalid email or password.'));

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'buyer@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'WrongPass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      // Debe mostrar el error en español y jamás en inglés
      expect(await screen.findByText('El correo o la contraseña no son correctos.')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid email or password/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Boundary Enforcement en CorporateLoginPage (Portal Operativo / B2B)', () => {
    it('3.1 intercepta credenciales de Comprador y muestra BoundaryNoticeCard bloqueando el acceso corporativo', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'buyer-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'buyer-uuid-1234',
        email: 'comprador@zentric.me',
        fullName: 'Juan Comprador',
        role: UserRole.Buyer,
      });

      renderWithClient(<CorporateLoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Institucional/i), {
        target: { value: 'comprador@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'BuyerPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Entrar como/i }));

      // NO debe navegar al panel corporativo ni a /buyer
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      // Debe renderizar la tarjeta de aviso de frontera para comprador
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Frontera de Acceso/i)).toBeInTheDocument();
      expect(screen.getByText(/Cuenta de Comprador detectada/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Ir al Portal de Compradores/i }),
      ).toBeInTheDocument();
    });

    it('3.2 permite saltar a /login en 1 clic desde la tarjeta de frontera de CorporateLoginPage', async () => {
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'buyer-jwt-token',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'buyer-uuid-1234',
        email: 'comprador@zentric.me',
        fullName: 'Juan Comprador',
        role: UserRole.Buyer,
      });

      renderWithClient(<CorporateLoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Institucional/i), {
        target: { value: 'comprador@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'BuyerPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Entrar como/i }));

      const jumpButton = await screen.findByRole('button', {
        name: /Ir al Portal de Compradores/i,
      });
      fireEvent.click(jumpButton);

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });

    it('3.3 traduce errores técnicos en inglés ("Invalid email or password.") a mensaje cortés en español', async () => {
      vi.spyOn(appServices.api, 'login').mockRejectedValue(new Error('Invalid email or password.'));

      renderWithClient(<CorporateLoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Institucional/i), {
        target: { value: 'seller@zentric.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'WrongPass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Entrar como/i }));

      // Debe mostrar el error en español y jamás en inglés
      expect(await screen.findByText('El correo o la contraseña no son correctos.')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid email or password/i)).not.toBeInTheDocument();
    });

    it('3.4 mantiene etiquetas uniformes de Términos y botones al conmutar entre Vendedor y Logística', () => {
      renderWithClient(<CorporateLoginPage />);

      expect(screen.getByText(/Términos de Operación \(Vendedor\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Entrar como Vendedor/i })).toBeInTheDocument();

      // Cambiar a pestaña de Logística
      fireEvent.click(screen.getByRole('tab', { name: /Logística/i }));

      expect(screen.getByText(/Términos de Operación \(Logística\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Entrar como Logística/i })).toBeInTheDocument();
    });
  });

  describe('4. RegisterBuyerPage con PasswordInput Independiente', () => {
    it('4.1 permite alternar la visibilidad de forma independiente en contraseña y confirmación', () => {
      renderWithClient(<RegisterBuyerPage />);

      const passwordInput = screen.getByLabelText(/^Contraseña$/i);
      const confirmInput = screen.getByLabelText(/^Confirmar$/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('type', 'password');

      // Se obtienen los dos botones de toggle
      const toggleButtons = screen.getAllByRole('button', { name: /Mostrar contraseña/i });
      expect(toggleButtons).toHaveLength(2);

      // Conmutar el primer toggle (contraseña)
      fireEvent.click(toggleButtons[0]!);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(confirmInput).toHaveAttribute('type', 'password');

      // Conmutar el segundo toggle (confirmación)
      fireEvent.click(toggleButtons[1]!);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(confirmInput).toHaveAttribute('type', 'text');
    });
  });
});
