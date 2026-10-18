import { percentOfCents, sumCents } from '@/shared/domain/money';
import type { PizzaComposition, PizzaFlavorPortion } from '@/shared/types/domain';

export const ILLUSTRATIVE_DISCOUNT_PERCENT = 10;

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

export function flavorPortionLabel(flavor: PizzaFlavorPortion): string {
  return `${flavor.numerator}/${flavor.denominator} ${flavor.name}`;
}

export function saleItemTitle(item: { name: string; pizza?: PizzaComposition }): string {
  if (!item.pizza || item.pizza.flavors.length === 0) return item.name;
  return `${item.name} · ${item.pizza.flavors.map(flavorPortionLabel).join(', ')}`;
}
