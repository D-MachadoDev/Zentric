import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddCartItemInput,
  Order,
  OrderListItem,
  OrderStatus,
  SellerOrderView,
  ZentricApiPort,
} from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar pedidos.
 */
export function useOrdersQuery(status?: OrderStatus | string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.orders.list({ status }),
    queryFn: () => resolveApi(api).listOrders(status),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para consultar un pedido por id.
 */
export function useOrderQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => resolveApi(api).getOrderById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para crear un nuevo carrito.
 */
export function useCreateCartMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resolveApi(api).createCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook de mutación para añadir una línea al carrito.
 */
export function useAddCartItemMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCartItemInput) => resolveApi(api).addCartItem(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook de mutación para ejecutar el checkout atómico (ventana de 15 minutos).
 * Invalida ['orders'], ['inventories'] y ['fulfillments'].
 */
export function useCheckoutOrderMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => resolveApi(api).checkoutOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
    },
  });
}

/**
 * Hook de mutación para pagar un pedido confirmado.
 * Invalida ['orders'], ['fulfillments'] y ['invoices'].
 */
export function usePayOrderMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => resolveApi(api).payOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class CrearCarritoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(): Promise<string> {
    return this.api.createCart();
  }
}

export { CrearCarritoService as AbrirCarritoService };


export class AgregarLineaCarritoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: AddCartItemInput): Promise<void> {
    return this.api.addCartItem(input);
  }
}

export class ConsultarPedidoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<Order | SellerOrderView> {
    return this.api.getOrderById(id);
  }
}

export class ListarPedidosService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(status?: string): Promise<OrderListItem[]> {
    return this.api.listOrders(status);
  }
}

export class PagarPedidoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(orderId: string): Promise<void> {
    return this.api.payOrder(orderId);
  }
}
