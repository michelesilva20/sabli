import { describe, expect, it } from 'vitest';
import { apiEst, apiEstBairro } from '@/test/api-fixtures';
import { serviceOpenId } from '@/test/dining-fixtures';
import {
  addDraftLine,
  canBindDraftContext,
  draftBlocksEstablishmentSwitch,
  ensureIdempotencyKey,
  getOrderDraft,
  quotedDraftTotalCents,
  resetOrderDraft,
  setDraftContext,
  setDraftQuantity,
} from '@/shared/orders/order-draft';

const tableContext = {
  establishmentId: apiEst.id,
  channel: 'TABLE' as const,
  tableId: '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a02',
  tableServiceId: serviceOpenId,
  tableNumber: 2,
};

const counterContext = {
  establishmentId: apiEst.id,
  channel: 'COUNTER' as const,
  tableId: null,
  tableServiceId: null,
  tableNumber: null,
};

describe('rascunho de pedido', () => {
  it('isola rascunho por mesa e limpa na troca de contexto', () => {
    setDraftContext(tableContext);
    addDraftLine({
      productId: '88888888-8888-4888-8888-888888888888',
      variantId: '12121212-1212-4121-8121-121212121211',
      kind: 'STANDARD',
      name: 'Refrigerante',
      quantity: 1,
      quotedUnitCents: 800,
    });
    expect(canBindDraftContext(tableContext)).toBe(true);
    expect(canBindDraftContext(counterContext)).toBe(false);
    expect(draftBlocksEstablishmentSwitch(apiEstBairro.id)).toBe(true);
    expect(draftBlocksEstablishmentSwitch(apiEst.id)).toBe(false);
    setDraftContext(counterContext);
    expect(getOrderDraft().lines).toHaveLength(0);
  });

  it('reusa a chave de idempotência na mesma tentativa e troca ao editar', () => {
    setDraftContext(counterContext);
    addDraftLine({
      productId: '88888888-8888-4888-8888-888888888888',
      kind: 'STANDARD',
      name: 'Refrigerante',
      quantity: 1,
      quotedUnitCents: 800,
    });
    const first = ensureIdempotencyKey();
    expect(ensureIdempotencyKey()).toBe(first);
    setDraftQuantity(getOrderDraft().lines[0].localId, 2);
    expect(getOrderDraft().idempotencyKey).toBeNull();
    expect(quotedDraftTotalCents()).toBe(1600);
    const second = ensureIdempotencyKey();
    expect(second).not.toBe(first);
  });

  it('não persiste o rascunho operacional', () => {
    setDraftContext(counterContext);
    addDraftLine({
      productId: '88888888-8888-4888-8888-888888888888',
      kind: 'STANDARD',
      name: 'Refrigerante',
      quantity: 1,
      quotedUnitCents: 800,
    });
    expect(localStorage.getItem('sabli-order-draft')).toBeNull();
    resetOrderDraft();
    expect(getOrderDraft().lines).toHaveLength(0);
  });
});
