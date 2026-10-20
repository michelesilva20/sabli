import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import {
  getBill,
  getBillByOrder,
  getBillByService,
  listBillPayments,
  registerPayment,
  type BillResponse,
  type RegisterPaymentBody,
} from '@/shared/api/billing';
import { useDiningTablesQuery } from '@/shared/api/dining-queries';
import { useOrdersQuery } from '@/shared/api/orders-queries';
import { financeErrorMessage } from '@/shared/api/finance-errors';
import { ApiError } from '@/shared/api/http-client';
import { invalidateDining } from '@/shared/api/dining-queries';
import { invalidateOrders } from '@/shared/api/orders-queries';
import { invalidateReports } from '@/shared/api/reports-queries';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';
import { clearPaymentAttempt, paymentAttemptKey } from '@/shared/billing/payment-attempt';

export function billingKeys(establishmentId: string) {
  return {
    all: ['billing', establishmentId] as const,
    bill: (billId: string) => ['billing', establishmentId, 'bill', billId] as const,
    byService: (serviceId: string) => ['billing', establishmentId, 'service', serviceId] as const,
    byOrder: (orderId: string) => ['billing', establishmentId, 'order', orderId] as const,
    payments: (billId: string) => ['billing', establishmentId, 'payments', billId] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function invalidateBilling(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: billingKeys(establishmentId).all });
}

export function invalidateFinance(establishmentId: string) {
  return Promise.all([
    invalidateBilling(establishmentId),
    invalidateDining(establishmentId),
    invalidateOrders(establishmentId),
    invalidateReports(establishmentId),
    appQueryClient.invalidateQueries({ queryKey: ['cash', establishmentId] }),
  ]);
}

const liveQuery = {
  staleTime: 4_000,
  refetchInterval: 8_000,
  refetchIntervalInBackground: false,
} as const;

export function useBillQuery(billId: string | null) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: billingKeys(establishmentId ?? '').bill(billId ?? ''),
    queryFn: () => getBill(establishmentId!, billId!),
    enabled: Boolean(establishmentId && billId),
    ...liveQuery,
  });
}

export function useBillByServiceQuery(tableServiceId: string | null, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: billingKeys(establishmentId ?? '').byService(tableServiceId ?? ''),
    queryFn: () => getBillByService(establishmentId!, tableServiceId!),
    enabled: Boolean(establishmentId && tableServiceId) && enabled,
    ...liveQuery,
  });
}

export function useBillByOrderQuery(orderId: string | null, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: billingKeys(establishmentId ?? '').byOrder(orderId ?? ''),
    queryFn: () => getBillByOrder(establishmentId!, orderId!),
    enabled: Boolean(establishmentId && orderId) && enabled,
    ...liveQuery,
  });
}

export function useBillPaymentsQuery(billId: string | null) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: billingKeys(establishmentId ?? '').payments(billId ?? ''),
    queryFn: () => listBillPayments(establishmentId!, billId!),
    enabled: Boolean(establishmentId && billId),
    ...liveQuery,
  });
}

export type OpenAccountFilter = 'all' | 'occupied' | 'awaiting_bill' | 'counter';

export type OpenAccount = {
  key: string;
  occupancy: 'occupied' | 'awaiting_bill' | 'counter';
  guests: number | null;
  openedAt: string | null;
  hostName: string | null;
  tableId: string | null;
  bill: BillResponse;
};

export function useOpenAccountsQuery() {
  const establishmentId = useEstablishmentId();
  const tablesQuery = useDiningTablesQuery();
  const ordersQuery = useOrdersQuery({ page: 0, size: 50 });
  const tableTargets = (tablesQuery.data ?? [])
    .filter(
      (table) =>
        table.activeService &&
        (table.occupancy === 'OCCUPIED' || table.occupancy === 'AWAITING_BILL'),
    )
    .map((table) => ({
      table,
      serviceId: table.activeService!.id,
    }));
  const counterOrders = (ordersQuery.data?.items ?? []).filter((order) => order.channel === 'COUNTER');

  const tableBillQueries = useQueries({
    queries: tableTargets.map((target) => ({
      queryKey: billingKeys(establishmentId ?? '').byService(target.serviceId),
      queryFn: () => getBillByService(establishmentId!, target.serviceId),
      enabled: Boolean(establishmentId),
      ...liveQuery,
    })),
  });
  const counterBillQueries = useQueries({
    queries: counterOrders.map((order) => ({
      queryKey: billingKeys(establishmentId ?? '').byOrder(order.id),
      queryFn: () => getBillByOrder(establishmentId!, order.id),
      enabled: Boolean(establishmentId),
      ...liveQuery,
    })),
  });

  const accounts: OpenAccount[] = [];
  tableTargets.forEach((target, index) => {
    const bill = tableBillQueries[index]?.data;
    if (!bill) return;
    accounts.push({
      key: bill.id,
      occupancy: target.table.occupancy === 'AWAITING_BILL' ? 'awaiting_bill' : 'occupied',
      guests: target.table.activeService?.guests ?? null,
      openedAt: target.table.activeService?.openedAt ?? null,
      hostName: target.table.activeService?.hostName ?? null,
      tableId: target.table.id,
      bill,
    });
  });
  counterOrders.forEach((order, index) => {
    const bill = counterBillQueries[index]?.data;
    if (!bill) return;
    accounts.push({
      key: bill.id,
      occupancy: 'counter',
      guests: null,
      openedAt: order.placedAt,
      hostName: order.placedByName,
      tableId: null,
      bill,
    });
  });
  accounts.sort((a, b) => {
    const rank = (item: OpenAccount) =>
      item.bill.status === 'SETTLED' ? 2 : item.occupancy === 'awaiting_bill' ? 0 : 1;
    const byStatus = rank(a) - rank(b);
    if (byStatus !== 0) return byStatus;
    return b.bill.remainingCents - a.bill.remainingCents;
  });

  const pending =
    tablesQuery.isLoading ||
    ordersQuery.isLoading ||
    tableBillQueries.some((query) => query.isLoading) ||
    counterBillQueries.some((query) => query.isLoading);
  const error =
    tablesQuery.error ??
    ordersQuery.error ??
    tableBillQueries.find((query) => query.error)?.error ??
    counterBillQueries.find((query) => query.error)?.error ??
    null;

  return { accounts, pending, error, tablesQuery, ordersQuery };
}

export function useRegisterPaymentMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: {
      establishmentId: string;
      billId: string;
      body: RegisterPaymentBody;
    }) => {
      if (!establishmentId || establishmentId !== input.establishmentId) {
        throw new ApiError(
          409,
          'CONTEXT_CHANGED',
          'Contexto alterado',
          'O estabelecimento mudou. A operação anterior foi cancelada.',
        );
      }
      const key = paymentAttemptKey(input.billId);
      return registerPayment(input.establishmentId, input.billId, input.body, key);
    },
    onSuccess: (_payment, input) => {
      clearPaymentAttempt(input.billId);
      return invalidateFinance(input.establishmentId);
    },
    onError: (error, input) => {
      if (error instanceof ApiError && error.code === 'IDEMPOTENCY_CONFLICT') {
        clearPaymentAttempt(input.billId);
      }
    },
  });
}

export { financeErrorMessage };
