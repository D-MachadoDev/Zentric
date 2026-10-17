import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnnulInvoiceInput, Invoice, ZentricApiPort } from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar facturas emitidas.
 */
export function useInvoicesQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.invoices.list(),
    queryFn: () => resolveApi(api).listInvoices(),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta para obtener facturas de un pedido específico.
 */
export function useInvoicesByOrderQuery(orderId: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.invoices.order(orderId),
    queryFn: () => resolveApi(api).getInvoicesByOrder(orderId),
    enabled: Boolean(orderId),
  });
}

/**
 * Hook de mutación para emitir facturas tras pago (Administrador).
 * Invalida ['invoices'] y ['orders'].
 */
export function useGenerateInvoicesMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => resolveApi(api).generateInvoices(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook de mutación para anular facturas de un pedido.
 * Invalida ['invoices'].
 */
export function useAnnulInvoicesMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: AnnulInvoiceInput }) =>
      resolveApi(api).annulInvoices(orderId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class ConsultarFacturasPorPedidoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(orderId: string): Promise<Invoice[]> {
    return this.api.getInvoicesByOrder(orderId);
  }
}
