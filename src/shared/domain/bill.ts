import type { PaymentMethod } from '@/shared/types/domain';
import { sumCents } from '@/shared/domain/money';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  voucher: 'Vale',
};

export function splitBill(totalCents: number, people: number): number[] {
  if (!Number.isInteger(people) || people < 1) {
    throw new Error('Informe ao menos uma pessoa para dividir a conta.');
  }
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error('O valor da conta precisa ser um inteiro em centavos.');
  }

  const base = Math.floor(totalCents / people);
  const remainder = totalCents - base * people;
  return Array.from({ length: people }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function paidCents(payments: { appliedCents: number }[]) {
  return sumCents(payments.map((payment) => payment.appliedCents));
}

export function remainingCents(totalCents: number, alreadyPaidCents: number) {
  return Math.max(0, totalCents - alreadyPaidCents);
}

export type TenderFailure = 'empty' | 'over_remaining' | 'settled';

export function applyTender(input: {
  remainingCents: number;
  method: PaymentMethod;
  tenderedCents: number;
}):
  | { ok: false; reason: TenderFailure }
  | { ok: true; appliedCents: number; tenderedCents: number; changeCents: number } {
  const remaining = input.remainingCents;
  const tendered = Math.trunc(input.tenderedCents);
  if (remaining <= 0) return { ok: false, reason: 'settled' };
  if (!Number.isInteger(tendered) || tendered <= 0) return { ok: false, reason: 'empty' };
  if (input.method === 'cash') {
    return {
      ok: true,
      appliedCents: Math.min(tendered, remaining),
      tenderedCents: tendered,
      changeCents: Math.max(0, tendered - remaining),
    };
  }
  if (tendered > remaining) return { ok: false, reason: 'over_remaining' };
  return {
    ok: true,
    appliedCents: tendered,
    tenderedCents: tendered,
    changeCents: 0,
  };
}

export interface CashMovementLike {
  type: 'opening' | 'sale' | 'in' | 'out';
  amountCents: number;
  method?: PaymentMethod;
}

export function drawerCashCents(movements: CashMovementLike[]) {
  return sumCents(
    movements.map((movement) => {
      if (movement.type === 'opening' || movement.type === 'in') return movement.amountCents;
      if (movement.type === 'out') return -movement.amountCents;
      if (movement.type === 'sale' && movement.method === 'cash') return movement.amountCents;
      return 0;
    }),
  );
}

export function salesByMethod(movements: CashMovementLike[]): Record<PaymentMethod, number> {
  const totals: Record<PaymentMethod, number> = {
    pix: 0,
    credit: 0,
    debit: 0,
    cash: 0,
    voucher: 0,
  };
  for (const movement of movements) {
    if (movement.type !== 'sale' || !movement.method) continue;
    totals[movement.method] += movement.amountCents;
  }
  return totals;
}
