import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SupervisorDashboardPage,
  SupervisorOrdersPage,
  SupervisorOrderAuditPage,
  SupervisorFulfillmentsPage,
  SupervisorReturnsPage,
  SupervisorInvoicesPage,
  SupervisorInventoryAuditPage,
} from '../index';
import { appServices } from '../../../app/providers/appServices';
import type {
  AdjustInventoryResult,
  FulfillmentOrder,
  Inventory,
  Invoice,
  Order,
  OrderListItem,
  ReturnRequest,
} from '../../../domain';
import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
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
  useParams: () => ({ orderId: 'order-1111-1111' }),
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

const mockOrders: OrderListItem[] = [
  {
    id: 'order-1111-1111',
    status: OrderStatus.Paid,
    currency: 'COP',
    totalAmount: 500000,
    itemCount: 2,
    buyerId: 'buyer-1111-2222',
    items: [],
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'order-2222-2222',
    status: OrderStatus.Delivered,
    currency: 'COP',
    totalAmount: 300000,
    itemCount: 1,
    buyerId: null,
    items: [],
    createdAt: '2026-10-16T12:00:00Z',
  },
];

const mockOrderDetail: Order = {
  id: 'order-1111-1111',
  buyerId: 'buyer-1111-2222',
  status: OrderStatus.Paid,
  totalAmount: 500000,
  currency: 'COP',
  createdAt: '2026-10-15T10:00:00Z',
  items: [
    {
      id: 'item-1111-aaaa',
      variantId: 'var-1111-1111',
      quantity: 2,
      unitPrice: 250000,
      totalPrice: 500000,
    },
  ],
};

const mockFulfillments: FulfillmentOrder[] = [
  {
    id: 'ful-1111-aaaa',
    customerOrderId: 'order-1111-1111',
    vendorId: 'vendor-1111-aaaa',
    status: FulfillmentStatus.Dispatched,
    cancellationReason: null,
    shipments: [
      {
        id: 'ship-1111',
        warehouseId: 'wh-central-1111',
        trackingNumber: 'TRK-ZENTRIC-9001',
      },
    ],
    createdAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 'ful-2222-bbbb',
    customerOrderId: 'order-2222-2222',
    vendorId: 'vendor-2222-bbbb',
    status: FulfillmentStatus.Cancelled,
    cancellationReason: 'Quiebre de stock fantasma verificado en pasillo 4',
    shipments: [],
    createdAt: '2026-10-16T13:00:00Z',
  },
];

const mockReturns: ReturnRequest[] = [
  {
    id: 'ret-1111-aaaa',
    customerOrderId: 'order-1111-1111',
    variantId: 'var-1111-1111',
    warehouseId: 'wh-central-1111',
    quantity: 1,
    status: ReturnStatus.Approved,
    isGoodCondition: true,
    vendorApproved: true,
    createdAt: '2026-10-16T14:00:00Z',
  },
  {
    id: 'ret-2222-bbbb',
    customerOrderId: 'order-2222-2222',
    variantId: 'var-2222-2222',
    warehouseId: 'wh-vendor-2222',
    quantity: 2,
    status: ReturnStatus.Rejected,
    isGoodCondition: false,
    vendorApproved: false,
    createdAt: '2026-10-16T15:00:00Z',
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 'inv-master-1111',
    customerOrderId: 'order-1111-1111',
    vendorId: null,
    type: InvoiceType.Master,
    totalAmount: 500000,
    currency: 'COP',
    issuedAt: '2026-10-15T10:05:00Z',
  },
  {
    id: 'inv-zentric-1111',
    customerOrderId: 'order-1111-1111',
    vendorId: null,
    type: InvoiceType.ZentricDetail,
    totalAmount: 25000,
    currency: 'COP',
    issuedAt: '2026-10-15T10:05:00Z',
  },
  {
    id: 'inv-vendor-1111',
    customerOrderId: 'order-1111-1111',
    vendorId: 'vendor-1111-aaaa',
    type: InvoiceType.VendorDetail,
    totalAmount: 475000,
    currency: 'COP',
    issuedAt: '2026-10-15T10:05:00Z',
  },
];

const mockInventories: Inventory[] = [
  {
    id: 'inv-pos-1111',
    variantId: 'var-1111-1111',
    warehouseId: 'wh-central-1111',
    availableQuantity: 100,
    reservedQuantity: 10,
    usedQuantity: 5,
    damagedQuantity: 2,
  },
  {
    id: 'inv-pos-2222',
    variantId: 'var-2222-2222',
    warehouseId: 'wh-vendor-2222',
    availableQuantity: 40,
    reservedQuantity: 0,
    usedQuantity: 0,
    damagedQuantity: 0,
  },
];

describe('Módulo del Supervisor de Auditoría (Supervisor Module - W4-S05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
      status: 'healthy',
      database: 'up',
      timestamp: new Date().toISOString(),
    });
    vi.spyOn(appServices.api, 'listOrders').mockResolvedValue(mockOrders);
    vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockOrderDetail);
    vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue(mockFulfillments);
    vi.spyOn(appServices.api, 'listReturns').mockResolvedValue(mockReturns);
    vi.spyOn(appServices.api, 'getReturnById').mockResolvedValue(mockReturns[0]!);
    vi.spyOn(appServices.api, 'listInvoices').mockResolvedValue(mockInvoices);
    vi.spyOn(appServices.api, 'getInvoicesByOrder').mockResolvedValue(mockInvoices);
    vi.spyOn(appServices.api, 'listInventories').mockResolvedValue(mockInventories);
  });

  // ── 1. SupervisorDashboardPage ────────────────────────────────────────
  describe('SupervisorDashboardPage', () => {
    it('renderiza KPIs transversales en modo sólo lectura y NUNCA invoca listUsers (sin PII)', async () => {
      const listUsersSpy = vi.spyOn(appServices.api, 'listUsers');

      renderWithClient(<SupervisorDashboardPage />);

      expect(
        await screen.findByText('Consola de Fiscalización y Auditoría')
      ).toBeInTheDocument();
      expect(screen.getByText('Supervisor 360°')).toBeInTheDocument();
      expect(screen.getByText('Volumen Bruto Auditado')).toBeInTheDocument();
      expect(screen.getAllByText('$500.000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Comisión 5%: $25.000')).toBeInTheDocument();
      expect(screen.getByText('1 cancelados por quiebre')).toBeInTheDocument();

      // Verificación estricta de privacidad: jamás se consulta /api/users
      expect(listUsersSpy).not.toHaveBeenCalled();

      // Botón actualizar telemetría
      const refreshBtn = screen.getByRole('button', { name: /Actualizar Telemetría/i });
      fireEvent.click(refreshBtn);
    });

    it('muestra estado vacío de pedidos y alerta de fallo parcial con opción de reintentar', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'listFulfillments').mockRejectedValue(
        new Error('Fallo en red logística')
      );

      renderWithClient(<SupervisorDashboardPage />);

      expect(
        await screen.findByText('Fallo parcial en telemetría de fiscalización')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Sin pedidos registrados para fiscalización.')
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 2. SupervisorOrdersPage ───────────────────────────────────────────
  describe('SupervisorOrdersPage', () => {
    it('renderiza tabla global de pedidos en modo sólo lectura sin botones de mutación comercial', async () => {
      renderWithClient(<SupervisorOrdersPage />);

      expect(await screen.findByText('Auditoría Global de Pedidos')).toBeInTheDocument();
      expect(screen.getByText('#order-11')).toBeInTheDocument();
      expect(screen.getByText('#order-22')).toBeInTheDocument();

      // Seleccionar segunda fila y refrescar
      fireEvent.click(screen.getByText('#order-22'));
      expect(screen.getByText('#order-2222-2222')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));

      // Verificar ausencia de botones comerciales
      expect(screen.queryByRole('button', { name: /Pagar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancelar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Confirmar Checkout/i })).not.toBeInTheDocument();
    });

    it('permite filtrar por OrderStatus y buscar por texto mostrando estado vacío si no hay coincidencias', async () => {
      renderWithClient(<SupervisorOrdersPage />);

      expect(await screen.findByText('#order-11')).toBeInTheDocument();

      const statusSelect = screen.getByLabelText(/Filtrar por estado de pedido/i);
      fireEvent.change(statusSelect, { target: { value: OrderStatus.Paid } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID de pedido/i);
      fireEvent.change(searchInput, { target: { value: 'inexistente-999' } });

      expect(screen.getByText('No se encontraron pedidos')).toBeInTheDocument();
    });

    it('muestra alerta de error y permite reintentar cuando falla la consulta', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockRejectedValue(
        new Error('Error de conexión con pedidos')
      );

      renderWithClient(<SupervisorOrdersPage />);

      expect(await screen.findByText('Error al cargar pedidos globales')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 3. SupervisorOrderAuditPage ───────────────────────────────────────
  describe('SupervisorOrderAuditPage', () => {
    it('cruza líneas del pedido, despachos logísticos y las 3 facturas del split tributario', async () => {
      renderWithClient(<SupervisorOrderAuditPage orderId="order-1111-1111" />);

      expect(await screen.findByText('Expediente 360° de Pedido')).toBeInTheDocument();
      expect(screen.getByText('var-1111-1111')).toBeInTheDocument();
      expect(screen.getByText('Guía: TRK-ZENTRIC-9001')).toBeInTheDocument();

      // Las 3 facturas del split tributario e invariante verificada
      expect(screen.getByText('Factura Maestra')).toBeInTheDocument();
      expect(screen.getByText('Comisión Zentric (5%)')).toBeInTheDocument();
      expect(screen.getByText('Liquidación Vendedor (95%)')).toBeInTheDocument();
      expect(screen.getByText('Verificada (100%)')).toBeInTheDocument();

      // Sincronizar expediente
      const syncBtn = screen.getByRole('button', { name: /Sincronizar Expediente/i });
      fireEvent.click(syncBtn);
    });

    it('muestra estados vacíos cuando el pedido no tiene líneas, despachos ni facturas o viene como SellerOrderView', async () => {
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue({
        id: 'order-2222-2222',
        status: OrderStatus.Delivered,
        currency: 'COP',
        vendorSubtotal: 285000,
        createdAt: '2026-10-16T12:00:00Z',
        items: [],
      });
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue(mockFulfillments);
      vi.spyOn(appServices.api, 'getInvoicesByOrder').mockResolvedValue([]);

      renderWithClient(<SupervisorOrderAuditPage />);

      expect(
        await screen.findByText('El pedido no contiene líneas registradas.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Quiebre de stock fantasma verificado en pasillo 4/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText('Aún no se han emitido comprobantes tributarios para este pedido.')
      ).toBeInTheDocument();
    });

    it('muestra estado de expediente no encontrado cuando getOrderById retorna nulo', async () => {
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(null as never);

      renderWithClient(<SupervisorOrderAuditPage orderId="order-no-existe" />);

      expect(
        await screen.findByText('Expediente de pedido no encontrado')
      ).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga del expediente 360°', async () => {
      vi.spyOn(appServices.api, 'getOrderById').mockRejectedValue(
        new Error('Pedido inaccesible')
      );

      renderWithClient(<SupervisorOrderAuditPage orderId="order-1111-1111" />);

      expect(
        await screen.findByText('Error al cargar el expediente 360° del pedido')
      ).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 4. SupervisorFulfillmentsPage ─────────────────────────────────────
  describe('SupervisorFulfillmentsPage', () => {
    it('monitorea despachos y cancelaciones por quiebre de stock fantasma sin botones de mutación', async () => {
      renderWithClient(<SupervisorFulfillmentsPage />);

      expect(
        await screen.findByText('Monitoreo de Despachos y Quiebres de Stock')
      ).toBeInTheDocument();
      expect(screen.getAllByText('#ful-1111').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('TRK-ZENTRIC-9001')).toBeInTheDocument();

      // Seleccionar despacho cancelado por quiebre de stock
      fireEvent.click(screen.getByText('#ful-2222'));
      expect(screen.getByText('Incidente de Stock Fantasma')).toBeInTheDocument();
      expect(
        screen.getByText('Quiebre de stock fantasma verificado en pasillo 4')
      ).toBeInTheDocument();

      // Ausencia estricta de botones de operación logística
      expect(screen.queryByRole('button', { name: /Empacar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Despachar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Entregar/i })).not.toBeInTheDocument();
    });

    it('permite filtrar por FulfillmentStatus y buscar por guía o motivo', async () => {
      renderWithClient(<SupervisorFulfillmentsPage />);

      expect((await screen.findAllByText('#ful-1111')).length).toBeGreaterThanOrEqual(1);

      const statusSelect = screen.getByLabelText(/Filtrar por estado de despacho/i);
      fireEvent.change(statusSelect, { target: { value: FulfillmentStatus.Cancelled } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID despacho/i);
      fireEvent.change(searchInput, { target: { value: 'no-existe' } });

      expect(screen.getByText('No se encontraron despachos')).toBeInTheDocument();
    });

    it('muestra alerta de error y permite reintentar cuando falla la consulta', async () => {
      vi.spyOn(appServices.api, 'listFulfillments').mockRejectedValue(
        new Error('Error en servicio logístico')
      );

      renderWithClient(<SupervisorFulfillmentsPage />);

      expect(
        await screen.findByText('Error al cargar órdenes de despacho')
      ).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 5. SupervisorReturnsPage ──────────────────────────────────────────
  describe('SupervisorReturnsPage', () => {
    it('fiscaliza solicitudes de devolución, veredictos isGoodCondition y resoluciones sin mutaciones', async () => {
      const getReturnSpy = vi
        .spyOn(appServices.api, 'getReturnById')
        .mockResolvedValue(mockReturns[1]!);

      renderWithClient(<SupervisorReturnsPage />);

      expect(
        await screen.findByText('Fiscalización de Devoluciones e Inspecciones')
      ).toBeInTheDocument();
      expect(screen.getByText('Intacto (OK)')).toBeInTheDocument();
      expect(screen.getByText('Dañado / No Apto')).toBeInTheDocument();

      // Seleccionar devolución rechazada para disparar GET /api/returns/{id}
      fireEvent.click(screen.getByText('#ret-2222'));

      await waitFor(() => {
        expect(getReturnSpy).toHaveBeenCalledWith('ret-2222-bbbb');
      });

      expect(await screen.findByText('No Apto / Dañado')).toBeInTheDocument();

      // Ausencia estricta de botones de inspección, aprobación o reembolso
      expect(screen.queryByRole('button', { name: /Inspeccionar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Aprobar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Rechazar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reembolsar/i })).not.toBeInTheDocument();
    });

    it('permite filtrar por ReturnStatus y buscar por texto', async () => {
      renderWithClient(<SupervisorReturnsPage />);

      expect((await screen.findAllByText('#ret-1111')).length).toBeGreaterThanOrEqual(1);

      const statusSelect = screen.getByLabelText(/Filtrar por estado de devolución/i);
      fireEvent.change(statusSelect, { target: { value: ReturnStatus.Approved } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID de devolución/i);
      fireEvent.change(searchInput, { target: { value: 'sin-coincidencia' } });

      expect(screen.getByText('No se encontraron devoluciones')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la consulta de devoluciones', async () => {
      vi.spyOn(appServices.api, 'listReturns').mockRejectedValue(
        new Error('Error en devoluciones')
      );

      renderWithClient(<SupervisorReturnsPage />);

      expect(
        await screen.findByText('Error al cargar expedientes de devolución')
      ).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 6. SupervisorInvoicesPage ─────────────────────────────────────────
  describe('SupervisorInvoicesPage', () => {
    it('renderiza el libro mayor tributario con desglose Master, Comisión 5% y Vendedor 95% en sólo lectura', async () => {
      renderWithClient(<SupervisorInvoicesPage />);

      expect(
        await screen.findByText('Libro Mayor Tributario y Comisiones Split')
      ).toBeInTheDocument();
      expect(screen.getByText('Maestra')).toBeInTheDocument();
      expect(screen.getByText('Comisión 5%')).toBeInTheDocument();
      expect(screen.getByText('Vendedor 95%')).toBeInTheDocument();

      // Seleccionar factura de vendedor
      fireEvent.click(screen.getByText('#inv-vend'));
      expect(screen.getByText('#inv-vendor-1111')).toBeInTheDocument();

      // Ausencia estricta de botones de emisión o anulación
      expect(
        screen.queryByRole('button', { name: /Emitir Facturación/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Anular Facturas/i })
      ).not.toBeInTheDocument();
    });

    it('permite filtrar por InvoiceType y buscar por texto', async () => {
      renderWithClient(<SupervisorInvoicesPage />);

      expect(await screen.findByText('Maestra')).toBeInTheDocument();

      const typeSelect = screen.getByLabelText(/Filtrar por tipo de factura/i);
      fireEvent.change(typeSelect, { target: { value: InvoiceType.Master } });

      const searchInput = screen.getByPlaceholderText(/Buscar por ID factura/i);
      fireEvent.change(searchInput, { target: { value: 'no-existe' } });

      expect(screen.getByText('No se encontraron facturas')).toBeInTheDocument();
    });

    it('muestra alerta de error y permite reintentar cuando falla la carga de facturas', async () => {
      vi.spyOn(appServices.api, 'listInvoices').mockRejectedValue(
        new Error('Error en libro tributario')
      );

      renderWithClient(<SupervisorInvoicesPage />);

      expect(
        await screen.findByText('Error al cargar el libro mayor tributario')
      ).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });

  // ── 7. SupervisorInventoryAuditPage ───────────────────────────────────
  describe('SupervisorInventoryAuditPage', () => {
    it('ejecuta la única mutación permitida al Supervisor (InventoryAdjust - ADR-0021) y muestra AdjustInventoryResult', async () => {
      const mockAdjustment: AdjustInventoryResult = {
        adjustmentId: 'adj-sup-7777',
        inventoryId: 'inv-pos-1111',
        previousAvailableQuantity: 100,
        newAvailableQuantity: 92,
        adjustedQuantity: -8,
        reason: 'Disminución verificada en arqueo físico de pasillo B',
        countedAt: '2026-10-16T18:00:00Z',
      };

      const adjustSpy = vi
        .spyOn(appServices.api, 'adjustInventory')
        .mockResolvedValue(mockAdjustment);

      renderWithClient(<SupervisorInventoryAuditPage />);

      expect(
        await screen.findByText('Estación de Auditoría de Stock por Conteo Físico')
      ).toBeInTheDocument();
      expect(screen.getByText('Política InventoryAdjust')).toBeInTheDocument();

      // Seleccionar posición de inventario y refrescar
      fireEvent.click(screen.getByText(/100 Disp/i));
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));

      const invInput = screen.getByPlaceholderText(/UUID del inventario/i);
      fireEvent.change(invInput, { target: { value: 'inv-pos-1111' } });

      const qtyInput = screen.getByDisplayValue('100');
      fireEvent.change(qtyInput, { target: { value: '92' } });

      const reasonInput = screen.getByPlaceholderText(/Disminución verificada/i);
      fireEvent.change(reasonInput, {
        target: { value: 'Disminución verificada en arqueo físico de pasillo B' },
      });

      const submitBtn = screen.getByRole('button', { name: /Registrar Conteo Físico/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(adjustSpy).toHaveBeenCalledWith('inv-pos-1111', {
          countedQuantity: 92,
          reason: 'Disminución verificada en arqueo físico de pasillo B',
        });
      });

      expect(
        await screen.findByText('Resultado del Ajuste de Auditoría (ADR-0021)')
      ).toBeInTheDocument();
      expect(screen.getByText('adj-sup-7777')).toBeInTheDocument();
      expect(screen.getByText('100 unidades')).toBeInTheDocument();
      expect(screen.getByText('92 unidades')).toBeInTheDocument();
      expect(screen.getByText('-8')).toBeInTheDocument();
    });

    it('valida posición de inventario y esquema AdjustInventorySchema antes de enviar', async () => {
      renderWithClient(<SupervisorInventoryAuditPage />);

      const submitBtn = await screen.findByRole('button', { name: /Registrar Conteo Físico/i });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Debe seleccionar o especificar la posición de inventario a auditar.')
      ).toBeInTheDocument();

      // Seleccionar posición pero dejar motivo vacío
      fireEvent.click(screen.getByText(/100 Disp/i));
      fireEvent.click(submitBtn);

      expect(await screen.findByTestId('reason-error')).toBeInTheDocument();
    });

    it('muestra alerta cuando adjustInventory falla y soporta lista de inventario vacía', async () => {
      vi.spyOn(appServices.api, 'adjustInventory').mockRejectedValue(
        new Error('Conflicto de concurrencia en conteo')
      );

      renderWithClient(<SupervisorInventoryAuditPage />);

      fireEvent.click(await screen.findByText(/100 Disp/i));
      fireEvent.change(screen.getByPlaceholderText(/Disminución verificada/i), {
        target: { value: 'Arqueo de control mensual' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Registrar Conteo Físico/i }));

      expect(
        await screen.findByText('Conflicto de concurrencia en conteo')
      ).toBeInTheDocument();
    });

    it('muestra mensaje cuando no hay posiciones de inventario cargadas en la red', async () => {
      vi.spyOn(appServices.api, 'listInventories').mockResolvedValue([]);

      renderWithClient(<SupervisorInventoryAuditPage />);

      expect(
        await screen.findByText('No hay posiciones de inventario cargadas en la red.')
      ).toBeInTheDocument();
    });

    it('muestra estado de error de carga de inventario y permite reintentar', async () => {
      vi.spyOn(appServices.api, 'listInventories').mockRejectedValue(
        new Error('Error de red en inventarios')
      );

      renderWithClient(<SupervisorInventoryAuditPage />);

      expect(
        await screen.findByText('Error al cargar posiciones de inventario')
      ).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });
});
