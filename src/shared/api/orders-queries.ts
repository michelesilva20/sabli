import { useMutation, useQuery } from '@tanstack/react-query';
import {
  advanceKitchenItem,
  advanceKitchenTicket,
  getOrder,
  listKitchenTickets,
  listOrders,
  placeOrder,
  type OrderListQuery,
  type PlaceOrderBody,
  type ProductionStatus,
} from '@/shared/api/orders';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';

export function ordersKeys(establishmentId: string) {
  return {
    all: ['orders', establishmentId] as const,
    list: (filters: OrderListQuery) => ['orders', establishmentId, 'list', filters] as const,
    detail: (orderId: string) => ['orders', establishmentId, 'detail', orderId] as const,
    kitchen: ['orders', establishmentId, 'kitchen'] as const,
    tickets: (status?: ProductionStatus) =>
      ['orders', establishmentId, 'kitchen', 'tickets', status ?? 'all'] as const,
    ticket: (ticketId: string) => ['orders', establishmentId, 'kitchen', 'ticket', ticketId] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function invalidateOrders(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: ordersKeys(establishmentId).all });
}

const liveQuery = {
  staleTime: 4_000,
  refetchInterval: 8_000,
  refetchIntervalInBackground: false,
} as const;

export function useOrdersQuery(filters: OrderListQuery) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: ordersKeys(establishmentId ?? '').list(filters),
    queryFn: () => listOrders(establishmentId!, filters),
    enabled: Boolean(establishmentId),
    ...liveQuery,
  });
}

export function useOrderQuery(orderId: string | null) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: ordersKeys(establishmentId ?? '').detail(orderId ?? ''),
    queryFn: () => getOrder(establishmentId!, orderId!),
    enabled: Boolean(establishmentId && orderId),
    ...liveQuery,
  });
}

export function useKitchenTicketsQuery(productionStatus?: ProductionStatus) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: ordersKeys(establishmentId ?? '').tickets(productionStatus),
    queryFn: () => listKitchenTickets(establishmentId!, { productionStatus }),
    enabled: Boolean(establishmentId),
    ...liveQuery,
  });
}

export function usePlaceOrderMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { body: PlaceOrderBody; idempotencyKey: string }) =>
      placeOrder(establishmentId!, input.body, input.idempotencyKey),
    onSuccess: () => {
      if (!establishmentId) return;
      return Promise.all([
        invalidateOrders(establishmentId),
        appQueryClient.invalidateQueries({ queryKey: ['billing', establishmentId] }),
      ]);
    },
  });
}

export function useAdvanceTicketMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { ticketId: string; version: number }) =>
      advanceKitchenTicket(establishmentId!, input.ticketId, input.version),
    onSuccess: () => establishmentId && invalidateOrders(establishmentId),
  });
}

export function useAdvanceTicketItemMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { ticketId: string; itemId: string; version: number }) =>
      advanceKitchenItem(establishmentId!, input.ticketId, input.itemId, input.version),
    onSuccess: () => establishmentId && invalidateOrders(establishmentId),
  });
}
