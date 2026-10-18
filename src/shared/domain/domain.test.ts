import { describe, expect, it } from 'vitest';
import { splitBill } from '@/shared/domain/bill';
import { formatBRL, percentOfCents } from '@/shared/domain/money';
import { orderDiscountCents, orderTotalCents } from '@/shared/domain/order';
import {
  aggregateKitchenStatus,
  applyKitchenTransition,
  kitchenStatusToOrderStatus,
  nextKitchenStatus,
} from '@/shared/domain/kitchen';
import {
  calculatePizzaPrice,
  canAddFlavor,
  equalPortions,
  flavorPriceForSize,
  sizeById,
} from '@/shared/domain/pizza';

describe('dinheiro', () => {
  it('formata centavos em real', () => {
    expect(formatBRL(264850)).toContain('2.648,50');
  });

  it('calcula percentual inteiro', () => {
    expect(percentOfCents(1000, 10)).toBe(100);
    expect(orderDiscountCents(1990, 10)).toBe(199);
    expect(orderTotalCents(1990, 199)).toBe(1791);
  });

  it('divide a conta sem perder centavos', () => {
    expect(splitBill(100, 3)).toEqual([34, 33, 33]);
    expect(splitBill(100, 3).reduce((total, part) => total + part, 0)).toBe(100);
  });
});

describe('pizza', () => {
  const grande = sizeById('grande');
  const media = sizeById('media');
  const prices = { calabresa: 5890, mucarela: 5490, quatro: 6790 };

  it('limita sabores pelo tamanho', () => {
    expect(canAddFlavor(0, sizeById('broto'))).toBe(true);
    expect(canAddFlavor(1, sizeById('broto'))).toBe(false);
    expect(canAddFlavor(2, grande)).toBe(true);
    expect(canAddFlavor(3, grande)).toBe(false);
    expect(media.maxFlavors).toBe(2);
  });

  it('cobra o sabor mais caro no tamanho grande', () => {
    const result = calculatePizzaPrice({
      size: grande,
      flavorPrices: prices,
      portions: equalPortions(['calabresa', 'quatro']),
      crustPriceCents: 800,
      extrasCents: 300,
      strategy: 'highest',
    });
    expect(result.flavorsCents).toBe(6790);
    expect(result.totalCents).toBe(6790 + 800 + 300);
  });

  it('cobra a média proporcional', () => {
    const result = calculatePizzaPrice({
      size: grande,
      flavorPrices: prices,
      portions: equalPortions(['calabresa', 'mucarela']),
      crustPriceCents: 0,
      extrasCents: 0,
      strategy: 'proportional',
    });
    expect(result.flavorsCents).toBe(Math.round((5890 + 5490) / 2));
  });

  it('ajusta o preço ao tamanho', () => {
    const result = calculatePizzaPrice({
      size: media,
      flavorPrices: prices,
      portions: equalPortions(['quatro']),
      crustPriceCents: 0,
      extrasCents: 0,
      strategy: 'highest',
    });
    expect(result.flavorsCents).toBe(Math.round((6790 * 4) / 5));
  });

  it('escala o preço do sabor para cada tamanho', () => {
    const grande = 5890;
    expect(flavorPriceForSize(grande, sizeById('grande'))).toBe(5890);
    expect(flavorPriceForSize(grande, sizeById('broto'))).toBe(Math.round((5890 * 3) / 5));
    expect(flavorPriceForSize(grande, sizeById('media'))).toBe(Math.round((5890 * 4) / 5));
    expect(flavorPriceForSize(grande, sizeById('familia'))).toBe(Math.round((5890 * 7) / 5));
  });

  it('recusa frações que não fecham a pizza', () => {
    expect(() =>
      calculatePizzaPrice({
        size: grande,
        flavorPrices: prices,
        portions: [{ flavorId: 'calabresa', numerator: 1, denominator: 3 }],
        crustPriceCents: 0,
        extrasCents: 0,
        strategy: 'highest',
      }),
    ).toThrow(/frações/i);
  });
});

describe('cozinha', () => {
  it('avança o ticket em uma etapa', () => {
    expect(nextKitchenStatus('waiting')).toBe('preparing');
    expect(nextKitchenStatus('preparing')).toBe('ready');
    expect(nextKitchenStatus('ready')).toBe('delivered');
    expect(nextKitchenStatus('delivered')).toBeNull();
  });

  it('bloqueia transições que pulam ou voltam etapa', () => {
    expect(applyKitchenTransition('waiting', 'ready')).toBeNull();
    expect(applyKitchenTransition('preparing', 'waiting')).toBeNull();
    expect(applyKitchenTransition('delivered', 'ready')).toBeNull();
    expect(applyKitchenTransition('waiting', 'preparing')).toBe('preparing');
  });

  it('agrega o status do pedido a partir dos itens', () => {
    expect(aggregateKitchenStatus(['waiting', 'waiting'])).toBe('waiting');
    expect(kitchenStatusToOrderStatus('waiting')).toBe('aberto');
    expect(aggregateKitchenStatus(['waiting', 'preparing'])).toBe('preparing');
    expect(kitchenStatusToOrderStatus('preparing')).toBe('em preparo');
    expect(aggregateKitchenStatus(['ready', 'delivered'])).toBe('ready');
    expect(kitchenStatusToOrderStatus('ready')).toBe('pronto');
    expect(aggregateKitchenStatus(['delivered', 'delivered'])).toBe('delivered');
    expect(kitchenStatusToOrderStatus('delivered')).toBe('entregue');
  });
});
