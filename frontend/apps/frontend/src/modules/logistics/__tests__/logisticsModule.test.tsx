import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LogisticsFulfillmentsPage,
  FulfillmentOperationsPage,
  GhostStockReportPage,
  LogisticsReturnsInspectPage,
} from '../index';
import { appServices } from '../../../app/providers/appServices';
import type { FulfillmentOrder, ReturnRequest } from '../../../domain';
import { FulfillmentStatus, ReturnStatus } from '../../../domain';

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
  useParams: () => ({ id: 'ful-1111-1111' }),
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

const mockFulfillments: FulfillmentOrder[] = [
  {
    id: 'ful-1111-1111',
    customerOrderId: 'order-1111-1111',
    vendorId: 'vendor-1111-1111',
    status: FulfillmentStatus.PendingPack,
    cancellationReason: null,
    shipments: [
      {
        id: 'ship-1',
        warehouseId: 'wh-1111-1111',
        trackingNumber: 'TRK-ZENTRIC-001',
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ful-2222-2222',
    customerOrderId: 'order-2222-2222',
    vendorId: 'vendor-1111-1111',
    status: FulfillmentStatus.Packed,
    cancellationReason: null,
    shipments: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ful-3333-3333',
    customerOrderId: 'order-3333-3333',
    vendorId: 'vendor-2222-2222',
    status: FulfillmentStatus.Dispatched,
    cancellationReason: null,
    shipments: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ful-4444-4444',
    customerOrderId: 'order-4444-4444',
    vendorId: 'vendor-2222-2222',
    status: FulfillmentStatus.Delivered,
    cancellationReason: null,
    shipments: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ful-5555-5555',
    customerOrderId: 'order-5555-5555',
    vendorId: 'vendor-1111-1111',
    status: FulfillmentStatus.Cancelled,
    cancellationReason: 'Quiebre de stock no conciliado en bodega',
    shipments: [],
    createdAt: new Date().toISOString(),
  },
];

const mockReturns: ReturnRequest[] = [
  {
    id: 'ret-1111-1111',
    customerOrderId: 'order-1111-1111',
    variantId: 'var-1111-1111',
    warehouseId: 'wh-1111-1111',
    quantity: 1,
    status: ReturnStatus.Requested,
    isGoodCondition: false,
    vendorApproved: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ret-2222-2222',
    customerOrderId: 'order-2222-2222',
    variantId: 'var-2222-2222',
    warehouseId: 'wh-1111-1111',
    quantity: 2,
    status: ReturnStatus.Approved,
    isGoodCondition: true,
    vendorApproved: true,
    createdAt: new Date().toISOString(),
  },
];

describe('Módulo Logístico (Logistics Module - W4-S04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue(mockFulfillments);
    vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[0]!);
    vi.spyOn(appServices.api, 'listReturns').mockResolvedValue(mockReturns);
  });

  // ── 1. LogisticsFulfillmentsPage ──────────────────────────────────────
  describe('LogisticsFulfillmentsPage', () => {
    it('renderiza cola de despachos con filtros y permite crear una nueva orden', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createFulfillment').mockResolvedValue('ful-new-id');
      renderWithClient(<LogisticsFulfillmentsPage />);

      expect(await screen.findByText('Cola de Despachos y Operaciones Logísticas')).toBeInTheDocument();
      expect(screen.getByText('#ful-1111')).toBeInTheDocument();
      expect(screen.getByText('#ful-2222')).toBeInTheDocument();

      // Completar formulario de alta
      const orderInput = screen.getByPlaceholderText(/UUID del pedido a despachar/i);
      fireEvent.change(orderInput, { target: { value: 'order-9999-9999' } });

      const vendorInput = screen.getByPlaceholderText(/UUID del vendedor dueño del stock/i);
      fireEvent.change(vendorInput, { target: { value: 'vendor-9999-9999' } });

      const submitBtn = screen.getByRole('button', { name: /Crear Despacho/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          customerOrderId: 'order-9999-9999',
          vendorId: 'vendor-9999-9999',
        });
      });

      expect(await screen.findByText(/Orden de despacho creada con ID #ful-new-/i)).toBeInTheDocument();
    });

    it('valida campos requeridos en el alta de despacho', async () => {
      renderWithClient(<LogisticsFulfillmentsPage />);

      const submitBtn = await screen.findByRole('button', { name: /Crear Despacho/i });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('El identificador de pedido es obligatorio')
      ).toBeInTheDocument();
    });

    it('permite filtrar por estado y buscar por texto', async () => {
      renderWithClient(<LogisticsFulfillmentsPage />);

      expect(await screen.findByText('#ful-1111')).toBeInTheDocument();

      const filterSelect = screen.getByLabelText(/Filtrar por estado de despacho/i);
      fireEvent.change(filterSelect, { target: { value: FulfillmentStatus.Packed } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID despacho/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

      expect(screen.getByText('No se encontraron despachos')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listFulfillments').mockRejectedValue(new Error('Fallo de red logística'));
      renderWithClient(<LogisticsFulfillmentsPage />);

      expect(await screen.findByText('Error al cargar despachos')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });

  // ── 2. FulfillmentOperationsPage ──────────────────────────────────────
  describe('FulfillmentOperationsPage', () => {
    it('muestra expediente y permite avanzar la transición secuencial de empaque (PendingPack -> Packed)', async () => {
      const packSpy = vi.spyOn(appServices.api, 'packFulfillment').mockResolvedValue(undefined);
      renderWithClient(<FulfillmentOperationsPage fulfillmentId="ful-1111-1111" />);

      expect(await screen.findByText('Estación Operativa de Despacho')).toBeInTheDocument();
      expect(screen.getByText('Guía: TRK-ZENTRIC-001')).toBeInTheDocument();

      const packBtn = screen.getByRole('button', { name: /Registrar Empaque/i });
      fireEvent.click(packBtn);

      await waitFor(() => {
        expect(packSpy).toHaveBeenCalledWith('ful-1111-1111');
      });

      expect(await screen.findByText(/Paquete empacado y verificado/i)).toBeInTheDocument();
    });

    it('permite despachar un paquete en estado Packed', async () => {
      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[1]!);
      const dispatchSpy = vi.spyOn(appServices.api, 'dispatchFulfillment').mockResolvedValue(undefined);

      renderWithClient(<FulfillmentOperationsPage fulfillmentId="ful-2222-2222" />);

      expect(await screen.findByText('Estación Operativa de Despacho')).toBeInTheDocument();

      const dispatchBtn = screen.getByRole('button', { name: /Despachar Paquete/i });
      fireEvent.click(dispatchBtn);

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith('ful-2222-2222');
      });

      expect(await screen.findByText(/Paquete despachado con guía asignada/i)).toBeInTheDocument();
    });

    it('permite certificar entrega al comprador en estado Dispatched (potestad exclusiva de logística)', async () => {
      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[2]!);
      const deliverSpy = vi.spyOn(appServices.api, 'deliverFulfillment').mockResolvedValue(undefined);

      renderWithClient(<FulfillmentOperationsPage fulfillmentId="ful-3333-3333" />);

      expect(await screen.findByText('Estación Operativa de Despacho')).toBeInTheDocument();

      const deliverBtn = screen.getByRole('button', { name: /Certificar Entrega al Comprador/i });
      fireEvent.click(deliverBtn);

      await waitFor(() => {
        expect(deliverSpy).toHaveBeenCalledWith('ful-3333-3333');
      });

      expect(await screen.findByText(/Entrega certificada exitosamente al comprador final/i)).toBeInTheDocument();
    });

    it('exhibe estados Delivered y Cancelled en el panel de transición', async () => {
      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[3]!);
      const { rerender } = renderWithClient(<FulfillmentOperationsPage fulfillmentId="ful-4444-4444" />);

      expect(await screen.findByText('Entrega Certificada')).toBeInTheDocument();

      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[4]!);
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <FulfillmentOperationsPage fulfillmentId="ful-5555-5555" />
        </QueryClientProvider>
      );

      expect(await screen.findByText('Despacho Cancelado')).toBeInTheDocument();
      expect(screen.getByText('Quiebre de stock no conciliado en bodega')).toBeInTheDocument();
    });

    it('muestra error cuando no se encuentra el despacho', async () => {
      vi.spyOn(appServices.api, 'getFulfillmentById').mockRejectedValue(new Error('Despacho inexistente'));
      renderWithClient(<FulfillmentOperationsPage fulfillmentId="ful-invalid" />);

      expect(await screen.findByText('Error al cargar el despacho')).toBeInTheDocument();
      expect(screen.getByText('Despacho inexistente')).toBeInTheDocument();
    });

    it('maneja errores en mutaciones de empaque, despacho y entrega, y despachos sin guías', async () => {
      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue({
        ...mockFulfillments[0]!,
        shipments: [],
      });
      vi.spyOn(appServices.api, 'packFulfillment').mockRejectedValue(new Error('Fallo al empacar'));
      vi.spyOn(appServices.api, 'dispatchFulfillment').mockRejectedValue(new Error('Fallo al despachar'));
      vi.spyOn(appServices.api, 'deliverFulfillment').mockRejectedValue(new Error('Fallo al entregar'));

      const { rerender } = renderWithClient(<FulfillmentOperationsPage />);

      expect(
        await screen.findByText(/Guías de transporte pendientes de generación/i)
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Registrar Empaque/i }));
      expect(await screen.findByText('Fallo al empacar')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));

      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[1]!);
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <FulfillmentOperationsPage fulfillmentId="ful-2222-2222" />
        </QueryClientProvider>
      );
      expect(await screen.findByRole('button', { name: /Despachar Paquete/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Despachar Paquete/i }));
      expect(await screen.findByText('Fallo al despachar')).toBeInTheDocument();

      vi.spyOn(appServices.api, 'getFulfillmentById').mockResolvedValue(mockFulfillments[2]!);
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <FulfillmentOperationsPage fulfillmentId="ful-3333-3333" />
        </QueryClientProvider>
      );
      expect(await screen.findByRole('button', { name: /Certificar Entrega al Comprador/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Certificar Entrega al Comprador/i }));
      expect(await screen.findByText('Fallo al entregar')).toBeInTheDocument();
    });
  });

  // ── 3. GhostStockReportPage ───────────────────────────────────────────
  describe('GhostStockReportPage', () => {
    it('valida formulario y notifica quiebre por stock fantasma (ADR-0014 / ADR-0022)', async () => {
      const ghostSpy = vi.spyOn(appServices.api, 'cancelGhostStock').mockResolvedValue(true);
      renderWithClient(<GhostStockReportPage fulfillmentId="ful-1111-1111" />);

      expect(await screen.findByText('Reporte de Stock Fantasma')).toBeInTheDocument();
      expect(screen.getByText('ADR-0014 / ADR-0022')).toBeInTheDocument();

      // Completar campos
      fireEvent.change(screen.getByPlaceholderText(/UUID de la variante que no se encuentra/i), {
        target: { value: 'var-1111-1111' },
      });
      fireEvent.change(screen.getByPlaceholderText(/UUID de la bodega donde ocurrió/i), {
        target: { value: 'wh-1111-1111' },
      });
      fireEvent.change(screen.getByDisplayValue('1'), {
        target: { value: '2' },
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Quiebre y Cancelar Despacho/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(ghostSpy).toHaveBeenCalledWith({
          fulfillmentOrderId: 'ful-1111-1111',
          variantId: 'var-1111-1111',
          warehouseId: 'wh-1111-1111',
          quantityToCancel: 2,
        });
      });

      expect(await screen.findByText('Quiebre por Stock Fantasma Notificado')).toBeInTheDocument();
    });

    it('muestra error de validación cuando falta el despacho, la variante, la bodega o cantidad inválida', async () => {
      const { container } = renderWithClient(<GhostStockReportPage />);

      const qtyInput = await screen.findByDisplayValue('1');
      fireEvent.change(qtyInput, { target: { value: '0' } });

      const form = container.querySelector('form');
      if (form) fireEvent.submit(form);

      expect(
        await screen.findByText('El identificador de variante es obligatorio')
      ).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText(/UUID del despacho/i), {
        target: { value: 'ful-manual-1111' },
      });
    });

    it('muestra alerta si la mutación cancelGhostStock falla', async () => {
      vi.spyOn(appServices.api, 'cancelGhostStock').mockRejectedValue(new Error('Fulfillment ya fue entregado'));
      renderWithClient(<GhostStockReportPage fulfillmentId="ful-1111-1111" />);

      fireEvent.change(screen.getByPlaceholderText(/UUID de la variante que no se encuentra/i), {
        target: { value: 'var-1111-1111' },
      });
      fireEvent.change(screen.getByPlaceholderText(/UUID de la bodega donde ocurrió/i), {
        target: { value: 'wh-1111-1111' },
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Quiebre y Cancelar Despacho/i });
      fireEvent.click(confirmBtn);

      expect(await screen.findByText('Fulfillment ya fue entregado')).toBeInTheDocument();
    });
  });

  // ── 4. LogisticsReturnsInspectPage ─────────────────────────────────────
  describe('LogisticsReturnsInspectPage', () => {
    it('muestra devoluciones en bodega y permite asentar dictamen físico favorable (ADR-0018)', async () => {
      const inspectSpy = vi.spyOn(appServices.api, 'inspectReturn').mockResolvedValue(undefined);
      renderWithClient(<LogisticsReturnsInspectPage />);

      expect(await screen.findByText('Estación de Inspección Técnica de Devoluciones')).toBeInTheDocument();
      expect(screen.getByText('#ret-1111')).toBeInTheDocument();

      // Emitir dictamen favorable
      const submitBtn = screen.getByRole('button', { name: /Emitir Dictamen Físico/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(inspectSpy).toHaveBeenCalledWith('ret-1111-1111', {
          isGoodCondition: true,
        });
      });

      expect(await screen.findByText(/Dictamen técnico \(Favorable\) registrado exitosamente/i)).toBeInTheDocument();
    });

    it('permite seleccionar dictamen desfavorable, cambiar fila, refrescar y manejar error', async () => {
      const inspectSpy = vi.spyOn(appServices.api, 'inspectReturn').mockResolvedValueOnce(undefined);
      renderWithClient(<LogisticsReturnsInspectPage />);

      const rowCell = await screen.findByText('#ret-1111');
      fireEvent.click(rowCell);

      // Cambiar a desfavorable y luego alternar
      const badBtn = screen.getByRole('button', { name: /Desfavorable \(Dañado\)/i });
      fireEvent.click(badBtn);
      const goodBtn = screen.getByRole('button', { name: /Favorable \(Intacto\)/i });
      fireEvent.click(goodBtn);
      fireEvent.click(badBtn);

      const submitBtn = screen.getByRole('button', { name: /Emitir Dictamen Físico/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(inspectSpy).toHaveBeenCalledWith('ret-1111-1111', {
          isGoodCondition: false,
        });
      });

      expect(await screen.findByText(/Dictamen técnico \(Desfavorable\) registrado exitosamente/i)).toBeInTheDocument();

      // Simular fallo de servidor al inspeccionar
      inspectSpy.mockRejectedValueOnce(new Error('Fallo al guardar inspección'));
      fireEvent.click(submitBtn);
      expect(await screen.findByText('Fallo al guardar inspección')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Refrescar/i }));
    });

    it('permite filtrar por estado y buscar por texto', async () => {
      renderWithClient(<LogisticsReturnsInspectPage />);

      expect(await screen.findByText('#ret-1111')).toBeInTheDocument();

      const filterSelect = screen.getByLabelText(/Filtrar por estado de devolución/i);
      fireEvent.change(filterSelect, { target: { value: 'All' } });
      fireEvent.change(filterSelect, { target: { value: ReturnStatus.Approved } });

      const searchInput = await screen.findByPlaceholderText(/Buscar por ID devolución/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

      expect(screen.getByText('No hay devoluciones para inspeccionar')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listReturns').mockRejectedValue(new Error('Fallo de devoluciones'));
      renderWithClient(<LogisticsReturnsInspectPage />);

      expect(await screen.findByText('Error al cargar devoluciones')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn);
    });
  });
});
