import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AdminDashboardPage,
  UserListPage,
  CreateUserPage,
  WarehouseListPage,
  InventoryAdjustPage,
  RefundListPage,
  InvoiceManagementPage,
} from '../index';
import { appServices } from '../../../app/providers/appServices';
import type {
  User,
  Warehouse,
  OrderListItem,
  Invoice,
  Inventory,
  ReturnRequest,
  AdjustInventoryResult,
} from '../../../domain';
import {
  UserRole,
  WarehouseType,
  OrderStatus,
  InvoiceType,
  ReturnStatus,
} from '../../../domain';

// Mock del router de TanStack
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} data-testid={`link-to-${to}`}>
      {children}
    </a>
  ),
  useParams: () => ({ id: 'ful-1111' }),
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

const mockUsers: User[] = [
  {
    id: 'user-admin-1',
    name: 'Admin General',
    email: 'admin@zentric.com',
    role: UserRole.Administrator,
    identityDocument: '10000001',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-seller-1',
    name: 'Vendedor Computadores SAS',
    email: 'seller@computadores.com',
    role: UserRole.Seller,
    identityDocument: '900100200',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-logistics-1',
    name: 'Operador Logístico Central',
    email: 'logistics@zentric.com',
    role: UserRole.LogisticsOperator,
    identityDocument: '800500100',
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

const mockWarehouses: Warehouse[] = [
  {
    id: 'wh-central-1',
    name: 'Bodega Central Fontibón',
    location: 'Bogotá Fontibón Calle 26',
    capacity: 5000,
    type: WarehouseType.Marketplace,
    vendorId: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wh-vendor-1',
    name: 'Bodega Privada Vendedor',
    location: 'Medellín El Poblado',
    capacity: 1200,
    type: WarehouseType.Vendor,
    vendorId: 'user-seller-1',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const mockOrders: OrderListItem[] = [
  {
    id: 'order-1111-1111',
    status: OrderStatus.Paid,
    currency: 'COP',
    totalAmount: 500000,
    itemCount: 2,
    buyerId: 'buyer-1',
    items: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'order-2222-2222',
    status: OrderStatus.PendingPayment,
    currency: 'COP',
    totalAmount: 250000,
    itemCount: 1,
    buyerId: 'buyer-2',
    items: [],
    createdAt: new Date().toISOString(),
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 'inv-master-1',
    customerOrderId: 'order-1111-1111',
    vendorId: null,
    type: InvoiceType.Master,
    totalAmount: 500000,
    currency: 'COP',
    issuedAt: new Date().toISOString(),
  },
  {
    id: 'inv-zentric-1',
    customerOrderId: 'order-1111-1111',
    vendorId: null,
    type: InvoiceType.ZentricDetail,
    totalAmount: 25000,
    currency: 'COP',
    issuedAt: new Date().toISOString(),
  },
  {
    id: 'inv-vendor-1',
    customerOrderId: 'order-1111-1111',
    vendorId: 'user-seller-1',
    type: InvoiceType.VendorDetail,
    totalAmount: 475000,
    currency: 'COP',
    issuedAt: new Date().toISOString(),
  },
];

const mockInventories: Inventory[] = [
  {
    id: 'inv-pos-1',
    variantId: 'var-1111-1111',
    warehouseId: 'wh-central-1',
    availableQuantity: 100,
    reservedQuantity: 10,
    usedQuantity: 5,
    damagedQuantity: 2,
  },
  {
    id: 'inv-pos-2',
    variantId: 'var-2222-2222',
    warehouseId: 'wh-vendor-1',
    availableQuantity: 50,
    reservedQuantity: 0,
    usedQuantity: 0,
    damagedQuantity: 0,
  },
];

const mockReturns: ReturnRequest[] = [
  {
    id: 'ret-1111-1111',
    customerOrderId: 'order-1111-1111',
    variantId: 'var-1111-1111',
    warehouseId: 'wh-central-1',
    quantity: 1,
    status: ReturnStatus.Approved,
    isGoodCondition: true,
    vendorApproved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ret-2222-2222',
    customerOrderId: 'order-2222-2222',
    variantId: 'var-2222-2222',
    warehouseId: 'wh-vendor-1',
    quantity: 2,
    status: ReturnStatus.Refunded,
    isGoodCondition: true,
    vendorApproved: true,
    createdAt: new Date().toISOString(),
  },
];

describe('Módulo de Administración (Admin Module - W4-S04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(appServices.api, 'listUsers').mockResolvedValue(mockUsers);
    vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue(mockWarehouses);
    vi.spyOn(appServices.api, 'listOrders').mockResolvedValue(mockOrders);
    vi.spyOn(appServices.api, 'listInvoices').mockResolvedValue(mockInvoices);
    vi.spyOn(appServices.api, 'listInventories').mockResolvedValue(mockInventories);
    vi.spyOn(appServices.api, 'listReturns').mockResolvedValue(mockReturns);
    vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
      status: 'healthy',
      database: 'up',
      timestamp: new Date().toISOString(),
    });
  });

  // ── 1. AdminDashboardPage ─────────────────────────────────────────────
  describe('AdminDashboardPage', () => {
    it('renderiza KPIs consolidados, GMV facturado y actividad reciente', async () => {
      renderWithClient(<AdminDashboardPage />);

      expect(await screen.findByText('Centro de Mando')).toBeInTheDocument();
      expect(screen.queryByText('Root RBAC')).not.toBeInTheDocument();

      // Métricas principales — Hero KPI Strip
      expect(screen.getByText('GMV Facturado')).toBeInTheDocument();
      // MoneyAmount aparece 2 veces (hero + tabla); validamos que al menos una existe
      expect(screen.getAllByText('$ 500.000,00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Vendedores activos')).toBeInTheDocument();
      expect(screen.getByText('Bodegas operativas')).toBeInTheDocument();
      expect(screen.getByText('Pedidos en proceso')).toBeInTheDocument();

      // Actividad reciente en tabla
      expect(screen.getByText('Actividad Reciente de la Plataforma')).toBeInTheDocument();
      expect(screen.getByText('#order-11')).toBeInTheDocument();
    });

    it('renderiza mensaje cuando no hay pedidos y muestra alertas en caso de fallo', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'listUsers').mockRejectedValue(new Error('Fallo de usuarios'));

      renderWithClient(<AdminDashboardPage />);

      expect(await screen.findByText('Datos parcialmente no disponibles')).toBeInTheDocument();
      expect(screen.getByText('Sin pedidos registrados en la plataforma.')).toBeInTheDocument();
    });
  });

  // ── 2. UserListPage ───────────────────────────────────────────────────
  describe('UserListPage', () => {
    it('renderiza directorio con filtros y permite bloquear y reactivar usuarios', async () => {
      const blockSpy = vi.spyOn(appServices.api, 'blockUser').mockResolvedValue(undefined);
      const activateSpy = vi.spyOn(appServices.api, 'activateUser').mockResolvedValue(undefined);

      renderWithClient(<UserListPage />);

      expect(await screen.findByText('Directorio de Usuarios y Acceso RBAC')).toBeInTheDocument();
      expect(screen.getAllByText('Admin General').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Vendedor Computadores SAS')).toBeInTheDocument();

      // Seleccionar usuario activo y bloquearlo
      const activeUserRow = screen.getByText('Vendedor Computadores SAS');
      fireEvent.click(activeUserRow);

      const blockBtn = await screen.findByRole('button', { name: /Bloquear Acceso/i });
      fireEvent.click(blockBtn);

      await waitFor(() => {
        expect(blockSpy).toHaveBeenCalledWith('user-seller-1');
      });
      expect(await screen.findByText('Usuario bloqueado exitosamente.')).toBeInTheDocument();

      // Seleccionar usuario bloqueado y reactivarlo
      const blockedUserRow = screen.getByText('Operador Logístico Central');
      fireEvent.click(blockedUserRow);

      const activateBtn = await screen.findByRole('button', { name: /Reactivar Acceso/i });
      fireEvent.click(activateBtn);

      await waitFor(() => {
        expect(activateSpy).toHaveBeenCalledWith('user-logistics-1');
      });
      expect(await screen.findByText('Usuario reactivado exitosamente.')).toBeInTheDocument();
    });

    it('permite filtrar por rol, por estado y buscar por texto', async () => {
      renderWithClient(<UserListPage />);

      expect((await screen.findAllByText('Admin General')).length).toBeGreaterThanOrEqual(1);

      // Filtro por rol Seller
      const roleSelect = screen.getByLabelText(/Filtrar por rol de usuario/i);
      fireEvent.change(roleSelect, { target: { value: UserRole.Seller } });

      // Filtro por estado
      const statusSelect = await screen.findByLabelText(/Filtrar por estado de usuario/i);
      fireEvent.change(statusSelect, { target: { value: 'Active' } });

      // Búsqueda por texto
      const searchInput = await screen.findByPlaceholderText(/Buscar por nombre/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

      expect(screen.getByText('No se encontraron usuarios')).toBeInTheDocument();
    });

    it('muestra alerta de error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listUsers').mockRejectedValue(new Error('Fallo de directorio'));
      renderWithClient(<UserListPage />);

      expect(await screen.findByText('Error al consultar el directorio')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });

    it('muestra error si la mutación blockUser falla', async () => {
      vi.spyOn(appServices.api, 'blockUser').mockRejectedValue(new Error('No se puede bloquear el superadmin'));
      renderWithClient(<UserListPage />);

      const blockBtn = await screen.findByRole('button', { name: /Bloquear Acceso/i });
      fireEvent.click(blockBtn);

      expect(await screen.findByText('No se puede bloquear el superadmin')).toBeInTheDocument();
    });
  });

  // ── 3. CreateUserPage ─────────────────────────────────────────────────
  describe('CreateUserPage', () => {
    it('valida formulario y registra exitosamente un nuevo usuario', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createUser').mockResolvedValue('user-new-guid');
      renderWithClient(<CreateUserPage />);

      expect(await screen.findByText('Alta de Usuario en Plataforma')).toBeInTheDocument();

      // Completar campos
      fireEvent.change(screen.getByPlaceholderText(/1020304050/i), {
        target: { value: '55443322' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Carlos Vendedor/i), {
        target: { value: 'Nuevo Supervisor de Zona' },
      });
      fireEvent.change(screen.getByPlaceholderText(/usuario@empresa.com/i), {
        target: { value: 'supervisor@zentric.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Mínimo 6 caracteres/i), {
        target: { value: 'PasswordSeguro123!' },
      });
      fireEvent.change(screen.getByLabelText(/Seleccionar rol de usuario/i), {
        target: { value: UserRole.Supervisor },
      });

      const submitBtn = screen.getByRole('button', { name: /Crear Usuario/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          identityDocument: '55443322',
          fullName: 'Nuevo Supervisor de Zona',
          email: 'supervisor@zentric.com',
          password: 'PasswordSeguro123!',
          role: UserRole.Supervisor,
        });
      });

      expect(await screen.findByText('¡Usuario Registrado Exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('user-new-guid')).toBeInTheDocument();

      // Botón registrar otro
      const resetBtn = screen.getByRole('button', { name: /Registrar Otro Usuario/i });
      fireEvent.click(resetBtn);
      expect(screen.queryByText('¡Usuario Registrado Exitosamente!')).not.toBeInTheDocument();
    });

    it('muestra errores de validación cuando los campos requeridos están vacíos', async () => {
      renderWithClient(<CreateUserPage />);

      const submitBtn = await screen.findByRole('button', { name: /Crear Usuario/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('El documento de identidad es obligatorio')).toBeInTheDocument();
      expect(screen.getByText('El nombre completo es obligatorio')).toBeInTheDocument();
      expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    });

    it('muestra alerta si el servidor rechaza el alta', async () => {
      vi.spyOn(appServices.api, 'createUser').mockRejectedValue(new Error('El correo ya está registrado'));
      renderWithClient(<CreateUserPage />);

      fireEvent.change(screen.getByPlaceholderText(/1020304050/i), { target: { value: '11223344' } });
      fireEvent.change(screen.getByPlaceholderText(/Carlos Vendedor/i), { target: { value: 'Usuario Duplicado' } });
      fireEvent.change(screen.getByPlaceholderText(/usuario@empresa.com/i), { target: { value: 'duplicado@zentric.com' } });
      fireEvent.change(screen.getByPlaceholderText(/Mínimo 6 caracteres/i), { target: { value: '123456' } });

      const submitBtn = screen.getByRole('button', { name: /Crear Usuario/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('El correo ya está registrado')).toBeInTheDocument();
    });
  });

  // ── 4. WarehouseListPage ──────────────────────────────────────────────
  describe('WarehouseListPage', () => {
    it('renderiza bodegas con capacidades en m³ y registra una nueva bodega Marketplace', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createWarehouse').mockResolvedValue('wh-new-guid');
      renderWithClient(<WarehouseListPage />);

      expect(await screen.findByText('Red de Bodegas Físicas')).toBeInTheDocument();
      expect(screen.getByText('Bodega Central Fontibón')).toBeInTheDocument();
      expect(screen.getByText('Bodega Privada Vendedor')).toBeInTheDocument();

      // Completar formulario
      fireEvent.change(screen.getByPlaceholderText(/Bodega Central Fontibón/i), {
        target: { value: 'Bodega Norte Suba' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Calle 26/i), {
        target: { value: 'Bogotá Suba Cra 91 # 145-20' },
      });
      fireEvent.change(screen.getByDisplayValue('1000'), {
        target: { value: '3500' },
      });

      const submitBtn = screen.getByRole('button', { name: /Guardar Bodega/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          name: 'Bodega Norte Suba',
          location: 'Bogotá Suba Cra 91 # 145-20',
          capacity: 3500,
          type: WarehouseType.Marketplace,
          vendorId: null,
        });
      });

      expect(await screen.findByText(/Bodega creada exitosamente/i)).toBeInTheDocument();
    });

    it('exige vendorId cuando el tipo seleccionado es Vendor', async () => {
      renderWithClient(<WarehouseListPage />);

      const nameInput = await screen.findByPlaceholderText(/Bodega Central Fontibón/i);
      fireEvent.change(nameInput, {
        target: { value: 'Bodega Propia Vendedor Cali' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Calle 26/i), {
        target: { value: 'Cali Acopi Yumbo' },
      });
      fireEvent.change(screen.getByLabelText(/Seleccionar tipo de bodega/i), {
        target: { value: WarehouseType.Vendor },
      });

      const submitBtn = screen.getByRole('button', { name: /Guardar Bodega/i });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Una bodega Vendor necesita el vendedor dueño; una Marketplace no tiene dueño.')
      ).toBeInTheDocument();
    });

    it('permite filtrar por tipo y buscar por texto', async () => {
      renderWithClient(<WarehouseListPage />);

      expect(await screen.findByText('Bodega Central Fontibón')).toBeInTheDocument();

      const typeFilter = screen.getByLabelText(/Filtrar por tipo de bodega/i);
      fireEvent.change(typeFilter, { target: { value: WarehouseType.Vendor } });

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

      expect(screen.getByText('No se encontraron bodegas')).toBeInTheDocument();
    });

    it('muestra alerta de error y permite reintentar', async () => {
      vi.spyOn(appServices.api, 'listWarehouses').mockRejectedValue(new Error('Fallo de bodegas'));
      renderWithClient(<WarehouseListPage />);

      expect(await screen.findByText('Error al cargar la red de bodegas')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });

    it('maneja bodegas inactivas, cambio de tipo Vendor a Marketplace y errores de creación', async () => {
      vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([
        {
          id: 'wh-inactive-1',
          name: 'Bodega Inactiva Sur',
          location: 'Bogotá Sur',
          capacity: 500,
          type: WarehouseType.Marketplace,
          vendorId: null,
          isActive: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      vi.spyOn(appServices.api, 'createWarehouse').mockRejectedValue(new Error('Nombre de bodega duplicado'));

      renderWithClient(<WarehouseListPage />);

      expect(await screen.findByText('Bodega Inactiva Sur')).toBeInTheDocument();
      expect(screen.getByText('Inactiva')).toBeInTheDocument();

      // Enviar vacío para activar formErrors.name y formErrors.location
      const submitBtn = screen.getByRole('button', { name: /Guardar Bodega/i });
      fireEvent.click(submitBtn);

      // Cambiar a Vendor, escribir vendorId y volver a Marketplace
      const typeSelect = screen.getByLabelText(/Seleccionar tipo de bodega/i);
      fireEvent.change(typeSelect, { target: { value: WarehouseType.Vendor } });
      fireEvent.change(screen.getByPlaceholderText(/UUID del vendedor titular/i), {
        target: { value: '11111111-1111-4111-8111-111111111111' },
      });
      fireEvent.change(typeSelect, { target: { value: WarehouseType.Marketplace } });

      fireEvent.change(screen.getByPlaceholderText(/Bodega Central Fontibón/i), {
        target: { value: 'Bodega Fallida' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Calle 26/i), {
        target: { value: 'Dirección Válida 123' },
      });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Nombre de bodega duplicado')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));
    });
  });

  // ── 5. InventoryAdjustPage ────────────────────────────────────────────
  describe('InventoryAdjustPage', () => {
    it('permite seleccionar inventario y asentar ajuste por conteo físico (ADR-0021)', async () => {
      const mockResult: AdjustInventoryResult = {
        adjustmentId: 'adj-9999',
        inventoryId: 'inv-pos-1',
        previousAvailableQuantity: 100,
        newAvailableQuantity: 95,
        adjustedQuantity: -5,
        reason: 'Conteo físico trimestral merma detectada',
        countedAt: new Date().toISOString(),
      };

      const adjustSpy = vi.spyOn(appServices.api, 'adjustInventory').mockResolvedValue(mockResult);
      renderWithClient(<InventoryAdjustPage />);

      expect(await screen.findByText('Ajuste de Inventario por Conteo Físico')).toBeInTheDocument();
      expect(screen.getByText('ADR-0021')).toBeInTheDocument();

      // Seleccionar la primera posición de la lista derecha
      const invCard = screen.getByText(/100 Disp/i);
      fireEvent.click(invCard);

      // Modificar cantidad contada y motivo
      const qtyInput = screen.getByDisplayValue('100');
      fireEvent.change(qtyInput, { target: { value: '95' } });

      const reasonInput = screen.getByPlaceholderText(/Conteo físico trimestral/i);
      fireEvent.change(reasonInput, { target: { value: 'Conteo físico trimestral merma detectada' } });

      const submitBtn = screen.getByRole('button', { name: /Registrar Ajuste Físico/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(adjustSpy).toHaveBeenCalledWith('inv-pos-1', {
          countedQuantity: 95,
          reason: 'Conteo físico trimestral merma detectada',
        });
      });

      expect(await screen.findByText('Resultado del Ajuste (ADR-0021)')).toBeInTheDocument();
      expect(screen.getByText('95 unidades')).toBeInTheDocument();
    });

    it('valida campos requeridos antes de enviar y errores de esquema Zod', async () => {
      renderWithClient(<InventoryAdjustPage />);

      const submitBtn = await screen.findByRole('button', { name: /Registrar Ajuste Físico/i });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Debe seleccionar o especificar la posición de inventario a ajustar.')
      ).toBeInTheDocument();

      // Seleccionar inventario pero dejar motivo vacío para disparar validación Zod
      const invCard = screen.getByText(/100 Disp/i);
      fireEvent.click(invCard);
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/El motivo del ajuste físico es obligatorio/i)).toBeInTheDocument();
    });

    it('muestra alerta cuando falla la consulta de inventarios o la mutación adjustInventory', async () => {
      vi.spyOn(appServices.api, 'adjustInventory').mockRejectedValue(new Error('Conteo no puede ser negativo'));
      renderWithClient(<InventoryAdjustPage />);

      const invCard = await screen.findByText(/100 Disp/i);
      fireEvent.click(invCard);

      const reasonInput = screen.getByPlaceholderText(/Conteo físico trimestral/i);
      fireEvent.change(reasonInput, { target: { value: 'Ajuste de prueba' } });

      const submitBtn = screen.getByRole('button', { name: /Registrar Ajuste Físico/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Conteo no puede ser negativo')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));
    });

    it('muestra estado de error y permite reintentar cuando listInventories falla', async () => {
      vi.spyOn(appServices.api, 'listInventories').mockRejectedValue(new Error('Fallo de red inventarios'));
      renderWithClient(<InventoryAdjustPage />);

      expect(await screen.findByText('Error al cargar inventarios')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    });
  });

  // ── 6. RefundListPage ─────────────────────────────────────────────────
  describe('RefundListPage', () => {
    it('muestra devoluciones aprobadas, selecciona filas y permite acreditar o manejar fallo de reembolso', async () => {
      const refundSpy = vi.spyOn(appServices.api, 'refundReturn').mockResolvedValueOnce(undefined);
      renderWithClient(<RefundListPage />);

      expect(await screen.findByText('Reembolsos y Liquidación de Devoluciones')).toBeInTheDocument();
      const rowCell = screen.getByText('#ret-1111');
      fireEvent.click(rowCell);

      const refundBtn = screen.getByRole('button', { name: /Acreditar Reembolso/i });
      fireEvent.click(refundBtn);

      await waitFor(() => {
        expect(refundSpy).toHaveBeenCalledWith('ret-1111-1111');
      });

      expect(
        await screen.findByText('Reembolso financiero acreditado exitosamente al comprador.')
      ).toBeInTheDocument();

      // Simular fallo en reembolso
      refundSpy.mockRejectedValueOnce(new Error('Fallo bancario al reembolsar'));
      fireEvent.click(refundBtn);
      expect(await screen.findByText('Fallo bancario al reembolsar')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));
    });

    it('permite filtrar por estado y buscar por texto', async () => {
      renderWithClient(<RefundListPage />);

      expect(await screen.findByText('#ret-1111')).toBeInTheDocument();

      const filterSelect = screen.getByLabelText(/Filtrar por estado de devolución/i);
      fireEvent.change(filterSelect, { target: { value: 'All' } });
      fireEvent.change(filterSelect, { target: { value: ReturnStatus.Refunded } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID de devolución/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

      expect(screen.getByText('No hay devoluciones en este estado')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listReturns').mockRejectedValue(new Error('Fallo de devoluciones'));
      renderWithClient(<RefundListPage />);

      expect(await screen.findByText('Error al cargar devoluciones')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });

    it('renderiza estados Refunded, Requested y dictámenes físicos dañado/pendiente', async () => {
      vi.spyOn(appServices.api, 'listReturns').mockResolvedValue([
        {
          id: 'ret-ref-2222',
          customerOrderId: 'order-2222-2222',
          variantId: 'var-2222-2222',
          warehouseId: 'wh-1111-1111',
          quantity: 2,
          status: ReturnStatus.Refunded,
          isGoodCondition: false,
          vendorApproved: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ret-req-3333',
          customerOrderId: 'order-3333-3333',
          variantId: 'var-3333-3333',
          warehouseId: 'wh-1111-1111',
          quantity: 1,
          status: ReturnStatus.Requested,
          isGoodCondition: false,
          vendorApproved: false,
          createdAt: new Date().toISOString(),
        },
      ]);

      renderWithClient(<RefundListPage />);

      expect(await screen.findByText('#ret-ref-')).toBeInTheDocument();
      expect(screen.getAllByText('Dañado').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Reembolso Acreditado al Comprador')).toBeInTheDocument();

      // Seleccionar la devolución en estado Requested
      fireEvent.click(screen.getByText('#ret-req-'));
      expect(
        await screen.findByText(/No elegible para desembolso directo/i)
      ).toBeInTheDocument();
    });
  });

  // ── 7. InvoiceManagementPage ──────────────────────────────────────────
  describe('InvoiceManagementPage', () => {
    it('muestra comprobantes emitidos, permite emitir facturación y anular factura comprador', async () => {
      const generateSpy = vi.spyOn(appServices.api, 'generateInvoices').mockResolvedValue(true);
      const annulSpy = vi.spyOn(appServices.api, 'annulInvoices').mockResolvedValue(undefined);

      renderWithClient(<InvoiceManagementPage />);

      expect(await screen.findByText('Facturación y Comisiones')).toBeInTheDocument();
      expect(screen.getByText('#inv-mast')).toBeInTheDocument();
      expect(screen.getByText('Comisión Plataforma (5%)')).toBeInTheDocument();
      expect(screen.getByText('Liquidación Vendedor (95%)')).toBeInTheDocument();

      // Emitir facturación — usar número de pedido EXISTENTE y PAGADO (order-1111-1111)
      // El primer input "Número de pedido" está en la estación de emisión (id=numero-de-emision)
      const emitInput = screen.getAllByLabelText('Número de pedido')[0]!;
      fireEvent.change(emitInput, { target: { value: 'order-1111-1111' } });

      const generateBtn = screen.getByRole('button', { name: /Emitir Facturación/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(generateSpy).toHaveBeenCalledWith('order-1111-1111');
      });
      expect(await screen.findByText(/Facturación emitida para el pedido/i)).toBeInTheDocument();

      // Anular factura comprador — el segundo input "Número de pedido" (id=numero-de-anulacion)
      const annulInputs = screen.getAllByLabelText('Número de pedido');
      fireEvent.change(annulInputs[1]!, { target: { value: 'order-1111-1111' } });

      const annulReasonInput = screen.getByLabelText('Motivo legal (obligatorio)');
      fireEvent.change(annulReasonInput, { target: { value: 'Cancelación legal por retracto' } });

      const annulBtn = screen.getByRole('button', { name: /Anular Facturación/i });
      fireEvent.click(annulBtn);

      await waitFor(() => {
        expect(annulSpy).toHaveBeenCalledWith('order-1111-1111', {
          reason: 'Cancelación legal por retracto',
        });
      });
      expect(await screen.findByText(/Facturación del pedido.*anulada/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));
    });

    it('valida campos obligatorios y errores de servidor en emisión y anulación', async () => {
      vi.spyOn(appServices.api, 'generateInvoices').mockRejectedValue(new Error('Pedido sin pago confirmado'));
      vi.spyOn(appServices.api, 'annulInvoices').mockRejectedValue(new Error('Factura ya anulada'));
      renderWithClient(<InvoiceManagementPage />);

      const generateBtn = await screen.findByRole('button', { name: /Emitir Facturación/i });
      fireEvent.click(generateBtn);
      expect(
        await screen.findByText('Ingrese el número del pedido pagado a facturar.')
      ).toBeInTheDocument();

      fireEvent.change(screen.getAllByLabelText('Número de pedido')[0]!, {
        target: { value: 'order-fail' },
      });
      fireEvent.click(generateBtn);
      expect(await screen.findByText(/No encontramos ningún pedido con ese número/)).toBeInTheDocument();

      const annulBtn = screen.getByRole('button', { name: /Anular Facturación/i });
      fireEvent.click(annulBtn);
      expect(
        await screen.findByText('Ingrese el número del pedido cuya facturación desea anular.')
      ).toBeInTheDocument();

      // Con orderId pero sin reason
      const annulInputs = screen.getAllByLabelText('Número de pedido');
      fireEvent.change(annulInputs[1]!, {
        target: { value: 'order-1111-1111' },
      });
      fireEvent.click(annulBtn);

      // Con reason para disparar error de servidor
      fireEvent.change(screen.getByLabelText('Motivo legal (obligatorio)'), {
        target: { value: 'Motivo válido' },
      });
      fireEvent.click(annulBtn);
      expect(await screen.findByText('Factura ya anulada')).toBeInTheDocument();
    });

    it('permite filtrar comprobantes por tipo y buscar por texto', async () => {
      renderWithClient(<InvoiceManagementPage />);

      expect(await screen.findByText('#inv-mast')).toBeInTheDocument();

      const typeFilter = screen.getByLabelText(/Filtrar por tipo de comprobante/i);
      fireEvent.change(typeFilter, { target: { value: InvoiceType.Master } });

      const searchInput = screen.getByPlaceholderText(/Buscar por comprobante, pedido o vendedor/i);
      fireEvent.change(searchInput, { target: { value: 'NoCoincide' } });

      expect(screen.getByText('Sin comprobantes que coincidan')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listInvoices').mockRejectedValue(new Error('Fallo de facturación'));
      renderWithClient(<InvoiceManagementPage />);

      expect(await screen.findByText('No fue posible cargar la facturación')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });
});