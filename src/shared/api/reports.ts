import { z } from 'zod';
import { apiRequest, withQuery } from '@/shared/api/http-client';

const periodMetaSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  timezone: z.string().min(1),
  timezoneSource: z.string().min(1),
  fromInclusive: z.string().min(1),
  toExclusive: z.string().min(1),
  channel: z.string().nullable().optional(),
  saleDateField: z.string().min(1),
  receiptDateField: z.string().min(1),
});

const dayPointSchema = z.object({
  date: z.string().min(1),
  count: z.number().int(),
  cents: z.number().int(),
});

const channelPointSchema = z.object({
  channel: z.enum(['TABLE', 'COUNTER']),
  count: z.number().int(),
  cents: z.number().int(),
});

export const reportOverviewSchema = z.object({
  period: periodMetaSchema,
  receivedCents: z.number().int(),
  soldCents: z.number().int(),
  salesCount: z.number().int(),
  averageTicketCents: z.number().int(),
  averageTicketUnit: z.literal('CONFIRMED_ORDER'),
  inProductionOrders: z.number().int(),
  occupiedTables: z.number().int(),
  totalTables: z.number().int(),
  pendingBills: z.number().int(),
  pendingCents: z.number().int(),
  metricScope: z.record(z.string(), z.string()),
  definitions: z.record(z.string(), z.string()),
});

export const reportSalesSchema = z.object({
  period: periodMetaSchema,
  salesCount: z.number().int(),
  soldCents: z.number().int(),
  averageTicketCents: z.number().int(),
  averageTicketUnit: z.literal('CONFIRMED_ORDER'),
  byDay: z.array(dayPointSchema),
  byChannel: z.array(channelPointSchema),
});

export const reportRevenueSchema = z.object({
  period: periodMetaSchema,
  receivedCents: z.number().int(),
  paymentCount: z.number().int(),
  byDay: z.array(dayPointSchema),
});

export const reportProductsSchema = z.object({
  period: periodMetaSchema,
  total: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
  items: z.array(
    z.object({
      productId: z.string().nullable(),
      productName: z.string().min(1),
      quantity: z.number().int(),
      soldCents: z.number().int(),
    }),
  ),
});

export const reportPaymentsSchema = z.object({
  period: periodMetaSchema,
  receivedCents: z.number().int(),
  paymentCount: z.number().int(),
  byMethod: z.array(
    z.object({
      method: z.enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']),
      count: z.number().int(),
      receivedCents: z.number().int(),
      percent: z.number().int(),
    }),
  ),
});

export const reportOperationsSchema = z.object({
  period: periodMetaSchema,
  inProductionOrders: z.number().int(),
  occupiedTables: z.number().int(),
  occupiedOpen: z.number().int(),
  awaitingBill: z.number().int(),
  totalTables: z.number().int(),
  pendingBills: z.number().int(),
  pendingCents: z.number().int(),
  servicesOpenedInPeriod: z.number().int(),
  servicesClosedInPeriod: z.number().int(),
});

export type ReportOverview = z.infer<typeof reportOverviewSchema>;
export type ReportSales = z.infer<typeof reportSalesSchema>;
export type ReportRevenue = z.infer<typeof reportRevenueSchema>;
export type ReportProducts = z.infer<typeof reportProductsSchema>;
export type ReportPayments = z.infer<typeof reportPaymentsSchema>;
export type ReportOperations = z.infer<typeof reportOperationsSchema>;
export type ReportChannel = 'TABLE' | 'COUNTER';
export type ReportPeriodQuery = {
  from: string;
  to: string;
  timezone?: string;
  channel?: ReportChannel | '';
  page?: number;
  size?: number;
};

export const REPORT_TIMEZONE = 'America/Sao_Paulo';

export const REPORT_METHOD_LABEL = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Débito',
  CREDIT_CARD: 'Crédito',
} as const;

export const REPORT_METHOD_COLOR = {
  CASH: 'var(--primary)',
  PIX: 'var(--accent)',
  DEBIT_CARD: 'var(--secondary)',
  CREDIT_CARD: 'var(--info)',
} as const;

export const REPORT_CHANNEL_LABEL = {
  TABLE: 'Mesa',
  COUNTER: 'Balcão',
} as const;

export function toCivilDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromCivilDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function shiftCivilDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function presetRange(preset: 'today' | '7d' | '30d', today = new Date()) {
  if (preset === 'today') return { from: toCivilDate(today), to: toCivilDate(today) };
  if (preset === '7d') return { from: toCivilDate(shiftCivilDate(today, -6)), to: toCivilDate(today) };
  return { from: toCivilDate(shiftCivilDate(today, -29)), to: toCivilDate(today) };
}

function reportsPath(establishmentId: string, suffix: string, query: ReportPeriodQuery) {
  return withQuery(`/establishments/${establishmentId}/reports${suffix}`, {
    from: query.from,
    to: query.to,
    timezone: query.timezone ?? REPORT_TIMEZONE,
    channel: query.channel || undefined,
    page: query.page,
    size: query.size,
  });
}

export function getReportOverview(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportOverviewSchema, {
    path: reportsPath(establishmentId, '/overview', query),
  });
}

export function getReportSales(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportSalesSchema, {
    path: reportsPath(establishmentId, '/sales', query),
  });
}

export function getReportRevenue(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportRevenueSchema, {
    path: reportsPath(establishmentId, '/revenue', query),
  });
}

export function getReportProducts(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportProductsSchema, {
    path: reportsPath(establishmentId, '/products', query),
  });
}

export function getReportPayments(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportPaymentsSchema, {
    path: reportsPath(establishmentId, '/payments', query),
  });
}

export function getReportOperations(establishmentId: string, query: ReportPeriodQuery) {
  return apiRequest(reportOperationsSchema, {
    path: reportsPath(establishmentId, '/operations', query),
  });
}
