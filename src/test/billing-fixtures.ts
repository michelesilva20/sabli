import type { BillResponse, PaymentResponse } from '@/shared/api/billing';
import type { CashSessionResponse } from '@/shared/api/cash';
import { apiEst, apiMe } from '@/test/api-fixtures';
import { serviceOpenId, tableOccupiedId } from '@/test/dining-fixtures';
import { makeOrder, orderItemId } from '@/test/orders-fixtures';

export const tableBillId = 'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1';
export const counterBillId = 'e4e4e4e4-e4e4-44e4-84e4-e4e4e4e4e4e4';
export const paymentId = 'e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2';
export const cashSessionId = 'e3e3e3e3-e3e3-43e3-83e3-e3e3e3e3e3e3';
export const movementId = 'e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5';

function statusOf(totalCents: number, paidCents: number): BillResponse['status'] {
  const remaining = totalCents - paidCents;
  if (remaining === 0) return 'SETTLED';
  if (paidCents > 0) return 'PARTIALLY_PAID';
  return 'OPEN';
}

export function makeBill(overrides: Partial<BillResponse> = {}): BillResponse {
  const order = makeOrder();
  const merged: BillResponse = {
    id: tableBillId,
    establishmentId: apiEst.id,
    kind: 'TABLE',
    tableId: tableOccupiedId,
    tableNumber: 2,
    tableServiceId: serviceOpenId,
    orderId: null,
    subtotalCents: 800,
    discountCents: 0,
    totalCents: 800,
    paidCents: 0,
    remainingCents: 800,
    status: 'OPEN',
    settled: false,
    settledAt: null,
    version: 0,
    orders: [
      {
        id: order.id,
        number: order.number,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        placedAt: order.placedAt,
        items: order.items as BillResponse['orders'][number]['items'],
      },
    ],
    payments: [],
    ...overrides,
  };
  const remainingCents = overrides.remainingCents ?? merged.totalCents - merged.paidCents;
  const status = overrides.status ?? statusOf(merged.totalCents, merged.paidCents);
  return {
    ...merged,
    remainingCents,
    status,
    settled: status === 'SETTLED',
    settledAt: status === 'SETTLED' ? (merged.settledAt ?? '2026-10-20T12:50:00Z') : null,
  };
}

export function makeCounterBill(overrides: Partial<BillResponse> = {}): BillResponse {
  return makeBill({
    id: counterBillId,
    kind: 'COUNTER',
    tableId: null,
    tableNumber: null,
    tableServiceId: null,
    orderId: 'a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2',
    subtotalCents: 7200,
    totalCents: 7200,
    remainingCents: 7200,
    orders: [
      {
        id: 'a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2',
        number: 13,
        subtotalCents: 7200,
        discountCents: 0,
        totalCents: 7200,
        placedAt: '2026-10-19T12:20:00Z',
        items: [
          {
            id: orderItemId,
            kind: 'PIZZA',
            productId: 'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1',
            productName: 'Pizza Grande',
            variantId: null,
            variantName: null,
            quantity: 1,
            unitPriceCents: 7200,
            lineTotalCents: 7200,
            notes: null,
            pizza: null,
            productionStatus: 'WAITING',
            ticketItemId: 'd2d2d2d2-d2d2-42d2-82d2-d2d2d2d2d2d2',
            ticketItemVersion: 0,
          },
        ],
      },
    ],
    ...overrides,
  });
}

export function makePayment(overrides: Partial<PaymentResponse> = {}): PaymentResponse {
  return {
    id: paymentId,
    billId: tableBillId,
    cashSessionId,
    method: 'CASH',
    captureKind: 'MANUAL_DECLARED',
    tenderedCents: 800,
    appliedCents: 800,
    changeCents: 0,
    recordedByName: apiMe.user.name,
    notes: null,
    recordedAt: '2026-10-20T12:45:00Z',
    version: 0,
    ...overrides,
  };
}

export function makeCashSession(overrides: Partial<CashSessionResponse> = {}): CashSessionResponse {
  return {
    id: cashSessionId,
    establishmentId: apiEst.id,
    scope: 'ESTABLISHMENT',
    status: 'OPEN',
    openedByName: apiMe.user.name,
    openedAt: '2026-10-20T12:00:00Z',
    closedAt: null,
    closedByName: null,
    openingFloatCents: 20000,
    expectedCashCents: 20000,
    drawerCashCents: 20000,
    totalsByMethod: {},
    version: 0,
    notes: null,
    movements: [
      {
        id: movementId,
        type: 'OPENING',
        method: null,
        amountCents: 20000,
        paymentId: null,
        recordedByName: apiMe.user.name,
        notes: 'Abertura',
        recordedAt: '2026-10-20T12:00:00Z',
      },
    ],
    ...overrides,
  };
}
