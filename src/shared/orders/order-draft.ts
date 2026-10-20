import { useSyncExternalStore } from 'react';
import type { OrderChannel, PlaceOrderItem } from '@/shared/api/orders';
import { lineTotalCents } from '@/shared/domain/order';

export type DraftPizza = {
  sizeId: string;
  sizeName: string;
  flavorIds: string[];
  flavors: { id: string; name: string }[];
  crustId?: string;
  crustName?: string;
  extraIds: string[];
  extras: { id: string; name: string }[];
};

export type DraftLine = {
  localId: string;
  productId: string;
  variantId?: string;
  kind: 'STANDARD' | 'PIZZA';
  name: string;
  quantity: number;
  quotedUnitCents: number;
  notes?: string;
  pizza?: DraftPizza;
};

export type DraftContext = {
  establishmentId: string;
  channel: OrderChannel;
  tableId: string | null;
  tableServiceId: string | null;
  tableNumber: number | null;
};

export type OrderDraft = {
  context: DraftContext | null;
  lines: DraftLine[];
  idempotencyKey: string | null;
};

const emptyDraft: OrderDraft = {
  context: null,
  lines: [],
  idempotencyKey: null,
};

let draft: OrderDraft = emptyDraft;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function newId() {
  return crypto.randomUUID();
}

export function getOrderDraft(): OrderDraft {
  return draft;
}

export function subscribeOrderDraft(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrderDraft() {
  return useSyncExternalStore(subscribeOrderDraft, getOrderDraft, getOrderDraft);
}

export function resetOrderDraft() {
  draft = { context: null, lines: [], idempotencyKey: null };
  emit();
}

export function contextKey(context: DraftContext | null) {
  if (!context) return '';
  return `${context.establishmentId}:${context.channel}:${context.tableServiceId ?? 'counter'}`;
}

export function sameDraftContext(left: DraftContext | null, right: DraftContext | null) {
  return contextKey(left) === contextKey(right);
}

export function hasActiveDraft(establishmentId?: string) {
  if (draft.lines.length === 0) return false;
  if (!establishmentId) return true;
  return draft.context?.establishmentId === establishmentId;
}

export function draftBlocksEstablishmentSwitch(targetEstablishmentId: string) {
  if (draft.lines.length === 0) return false;
  return draft.context?.establishmentId !== targetEstablishmentId;
}

export function canBindDraftContext(next: DraftContext) {
  if (draft.lines.length === 0) return true;
  return sameDraftContext(draft.context, next);
}

export function setDraftContext(next: DraftContext) {
  if (sameDraftContext(draft.context, next)) return;
  draft = {
    context: next,
    lines: [],
    idempotencyKey: null,
  };
  emit();
}

export function ensureDraftContext(next: DraftContext) {
  if (!draft.context) {
    draft = { ...draft, context: next };
    emit();
    return;
  }
  if (!sameDraftContext(draft.context, next) && draft.lines.length === 0) {
    draft = { ...draft, context: next, idempotencyKey: null };
    emit();
  }
}

export function addDraftLine(line: Omit<DraftLine, 'localId'>) {
  draft = {
    ...draft,
    lines: [...draft.lines, { ...line, localId: newId() }],
    idempotencyKey: null,
  };
  emit();
}

export function setDraftQuantity(localId: string, quantity: number) {
  if (quantity < 1) {
    removeDraftLine(localId);
    return;
  }
  draft = {
    ...draft,
    lines: draft.lines.map((line) => (line.localId === localId ? { ...line, quantity } : line)),
    idempotencyKey: null,
  };
  emit();
}

export function removeDraftLine(localId: string) {
  draft = {
    ...draft,
    lines: draft.lines.filter((line) => line.localId !== localId),
    idempotencyKey: null,
  };
  emit();
}

export function quotedDraftTotalCents(lines: DraftLine[] = draft.lines) {
  return lines.reduce((sum, line) => sum + lineTotalCents({ quantity: line.quantity, unitPriceCents: line.quotedUnitCents }), 0);
}

export function ensureIdempotencyKey() {
  if (draft.idempotencyKey) return draft.idempotencyKey;
  const key = newId().replace(/-/g, '').slice(0, 32);
  draft = { ...draft, idempotencyKey: key };
  emit();
  return key;
}

export function clearConfirmedDraft() {
  draft = { context: draft.context, lines: [], idempotencyKey: null };
  emit();
}

export function toPlaceItems(lines: DraftLine[]): PlaceOrderItem[] {
  return lines.map((line) => ({
    productId: line.productId || undefined,
    variantId: line.kind === 'STANDARD' ? line.variantId : undefined,
    quantity: line.quantity,
    notes: line.notes,
    pizza: line.pizza
      ? {
          sizeId: line.pizza.sizeId,
          flavorIds: line.pizza.flavorIds,
          crustId: line.pizza.crustId,
          extraIds: line.pizza.extraIds,
        }
      : undefined,
  }));
}
