import { useQuery } from '@tanstack/react-query';
import { mockDataSource } from '@/shared/api/data-source';
import type { DashboardPeriod } from '@/shared/types/domain';
import { useUiStore } from '@/app/stores/ui-store';

export function useEstablishmentsQuery() {
  return useQuery({
    queryKey: ['establishments'],
    queryFn: () => mockDataSource.listEstablishments(),
  });
}

export function useDashboardQuery(period: DashboardPeriod) {
  const establishmentId = useUiStore((state) => state.establishmentId);
  return useQuery({
    queryKey: ['dashboard', establishmentId, period],
    queryFn: () => mockDataSource.getDashboard(establishmentId, period),
  });
}

export function useTablesQuery() {
  return useQuery({ queryKey: ['tables'], queryFn: () => mockDataSource.listTables() });
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
  });
}

export function usePizzaOptionsQuery() {
  return useQuery({
    queryKey: ['pizza-options'],
    queryFn: () => mockDataSource.listPizzaOptions(),
  });
}

export function useOrdersQuery() {
  return useQuery({ queryKey: ['orders'], queryFn: () => mockDataSource.listOrders() });
}

export function useKitchenSeedsQuery() {
  return useQuery({
    queryKey: ['kitchen-seeds'],
    queryFn: () => mockDataSource.listKitchenSeeds(),
  });
}

export function useStaffQuery() {
  return useQuery({ queryKey: ['staff'], queryFn: () => mockDataSource.listStaff() });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => mockDataSource.listNotifications(),
  });
}
