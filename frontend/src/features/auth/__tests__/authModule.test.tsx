import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage, sanitizeRedirect } from '../LoginPage';
import { CorporateLoginPage } from '../CorporateLoginPage';
import { RegisterBuyerPage } from '../RegisterBuyerPage';
import { HealthStatusPage } from '../HealthStatusPage';
import { appServices } from '../../../app/providers/appServices';
import { UserRole } from '../../../core';
import type { HttpClient, FavoriteItem } from '../../../core';
import {
  saveGuestCartItems,
  setPendingGuestCheckout,
  clearGuestCart,
  getGuestCartItems,
  hasPendingGuestCheckout,
} from '../../buyer/guestCart';
import { addFavorite, getWishlistCount, clearWishlist } from '../../buyer/wishlistStorage';

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
    clearGuestCart();
    clearWishlist();
  });

  describe('LoginPage', () => {
    it('renderiza estructura enfocada en el Comprador, diseño minimalista y formulario', () => {
      renderWithClient(<LoginPage />);

      expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Ingresa a tu cuenta para gestionar tus compras y pedidos/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Portal Corporativo/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Regístrate gratis/i })).toBeInTheDocument();
    });

    it('muestra aviso contextual cuando search.aviso es sin-sesion', () => {
      mockSearch = { aviso: 'sin-sesion' };
      renderWithClient(<LoginPage />);

      expect(screen.getByText(/Sesión Requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/Ingresa con tu cuenta para consultar/i)).toBeInTheDocument();
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

      const submitBtn = screen.getByRole('button', { name: /Continuar/i });
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
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer' });
      });
    });

    it('migra los favoritos de invitado al backend tras el login exitoso', async () => {
      addFavorite({ id: 'prod-fav-1', name: 'Favorito de Invitado', price: 1000 });

      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-buyer-jwt',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'buyer@zentric.me',
        fullName: 'Comprador Demo',
        role: UserRole.Buyer,
      });
      const addFavoriteSpy = vi
        .spyOn(appServices.api as HttpClient, 'addFavorite')
        .mockResolvedValue({} as FavoriteItem);

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'buyer@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer' });
      });

      expect(addFavoriteSpy).toHaveBeenCalledWith('prod-fav-1');
      expect(getWishlistCount()).toBe(0);
    });

    it('muestra alerta de error cuando la API rechaza credenciales', async () => {
      vi.spyOn(appServices.api, 'login').mockRejectedValue(
        new Error('Credenciales inválidas o cuenta inactiva'),
      );

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'wrong@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'BadPassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Credenciales inválidas o cuenta inactiva/i)).toBeInTheDocument();
    });

    it('muestra la cláusula legal con enlaces a términos y privacidad sin casillas bloqueantes', () => {
      renderWithClient(<LoginPage />);

      expect(
        screen.getByText(/Al continuar, aceptas nuestros/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Términos de Servicio/i })).toHaveAttribute(
        'href',
        '/terms',
      );
      expect(screen.getByRole('link', { name: /Política de Privacidad/i })).toHaveAttribute(
        'href',
        '/privacy',
      );
    });

    it('sanitiza rutas de redirección bloqueando open redirect y protocolos externos', () => {
      expect(sanitizeRedirect('/buyer/orders')).toBe('/buyer/orders');
      expect(sanitizeRedirect('/checkout/payment?step=2')).toBe('/checkout/payment?step=2');
      expect(sanitizeRedirect('//malicious.com')).toBeNull();
      expect(sanitizeRedirect('https://evil.com')).toBeNull();
      expect(sanitizeRedirect('javascript:alert(1)')).toBeNull();
      expect(sanitizeRedirect('\\malicious-unc')).toBeNull();
      expect(sanitizeRedirect(undefined)).toBeNull();
    });

    it('rechaza search.redirect inseguro y navega a la ruta de rol segura', async () => {
      mockSearch = { redirect: '//phishing-site.com/steal' };
      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-jwt',
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
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer' });
      });
    });

    it('preserva la sesión y navega a /buyer aun si la sincronización del carrito falla (Blocker D1)', async () => {
      saveGuestCartItems([
        {
          variantId: 'var-fail-1',
          productId: 'prod-fail-1',
          productName: 'Producto Prueba Falla',
          sku: 'SKU-FAIL',
          unitPrice: 150000,
          currency: 'COP',
          quantity: 2,
        },
      ]);

      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-buyer-jwt',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: '22222222-2222-2222-2222-222222222222',
        email: 'resilient@zentric.me',
        fullName: 'Comprador Resiliente',
        role: UserRole.Buyer,
      });

      // Simulamos falla de red o error 500 en sincronización de carrito
      vi.spyOn(appServices.api, 'createCart').mockRejectedValue(
        new Error('Network error: Gateway timeout sincronizando carrito'),
      );

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'resilient@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      // No debe mostrarse mensaje de error en la UI, el login debe continuar
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer' });
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      // El carrito local debe preservarse intacto tras la falla para evitar pérdida de datos
      expect(getGuestCartItems()).toHaveLength(1);
    });

    it('prioriza la navegación a /buyer/cart cuando hay checkout pendiente incluso con search.redirect (Blocker D2)', async () => {
      saveGuestCartItems([
        {
          variantId: 'var-pend-1',
          productId: 'prod-pend-1',
          productName: 'Producto Checkout Pendiente',
          sku: 'SKU-PEND',
          unitPrice: 85000,
          currency: 'COP',
          quantity: 1,
        },
      ]);
      setPendingGuestCheckout(true);
      mockSearch = { redirect: '/buyer/catalog' };

      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-buyer-jwt',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: '33333333-3333-3333-3333-333333333333',
        email: 'checkout@zentric.me',
        fullName: 'Comprador Pendiente',
        role: UserRole.Buyer,
      });
      vi.spyOn(appServices.api, 'createCart').mockResolvedValue('order-cart-guid');
      vi.spyOn(appServices.api, 'addCartItem').mockResolvedValue();
      vi.spyOn(appServices.api, 'checkoutOrder').mockResolvedValue();

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'checkout@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer/cart' });
      });
    });

    it('mantiene el flag de checkout pendiente si la sincronización falla permitiendo reintento (Blocker D2)', async () => {
      saveGuestCartItems([
        {
          variantId: 'var-retry-1',
          productId: 'prod-retry-1',
          productName: 'Producto Reintento',
          sku: 'SKU-RETRY',
          unitPrice: 50000,
          currency: 'COP',
          quantity: 1,
        },
      ]);
      setPendingGuestCheckout(true);

      vi.spyOn(appServices.api, 'login').mockResolvedValue({
        token: 'test-buyer-jwt',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        userId: '44444444-4444-4444-4444-444444444444',
        email: 'retry@zentric.me',
        fullName: 'Comprador Retry',
        role: UserRole.Buyer,
      });
      vi.spyOn(appServices.api, 'createCart').mockRejectedValue(new Error('Fallo temporal de base de datos'));

      renderWithClient(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'retry@zentric.me' },
      });
      fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer/cart' });
      });

      // El flag sigue activo para que el reintento en el carrito lo detecte
      expect(hasPendingGuestCheckout()).toBe(true);
    });
  });

  describe('CorporateLoginPage', () => {
    it('renderiza la consola ejecutiva adaptando la estación y controles al rol seleccionado', () => {
      renderWithClient(<CorporateLoginPage />);

      expect(
        screen.getByRole('heading', { name: /Consola de Socios · Seller Central/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Estación de gestión de catálogo, órdenes de venta y liquidaciones comerciales/i),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox').length).toBe(2);

      // Al seleccionar Logística, la estación activa cambia a su consola operativa
      fireEvent.click(screen.getByRole('tab', { name: /Logística/i }));
      expect(
        screen.getByRole('heading', { name: /Muelle & Centro de Operaciones/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Control de recepción, trazabilidad de despachos e inspección física de retornos/i),
      ).toBeInTheDocument();
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

