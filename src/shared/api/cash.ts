import { z } from 'zod';
import { ApiError, apiRequest } from '@/shared/api/http-client';
import { apiPaymentMethodSchema } from '@/shared/api/billing';

export const cashScopeSchema = z.enum(['ESTABLISHMENT']);
export const cashSessionStatusSchema = z.enum(['OPEN', 'CLOSED']);
export const cashMovementTypeSchema = z.enum(['OPENING', 'SALE', 'SUPPLY', 'BLEED']);

export const cashMovementSchema = z.object({
  id: z.string().uuid(),
  type: cashMovementTypeSchema,
  method: apiPaymentMethodSchema.nullable().optional(),
  amountCents: z.number().int(),
  paymentId: z.string().uuid().nullable().optional(),
  recordedByName: z.string(),
  notes: z.string().nullable().optional(),
  recordedAt: z.string(),
});

export const cashSessionResponseSchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  scope: cashScopeSchema,
  status: cashSessionStatusSchema,
  openedByName: z.string(),
  openedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  closedByName: z.string().nullable().optional(),
  openingFloatCents: z.number().int(),
  expectedCashCents: z.number().int(),
  drawerCashCents: z.number().int(),
  totalsByMethod: z.record(z.string(), z.number().int()).default({}),
  version: z.number().int(),
  notes: z.string().nullable().optional(),
  movements: z.array(cashMovementSchema),
});

export const cashSessionSummarySchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  scope: cashScopeSchema,
  status: cashSessionStatusSchema,
  openedByName: z.string(),
  openedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  closedByName: z.string().nullable().optional(),
  openingFloatCents: z.number().int(),
  expectedCashCents: z.number().int(),
  version: z.number().int(),
});

export const cashSessionPageSchema = z.object({
  items: z.array(cashSessionSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});

export type CashSessionResponse = z.infer<typeof cashSessionResponseSchema>;
export type CashMovementResponse = z.infer<typeof cashMovementSchema>;
export type CashMovementType = z.infer<typeof cashMovementTypeSchema>;

export const CASH_MOVEMENT_LABEL: Record<CashMovementType, string> = {
  OPENING: 'Abertura',
  SALE: 'Venda',
  SUPPLY: 'Suprimento',
  BLEED: 'Sangria',
};

function cashPath(establishmentId: string, suffix = '') {
  return `/establishments/${establishmentId}/cash/sessions${suffix}`;
}

export function openCashSession(
  establishmentId: string,
  body: { openingFloatCents: number; notes?: string },
) {
  return apiRequest(cashSessionResponseSchema, {
    path: cashPath(establishmentId),
    method: 'POST',
    body,
  });
}

export async function getCurrentCashSession(establishmentId: string) {
  try {
    return await apiRequest(cashSessionResponseSchema, {
      path: cashPath(establishmentId, '/current'),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function listCashSessions(establishmentId: string, page = 0, size = 20) {
  return apiRequest(cashSessionPageSchema, {
    path: cashPath(establishmentId),
    query: { page, size },
  });
}

export function getCashSession(establishmentId: string, sessionId: string) {
  return apiRequest(cashSessionResponseSchema, {
    path: cashPath(establishmentId, `/${sessionId}`),
  });
}

export function addCashMovement(
  establishmentId: string,
  sessionId: string,
  body: { type: 'SUPPLY' | 'BLEED'; amountCents: number; notes?: string },
) {
  return apiRequest(cashSessionResponseSchema, {
    path: cashPath(establishmentId, `/${sessionId}/movements`),
    method: 'POST',
    body,
  });
}

export function closeCashSession(
  establishmentId: string,
  sessionId: string,
  body: { version?: number } = {},
) {
  return apiRequest(cashSessionResponseSchema, {
    path: cashPath(establishmentId, `/${sessionId}/close`),
    method: 'POST',
    body,
  });
}

export function salesTotalCents(session: CashSessionResponse) {
  return Object.values(session.totalsByMethod).reduce((sum, value) => sum + value, 0);
}

export function methodTotalCents(session: CashSessionResponse, method: string) {
  return session.totalsByMethod[method] ?? 0;
}
