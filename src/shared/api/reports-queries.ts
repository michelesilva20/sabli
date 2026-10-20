import { useQuery } from '@tanstack/react-query';
import {
  getReportOperations,
  getReportOverview,
  getReportPayments,
  getReportProducts,
  getReportRevenue,
  getReportSales,
  type ReportPeriodQuery,
} from '@/shared/api/reports';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';

export function reportsKeys(establishmentId: string) {
  return {
    all: ['reports', establishmentId] as const,
    overview: (query: ReportPeriodQuery) => ['reports', establishmentId, 'overview', query] as const,
    sales: (query: ReportPeriodQuery) => ['reports', establishmentId, 'sales', query] as const,
    revenue: (query: ReportPeriodQuery) => ['reports', establishmentId, 'revenue', query] as const,
    products: (query: ReportPeriodQuery) => ['reports', establishmentId, 'products', query] as const,
    payments: (query: ReportPeriodQuery) => ['reports', establishmentId, 'payments', query] as const,
    operations: (query: ReportPeriodQuery) =>
      ['reports', establishmentId, 'operations', query] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function invalidateReports(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: reportsKeys(establishmentId).all });
}

export function useReportOverviewQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').overview(query),
    queryFn: () => getReportOverview(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useReportSalesQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').sales(query),
    queryFn: () => getReportSales(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useReportRevenueQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').revenue(query),
    queryFn: () => getReportRevenue(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useReportProductsQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').products(query),
    queryFn: () => getReportProducts(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useReportPaymentsQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').payments(query),
    queryFn: () => getReportPayments(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function useReportOperationsQuery(query: ReportPeriodQuery, enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: reportsKeys(establishmentId ?? '').operations(query),
    queryFn: () => getReportOperations(establishmentId!, query),
    enabled: Boolean(establishmentId) && enabled,
  });
}
