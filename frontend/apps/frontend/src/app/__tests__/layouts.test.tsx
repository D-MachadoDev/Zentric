import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserRole } from '../../domain';
import { AppQueryClientProvider } from '../providers/AppQueryClientProvider';
import { AuthProvider } from '../providers/AuthProvider';
import { appServices } from '../providers/appServices';
import { routerOptions } from '../routes/routerOptions';

function renderAppAt(path: string) {
  const router = createRouter({
    ...routerOptions,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(
    <AppQueryClientProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppQueryClientProvider>,
  );
}

function authAs(role: UserRole) {
  const user = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'test@zentric.ch',
    fullName: 'Operador Suizo',
    role,
  };
  appServices.session.setAccessToken('valid-jwt-token');
  appServices.session.setRole(role);
  appServices.session.setUserId('00000000-0000-0000-0000-000000000001');
  appServices.session.setUser(user);
  vi.spyOn(appServices.api, 'getCurrentUser').mockResolvedValue(user);
  vi.spyOn(appServices.api, 'currentUser').mockResolvedValue(user);
}

describe('Layouts de Rol y Componentes de Shell (C4-4-Codigo-React.md §2)', () => {
  beforeEach(() => {
    appServices.session.clear();
    vi.restoreAllMocks();
  });

  it('PublicLayout renderiza cabecera mínima, enlace a salud y pie suizo en /login', async () => {
    renderAppAt('/login');

    expect(await screen.findByText('Zentric Core')).toBeInTheDocument();
    expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
    expect(screen.getByText(/Consola Operativa Suiza/)).toBeInTheDocument();
  });

  it('AdminLayout se monta en /admin con sidebar y cabecera de Administración Central', async () => {
    authAs(UserRole.Administrator);
    renderAppAt('/admin');

    expect(await screen.findByText('Administración Central')).toBeInTheDocument();
    expect(screen.getAllByText('Panel General').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Directorio de Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Red de Bodegas')).toBeInTheDocument();
    expect(await screen.findByText('Operador Suizo')).toBeInTheDocument();
    expect(screen.getByText('test@zentric.ch')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('SellerLayout se monta en /seller con sidebar y cabecera de Consola del Vendedor', async () => {
    authAs(UserRole.Seller);
    renderAppAt('/seller');

    expect(await screen.findByText('Consola del Vendedor')).toBeInTheDocument();
    expect(screen.getByText('Mis Productos')).toBeInTheDocument();
    expect(screen.getByText('Mi Inventario')).toBeInTheDocument();
    expect(screen.getByText('Cola de Despachos')).toBeInTheDocument();
  });

  it('BuyerLayout se monta en /buyer con navegación horizontal del comprador', async () => {
    authAs(UserRole.Buyer);
    renderAppAt('/buyer');

    expect(await screen.findByText('Portal de Compras')).toBeInTheDocument();
    expect(screen.getAllByText('Catálogo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carrito').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mis Pedidos').length).toBeGreaterThanOrEqual(1);
  });

  it('LogisticsLayout se monta en /logistics con cabecera de Operaciones Logísticas', async () => {
    authAs(UserRole.LogisticsOperator);
    renderAppAt('/logistics');

    expect(await screen.findByText('Operaciones Logísticas')).toBeInTheDocument();
    expect(screen.getByText('Inspección de Devoluciones')).toBeInTheDocument();
  });

  it('SupervisorLayout se monta en /supervisor con cabecera de Auditoría y Fiscalización', async () => {
    authAs(UserRole.Supervisor);
    renderAppAt('/supervisor');

    expect(await screen.findByText('Auditoría y Fiscalización')).toBeInTheDocument();
    expect(screen.getByText('Fiscalización General')).toBeInTheDocument();
    expect(screen.getByText('Libro Mayor Facturas')).toBeInTheDocument();
  });

  it('LayoutHeader ejecuta logout al hacer click en Salir', async () => {
    authAs(UserRole.Administrator);
    renderAppAt('/admin');

    const logoutBtn = await screen.findByLabelText('Cerrar sesión');
    expect(logoutBtn).toBeInTheDocument();

    const clearSpy = vi.spyOn(appServices.session, 'clear');
    fireEvent.click(logoutBtn);
    expect(clearSpy).toHaveBeenCalled();
  });

  it('LayoutSidebar opera en modo drawer móvil con backdrop y botón de cierre dentro del layout', async () => {
    authAs(UserRole.Administrator);
    renderAppAt('/admin');

    // Abre el menú lateral mediante el botón hamburguesa de LayoutHeader
    const menuBtn = await screen.findByLabelText('Alternar menú lateral');
    fireEvent.click(menuBtn);

    // Con el menú abierto, el backdrop móvil se monta
    const backdrop = screen.getByRole('presentation');
    expect(backdrop).toBeInTheDocument();

    // El botón de cierre móvil cierra el drawer
    const closeBtn = screen.getByLabelText('Cerrar navegación');
    fireEvent.click(closeBtn);

    // Al pulsar el botón de cierre, el backdrop se desmonta
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });
});
