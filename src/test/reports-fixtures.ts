import type {
  ReportOperations,
  ReportOverview,
  ReportPayments,
  ReportProducts,
  ReportRevenue,
  ReportSales,
} from '@/shared/api/reports';

export function reportPeriod(from = '2026-10-14', to = '2026-10-20') {
  return {
    from,
    to,
    timezone: 'America/Sao_Paulo',
    timezoneSource: 'DEFAULT',
    fromInclusive: `${from}T03:00:00Z`,
    toExclusive: '2026-10-21T03:00:00Z',
    channel: null,
    saleDateField: 'placed_at',
    receiptDateField: 'recorded_at',
  };
}

export function makeOverview(overrides: Partial<ReportOverview> = {}): ReportOverview {
  return {
    period: reportPeriod(),
    receivedCents: 3900,
    soldCents: 8500,
    salesCount: 6,
    averageTicketCents: 1416,
    averageTicketUnit: 'CONFIRMED_ORDER',
    inProductionOrders: 2,
    occupiedTables: 3,
    totalTables: 8,
    pendingBills: 2,
    pendingCents: 3800,
    metricScope: {
      receivedCents: 'PERIOD',
      soldCents: 'PERIOD',
      occupiedTables: 'CURRENT',
      pendingBills: 'CURRENT',
    },
    definitions: {
      receivedCents: 'Soma de applied_cents',
      soldCents: 'Soma de pedidos confirmados',
    },
    ...overrides,
  };
}

export function makeSales(overrides: Partial<ReportSales> = {}): ReportSales {
  return {
    period: reportPeriod(),
    salesCount: 6,
    soldCents: 8500,
    averageTicketCents: 1416,
    averageTicketUnit: 'CONFIRMED_ORDER',
    byDay: [
      { date: '2026-10-14', count: 1, cents: 800 },
      { date: '2026-10-15', count: 2, cents: 1600 },
      { date: '2026-10-16', count: 0, cents: 0 },
      { date: '2026-10-17', count: 1, cents: 4500 },
      { date: '2026-10-18', count: 1, cents: 800 },
      { date: '2026-10-19', count: 1, cents: 800 },
      { date: '2026-10-20', count: 0, cents: 0 },
    ],
    byChannel: [
      { channel: 'TABLE', count: 2, cents: 1600 },
      { channel: 'COUNTER', count: 4, cents: 6900 },
    ],
    ...overrides,
  };
}

export function makeRevenue(overrides: Partial<ReportRevenue> = {}): ReportRevenue {
  return {
    period: reportPeriod(),
    receivedCents: 3900,
    paymentCount: 5,
    byDay: [
      { date: '2026-10-14', count: 1, cents: 800 },
      { date: '2026-10-15', count: 1, cents: 800 },
      { date: '2026-10-16', count: 0, cents: 0 },
      { date: '2026-10-17', count: 1, cents: 1500 },
      { date: '2026-10-18', count: 1, cents: 800 },
      { date: '2026-10-19', count: 1, cents: 0 },
      { date: '2026-10-20', count: 0, cents: 0 },
    ],
    ...overrides,
  };
}

export function makePayments(overrides: Partial<ReportPayments> = {}): ReportPayments {
  return {
    period: reportPeriod(),
    receivedCents: 3900,
    paymentCount: 5,
    byMethod: [
      { method: 'CASH', count: 1, receivedCents: 800, percent: 21 },
      { method: 'PIX', count: 3, receivedCents: 2300, percent: 59 },
      { method: 'DEBIT_CARD', count: 0, receivedCents: 0, percent: 0 },
      { method: 'CREDIT_CARD', count: 1, receivedCents: 800, percent: 21 },
    ],
    ...overrides,
  };
}

export function makeProducts(overrides: Partial<ReportProducts> = {}): ReportProducts {
  return {
    period: reportPeriod(),
    total: 2,
    page: 0,
    size: 10,
    items: [
      { productId: '88888888-8888-4888-8888-888888888888', productName: 'Pizza', quantity: 1, soldCents: 4500 },
      {
        productId: '99999999-9999-4999-8999-999999999999',
        productName: 'Refrigerante',
        quantity: 5,
        soldCents: 4000,
      },
    ],
    ...overrides,
  };
}

export function makeOperations(overrides: Partial<ReportOperations> = {}): ReportOperations {
  return {
    period: reportPeriod(),
    inProductionOrders: 2,
    occupiedTables: 3,
    occupiedOpen: 2,
    awaitingBill: 1,
    totalTables: 8,
    pendingBills: 2,
    pendingCents: 3800,
    servicesOpenedInPeriod: 4,
    servicesClosedInPeriod: 1,
    ...overrides,
  };
}

export function emptyOverview(): ReportOverview {
  return makeOverview({
    receivedCents: 0,
    soldCents: 0,
    salesCount: 0,
    averageTicketCents: 0,
    inProductionOrders: 0,
    occupiedTables: 0,
    pendingBills: 0,
    pendingCents: 0,
  });
}

export function emptySales(): ReportSales {
  return makeSales({
    salesCount: 0,
    soldCents: 0,
    averageTicketCents: 0,
    byDay: makeSales().byDay.map((point) => ({ ...point, count: 0, cents: 0 })),
    byChannel: [
      { channel: 'TABLE', count: 0, cents: 0 },
      { channel: 'COUNTER', count: 0, cents: 0 },
    ],
  });
}

export function emptyPayments(): ReportPayments {
  return makePayments({
    receivedCents: 0,
    paymentCount: 0,
    byMethod: makePayments().byMethod.map((item) => ({ ...item, count: 0, receivedCents: 0, percent: 0 })),
  });
}

export function emptyRevenue(): ReportRevenue {
  return makeRevenue({
    receivedCents: 0,
    paymentCount: 0,
    byDay: makeRevenue().byDay.map((point) => ({ ...point, count: 0, cents: 0 })),
  });
}

export function emptyProducts(): ReportProducts {
  return makeProducts({ total: 0, items: [] });
}

export function emptyOperations(): ReportOperations {
  return makeOperations({
    inProductionOrders: 0,
    occupiedTables: 0,
    occupiedOpen: 0,
    awaitingBill: 0,
    pendingBills: 0,
    pendingCents: 0,
    servicesOpenedInPeriod: 0,
    servicesClosedInPeriod: 0,
  });
}

export const bairroOverview = makeOverview({
  receivedCents: 500,
  soldCents: 500,
  salesCount: 1,
  averageTicketCents: 500,
  occupiedTables: 0,
  pendingBills: 0,
  pendingCents: 0,
  inProductionOrders: 0,
});
