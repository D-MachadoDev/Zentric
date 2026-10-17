import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MockZentricApiAdapter } from '../../../adapters/mocks/MockZentricApiAdapter';
import { MemorySessionAdapter } from '../../../adapters/session/MemorySessionAdapter';
import { queryKeys } from '../queryKeys';
import {
  useActivateUserMutation,
  useAddStockMutation,
  useAdjustInventoryMutation,
  useApproveReturnMutation,
  useBlockUserMutation,
  useCheckoutOrderMutation,
  useCreateCartMutation,
  useCreateFulfillmentMutation,
  useCreateProductMutation,
  useCreateUserMutation,
  useCreateWarehouseMutation,
  useCurrentUserQuery,
  useDeliverFulfillmentMutation,
  useDispatchFulfillmentMutation,
  useFulfillmentsQuery,
  useGenerateInvoicesMutation,
  useHealthQuery,
  useInventoriesQuery,
  useInvoicesQuery,
  useLoginMutation,
  useLogoutMutation,
  useOrdersQuery,
  usePackFulfillmentMutation,
  usePayOrderMutation,
  useProductsPagedQuery,
  useProductsQuery,
  useRequestReturnMutation,
  useReturnsQuery,
  useUsersQuery,
  useWarehousesQuery,
} from '../index';
import { UserRole } from '../../../domain';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('TanStack Query Hooks & queryKeys (Decision A2)', () => {
  it('la fábrica queryKeys produce las claves estructuradas correctas', () => {
    expect(queryKeys.health.all).toEqual(['health']);
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
    expect(queryKeys.users.list({ role: UserRole.Seller })).toEqual(['users', 'list', { role: UserRole.Seller }]);
    expect(queryKeys.users.detail('u-1')).toEqual(['users', 'detail', 'u-1']);
    expect(queryKeys.warehouses.list({ vendorId: 'v-1' })).toEqual(['warehouses', 'list', { vendorId: 'v-1' }]);
    expect(queryKeys.inventories.variant('var-1')).toEqual(['inventories', 'variant', 'var-1']);
    expect(queryKeys.products.paged({ page: 0, size: 10 })).toEqual(['products', 'paged', { page: 0, size: 10 }]);
    expect(queryKeys.orders.list({ status: 'Paid' })).toEqual(['orders', 'list', { status: 'Paid' }]);
  });

  describe('Autenticación e Identidad Hooks', () => {
    it('useLoginMutation actualiza sesión y caché de TanStack Query', async () => {
      const { wrapper, queryClient } = createWrapper();
      const mockApi = new MockZentricApiAdapter();
      const session = new MemorySessionAdapter();

      const { result } = renderHook(() => useLoginMutation(mockApi, session), { wrapper });

      await result.current.mutateAsync({
        email: 'admin@zentric.test',
        password: 'any',
      });

      expect(session.getAccessToken()).toBeTruthy();
      expect(session.getRole()).toBe(UserRole.Administrator);
      const cached = queryClient.getQueryData(queryKeys.auth.me());
      expect(cached).toMatchObject({ email: 'admin@zentric.test' });
    });

    it('useCurrentUserQuery lee la identidad actual', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();
      const session = new MemorySessionAdapter();

      const { result } = renderHook(() => useCurrentUserQuery(mockApi, session), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.email).toBe('admin@zentric.test');
    });

    it('useLogoutMutation limpia memoria y caché', async () => {
      const { wrapper, queryClient } = createWrapper();
      const session = new MemorySessionAdapter();
      session.setAccessToken('active-token');
      queryClient.setQueryData(queryKeys.auth.me(), { email: 'test@zentric.dev' });

      const { result } = renderHook(() => useLogoutMutation(session), { wrapper });

      await result.current.mutateAsync();

      expect(session.getAccessToken()).toBeNull();
      expect(queryClient.getQueryData(queryKeys.auth.me())).toBeUndefined();
    });
  });

  describe('Gestión de Usuarios Hooks', () => {
    it('useUsersQuery lista usuarios y useCreateUserMutation añade e invalida', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: listRes } = renderHook(() => useUsersQuery(undefined, mockApi), { wrapper });
      await waitFor(() => expect(listRes.current.isSuccess).toBe(true));
      const initialCount = listRes.current.data?.length ?? 0;

      const { result: createRes } = renderHook(() => useCreateUserMutation(mockApi), { wrapper });
      await createRes.current.mutateAsync({
        identityDocument: '99999999',
        fullName: 'Nuevo Usuario',
        email: 'nuevo@zentric.test',
        password: 'password123',
        role: UserRole.Buyer,
      });

      expect(mockApi.users.length).toBe(initialCount + 1);
    });

    it('useBlockUserMutation y useActivateUserMutation alternan estado operativo', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();
      const targetUser = mockApi.users[0]!;

      const { result: blockRes } = renderHook(() => useBlockUserMutation(mockApi), { wrapper });
      await blockRes.current.mutateAsync(targetUser.id);
      expect(targetUser.isActive).toBe(false);

      const { result: activateRes } = renderHook(() => useActivateUserMutation(mockApi), { wrapper });
      await activateRes.current.mutateAsync(targetUser.id);
      expect(targetUser.isActive).toBe(true);
    });
  });

  describe('Bodegas e Inventario Hooks', () => {
    it('useWarehousesQuery y useCreateWarehouseMutation operan sobre bodegas', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: listRes } = renderHook(() => useWarehousesQuery(undefined, mockApi), { wrapper });
      await waitFor(() => expect(listRes.current.isSuccess).toBe(true));

      const { result: createRes } = renderHook(() => useCreateWarehouseMutation(mockApi), { wrapper });
      await createRes.current.mutateAsync({
        name: 'Bodega Norte',
        location: 'Barranquilla',
        capacity: 2000,
        type: 'Marketplace',
        vendorId: null,
      });

      expect(mockApi.warehouses.length).toBe(2);
    });

    it('useInventoriesQuery, useAddStockMutation y useAdjustInventoryMutation', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: invRes } = renderHook(() => useInventoriesQuery(mockApi), { wrapper });
      await waitFor(() => expect(invRes.current.isSuccess).toBe(true));

      const { result: addStockRes } = renderHook(() => useAddStockMutation(mockApi), { wrapper });
      await addStockRes.current.mutateAsync({
        variantId: '33333333-3333-3333-3333-333333333331',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        quantity: 25,
      });

      const inv = mockApi.inventories[0]!;
      expect(inv.availableQuantity).toBe(125);

      const { result: adjustRes } = renderHook(() => useAdjustInventoryMutation(mockApi), { wrapper });
      await adjustRes.current.mutateAsync({
        id: inv.id,
        input: { countedQuantity: 120, reason: 'Conteo de prueba' },
      });

      expect(inv.availableQuantity).toBe(120);
    });
  });

  describe('Catálogo Hooks', () => {
    it('useProductsQuery, useProductsPagedQuery y useCreateProductMutation', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: prodRes } = renderHook(() => useProductsQuery(undefined, mockApi), { wrapper });
      await waitFor(() => expect(prodRes.current.isSuccess).toBe(true));
      expect(prodRes.current.data?.length).toBeGreaterThanOrEqual(1);

      const { result: pagedRes } = renderHook(() => useProductsPagedQuery({ page: 0, size: 5 }, mockApi), {
        wrapper,
      });
      await waitFor(() => expect(pagedRes.current.isSuccess).toBe(true));
      expect(pagedRes.current.data?.items.length).toBeGreaterThanOrEqual(1);

      const { result: createProdRes } = renderHook(() => useCreateProductMutation(mockApi), { wrapper });
      const created = await createProdRes.current.mutateAsync({
        name: 'Mouse Inalámbrico',
        description: 'Mouse ergonómico',
        priceAmount: 35,
        priceCurrency: 'USD',
        type: 'Physical',
        variants: [{ sku: 'MOU-ERG-01', attributes: [] }],
      });

      expect(created.productId).toBeTruthy();
      expect(created.variantIds.length).toBe(1);
    });
  });

  describe('Pedidos y Checkout Hooks', () => {
    it('useCreateCartMutation, useCheckoutOrderMutation y usePayOrderMutation', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: cartRes } = renderHook(() => useCreateCartMutation(mockApi), { wrapper });
      const orderId = await cartRes.current.mutateAsync();
      expect(orderId).toBeTruthy();

      const { result: checkoutRes } = renderHook(() => useCheckoutOrderMutation(mockApi), { wrapper });
      await checkoutRes.current.mutateAsync(orderId);
      expect(mockApi.orders.find((o) => o.id === orderId)?.status).toBe('PendingPayment');

      const { result: payRes } = renderHook(() => usePayOrderMutation(mockApi), { wrapper });
      await payRes.current.mutateAsync(orderId);
      expect(mockApi.orders.find((o) => o.id === orderId)?.status).toBe('Paid');

      const { result: ordersRes } = renderHook(() => useOrdersQuery('Paid', mockApi), { wrapper });
      await waitFor(() => expect(ordersRes.current.isSuccess).toBe(true));
      expect(ordersRes.current.data?.length).toBe(1);
    });
  });

  describe('Logística, Devoluciones y Facturación Hooks', () => {
    it('flujo completo de fulfillment logístico', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: createRes } = renderHook(() => useCreateFulfillmentMutation(mockApi), { wrapper });
      const fulId = await createRes.current.mutateAsync({
        customerOrderId: 'ord-100',
        vendorId: 'ven-100',
      });

      const { result: packRes } = renderHook(() => usePackFulfillmentMutation(mockApi), { wrapper });
      await packRes.current.mutateAsync(fulId);
      expect(mockApi.fulfillments.find((f) => f.id === fulId)?.status).toBe('Packed');

      const { result: dispatchRes } = renderHook(() => useDispatchFulfillmentMutation(mockApi), { wrapper });
      await dispatchRes.current.mutateAsync(fulId);
      expect(mockApi.fulfillments.find((f) => f.id === fulId)?.status).toBe('Dispatched');

      const { result: deliverRes } = renderHook(() => useDeliverFulfillmentMutation(mockApi), { wrapper });
      await deliverRes.current.mutateAsync(fulId);
      expect(mockApi.fulfillments.find((f) => f.id === fulId)?.status).toBe('Delivered');

      const { result: listRes } = renderHook(() => useFulfillmentsQuery('Delivered', mockApi), { wrapper });
      await waitFor(() => expect(listRes.current.isSuccess).toBe(true));
      expect(listRes.current.data?.length).toBe(1);
    });

    it('flujo de devoluciones y facturas', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result: retRes } = renderHook(() => useRequestReturnMutation(mockApi), { wrapper });
      const returnId = await retRes.current.mutateAsync({
        customerOrderId: 'ord-100',
        variantId: 'var-100',
        warehouseId: 'wh-100',
        quantity: 1,
      });

      const { result: approveRes } = renderHook(() => useApproveReturnMutation(mockApi), { wrapper });
      await approveRes.current.mutateAsync(returnId);
      expect(mockApi.returns.find((r) => r.id === returnId)?.status).toBe('Approved');

      const { result: returnsRes } = renderHook(() => useReturnsQuery('Approved', mockApi), { wrapper });
      await waitFor(() => expect(returnsRes.current.isSuccess).toBe(true));
      expect(returnsRes.current.data?.length).toBe(1);

      const { result: invGenRes } = renderHook(() => useGenerateInvoicesMutation(mockApi), { wrapper });
      await invGenRes.current.mutateAsync('ord-100');
      expect(mockApi.invoices.length).toBe(1);

      const { result: invoicesRes } = renderHook(() => useInvoicesQuery(mockApi), { wrapper });
      await waitFor(() => expect(invoicesRes.current.isSuccess).toBe(true));
      expect(invoicesRes.current.data?.length).toBe(1);
    });

    it('useHealthQuery verifica la salud del backend', async () => {
      const { wrapper } = createWrapper();
      const mockApi = new MockZentricApiAdapter();

      const { result } = renderHook(() => useHealthQuery(mockApi), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.status).toBe('healthy');
    });
  });
});
