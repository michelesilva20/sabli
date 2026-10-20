import { useMutation, useQuery } from '@tanstack/react-query';
import {
  changeTableAvailability,
  changeTableStatus,
  closeService,
  createTable,
  getTable,
  listEstablishmentServices,
  listTableHistory,
  listTables,
  openService,
  reopenService,
  requestBill,
  updateTable,
  type DiningTableStatus,
  type TableAvailability,
  type TableWriteBody,
} from '@/shared/api/dining';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';

export function diningKeys(establishmentId: string) {
  return {
    all: ['dining', establishmentId] as const,
    tables: (includeInactive: boolean) =>
      ['dining', establishmentId, 'tables', includeInactive] as const,
    table: (tableId: string) => ['dining', establishmentId, 'table', tableId] as const,
    history: (tableId: string) => ['dining', establishmentId, 'history', tableId] as const,
    services: ['dining', establishmentId, 'services'] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function invalidateDining(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: diningKeys(establishmentId).all });
}

function invalidateDiningAndBilling(establishmentId: string) {
  return Promise.all([
    invalidateDining(establishmentId),
    appQueryClient.invalidateQueries({ queryKey: ['billing', establishmentId] }),
  ]);
}

export function useDiningTablesQuery(includeInactive = false) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: diningKeys(establishmentId ?? '').tables(includeInactive),
    queryFn: () => listTables(establishmentId!, includeInactive),
    enabled: Boolean(establishmentId),
  });
}

export function useDiningTableQuery(tableId: string | null) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: diningKeys(establishmentId ?? '').table(tableId ?? ''),
    queryFn: () => getTable(establishmentId!, tableId!),
    enabled: Boolean(establishmentId && tableId),
  });
}

export function useDiningHistoryQuery(tableId: string | null) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: diningKeys(establishmentId ?? '').history(tableId ?? ''),
    queryFn: () => listTableHistory(establishmentId!, tableId!),
    enabled: Boolean(establishmentId && tableId),
  });
}

export function useEstablishmentServicesQuery(enabled = false) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: diningKeys(establishmentId ?? '').services,
    queryFn: () => listEstablishmentServices(establishmentId!),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useOpenServiceMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { tableId: string; guests: number }) =>
      openService(establishmentId!, input.tableId, input.guests),
    onSuccess: () => establishmentId && invalidateDiningAndBilling(establishmentId),
  });
}

export function useRequestBillMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (tableId: string) => requestBill(establishmentId!, tableId),
    onSuccess: () => establishmentId && invalidateDiningAndBilling(establishmentId),
  });
}

export function useReopenServiceMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (tableId: string) => reopenService(establishmentId!, tableId),
    onSuccess: () => establishmentId && invalidateDiningAndBilling(establishmentId),
  });
}

export function useCloseServiceMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (tableId: string) => closeService(establishmentId!, tableId),
    onSuccess: () => establishmentId && invalidateDiningAndBilling(establishmentId),
  });
}

export function useCreateTableMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (body: TableWriteBody) => createTable(establishmentId!, body),
    onSuccess: () => establishmentId && invalidateDining(establishmentId),
  });
}

export function useUpdateTableMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { tableId: string; body: TableWriteBody }) =>
      updateTable(establishmentId!, input.tableId, input.body),
    onSuccess: () => establishmentId && invalidateDining(establishmentId),
  });
}

export function useTableAvailabilityMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { tableId: string; availability: TableAvailability; version: number }) =>
      changeTableAvailability(establishmentId!, input.tableId, {
        availability: input.availability,
        version: input.version,
      }),
    onSuccess: () => establishmentId && invalidateDining(establishmentId),
  });
}

export function useTableStatusMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { tableId: string; status: DiningTableStatus; version?: number }) =>
      changeTableStatus(establishmentId!, input.tableId, {
        status: input.status,
        version: input.version,
      }),
    onSuccess: () => establishmentId && invalidateDining(establishmentId),
  });
}
