import { useQuery } from '@tanstack/react-query';
import { mockDataSource } from '@/shared/api/data-source';
import { isDemoMode } from '@/shared/config/runtime';
import type { DashboardPeriod } from '@/shared/types/domain';
import { useUiStore } from '@/app/stores/ui-store';

export function useEstablishmentsQuery() {
  return useQuery({
    queryKey: ['establishments'],
    queryFn: () => mockDataSource.listEstablishments(),
    enabled: isDemoMode(),
  });
}

export function useDashboardQuery(period: DashboardPeriod) {
  const establishmentId = useUiStore((state) => state.establishmentId);
  return useQuery({
    queryKey: ['dashboard', establishmentId, period],
    queryFn: () => mockDataSource.getDashboard(establishmentId, period),
    enabled: isDemoMode(),
  });
}

export function useTablesQuery() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: () => mockDataSource.listTables(),
    enabled: isDemoMode(),
  });
}

export function useCatalogQuery() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const [categories, products] = await Promise.all([
        mockDataSource.listCategories(),
        mockDataSource.listProducts(),
      ]);
      return { categories, products };
    },
    enabled: isDemoMode(),
  });
}

export function usePizzaOptionsQuery() {
  return useQuery({
    queryKey: ['pizza-options'],
    queryFn: () => mockDataSource.listPizzaOptions(),
    enabled: isDemoMode(),
  });
}

export function useOrdersQuery() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => mockDataSource.listOrders(),
    enabled: isDemoMode(),
  });
}

export function useKitchenSeedsQuery() {
  return useQuery({
    queryKey: ['kitchen-seeds'],
    queryFn: () => mockDataSource.listKitchenSeeds(),
    enabled: isDemoMode(),
  });
}

export function useStaffQuery() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => mockDataSource.listStaff(),
    enabled: isDemoMode(),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => mockDataSource.listNotifications(),
    enabled: isDemoMode(),
  });
}
