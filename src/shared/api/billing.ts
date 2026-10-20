import { z } from 'zod';
import { apiRequest } from '@/shared/api/http-client';
import { orderChannelSchema, orderItemResponseSchema } from '@/shared/api/orders';
import type { PaymentMethod } from '@/shared/types/domain';

export const apiPaymentMethodSchema = z.enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']);
export const billKindSchema = z.enum(['TABLE', 'COUNTER']);
export const billStatusSchema = z.enum(['OPEN', 'PARTIALLY_PAID', 'SETTLED']);
export const captureKindSchema = z.enum(['MANUAL_DECLARED']);

export const paymentResponseSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  cashSessionId: z.string().uuid().nullable().optional(),
  method: apiPaymentMethodSchema,
  captureKind: captureKindSchema,
  tenderedCents: z.number().int(),
  appliedCents: z.number().int(),
  changeCents: z.number().int(),
  recordedByName: z.string(),
  notes: z.string().nullable().optional(),
  recordedAt: z.string(),
  version: z.number().int(),
});

export const billOrderSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int(),
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  placedAt: z.string(),
  items: z.array(orderItemResponseSchema),
});

export const billResponseSchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  kind: billKindSchema,
  tableId: z.string().uuid().nullable().optional(),
  tableNumber: z.number().int().nullable().optional(),
  tableServiceId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  remainingCents: z.number().int(),
  status: billStatusSchema,
  settled: z.boolean(),
  settledAt: z.string().nullable().optional(),
  version: z.number().int(),
  orders: z.array(billOrderSchema),
  payments: z.array(paymentResponseSchema),
});

export const paymentPageSchema = z.object({
  items: z.array(paymentResponseSchema),
});

export type ApiPaymentMethod = z.infer<typeof apiPaymentMethodSchema>;
export type BillKind = z.infer<typeof billKindSchema>;
export type BillStatus = z.infer<typeof billStatusSchema>;
export type BillResponse = z.infer<typeof billResponseSchema>;
export type BillOrder = z.infer<typeof billOrderSchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

export type RegisterPaymentBody = {
  method: ApiPaymentMethod;
  tenderedCents: number;
  notes?: string;
  version?: number;
};

const uiToApi: Record<Exclude<PaymentMethod, 'voucher'>, ApiPaymentMethod> = {
  cash: 'CASH',
  pix: 'PIX',
  debit: 'DEBIT_CARD',
  credit: 'CREDIT_CARD',
};

export function toApiPaymentMethod(method: PaymentMethod): ApiPaymentMethod {
  if (method === 'voucher') {
    throw new Error('Vale não existe no backend.');
  }
  return uiToApi[method];
}

export function toUiPaymentMethod(method: ApiPaymentMethod): Exclude<PaymentMethod, 'voucher'> {
  if (method === 'CASH') return 'cash';
  if (method === 'PIX') return 'pix';
  if (method === 'DEBIT_CARD') return 'debit';
  return 'credit';
}

export const BILL_STATUS_LABEL: Record<BillStatus, string> = {
  OPEN: 'Pendente',
  PARTIALLY_PAID: 'Parcial',
  SETTLED: 'Quitado',
};

export function billChannelLabel(bill: BillResponse) {
  if (bill.kind === 'COUNTER') return 'Balcão';
  return `Mesa ${String(bill.tableNumber ?? 0).padStart(2, '0')}`;
}

function billingPath(establishmentId: string, suffix: string) {
  return `/establishments/${establishmentId}${suffix}`;
}

export function getBillByService(establishmentId: string, tableServiceId: string) {
  return apiRequest(billResponseSchema, {
    path: billingPath(establishmentId, `/table-services/${tableServiceId}/bill`),
  });
}

export function getBillByOrder(establishmentId: string, orderId: string) {
  return apiRequest(billResponseSchema, {
    path: billingPath(establishmentId, `/orders/${orderId}/bill`),
  });
}

export function getBill(establishmentId: string, billId: string) {
  return apiRequest(billResponseSchema, {
    path: billingPath(establishmentId, `/bills/${billId}`),
  });
}

export function listBillPayments(establishmentId: string, billId: string) {
  return apiRequest(paymentPageSchema, {
    path: billingPath(establishmentId, `/bills/${billId}/payments`),
  });
}

export function registerPayment(
  establishmentId: string,
  billId: string,
  body: RegisterPaymentBody,
  idempotencyKey: string,
) {
  return apiRequest(paymentResponseSchema, {
    path: billingPath(establishmentId, `/bills/${billId}/payments`),
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export { orderChannelSchema };
