import { percentOfCents, sumCents } from '@/shared/domain/money';

export interface PricedLine {
  quantity: number;
  unitPriceCents: number;
}

export function lineTotalCents(line: PricedLine): number {
  return line.unitPriceCents * line.quantity;
}

export function orderSubtotalCents(lines: PricedLine[]): number {
  return sumCents(lines.map(lineTotalCents));
}

export function orderDiscountCents(subtotalCents: number, discountPercent: number): number {
  if (discountPercent <= 0) return 0;
  return percentOfCents(subtotalCents, discountPercent);
}

export function orderTotalCents(subtotalCents: number, discountCents: number): number {
  return Math.max(0, subtotalCents - discountCents);
}
