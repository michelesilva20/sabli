import { apiEst, apiMe } from '@/test/api-fixtures';
import { pizzaCrustId, pizzaExtraId, pizzaFlavorId, pizzaSizeId } from '@/test/catalog-fixtures';
import { serviceOpenId, tableOccupiedId } from '@/test/dining-fixtures';

export const pizzaProductId = 'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1';
export const orderId = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';
export const orderItemId = 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1';
export const pizzaOrderItemId = 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2';
export const ticketId = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1';
export const ticketItemId = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';
export const pizzaTicketItemId = 'd2d2d2d2-d2d2-42d2-82d2-d2d2d2d2d2d2';

export function pizzaProductOf(establishmentId: string) {
  return {
    id: pizzaProductId,
    establishmentId,
    categoryId: '77777777-7777-4777-8777-777777777777',
    name: 'Pizza',
    slug: 'pizza',
    description: '',
    kind: 'PIZZA' as const,
    available: true,
    status: 'ACTIVE' as const,
    sortOrder: 1,
    version: 0,
    priceCents: null,
    variants: [],
  };
}

export function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: orderId,
    establishmentId: apiEst.id,
    channel: 'TABLE',
    tableId: tableOccupiedId,
    tableServiceId: serviceOpenId,
    number: 12,
    placedByUserId: apiMe.user.id,
    placedByName: 'Ana Costa',
    notes: null,
    subtotalCents: 800,
    discountCents: 0,
    totalCents: 800,
    commercialStatus: 'CONFIRMED',
    productionStatus: 'WAITING',
    placedAt: '2026-10-19T12:20:00Z',
    ticketId,
    items: [
      {
        id: orderItemId,
        kind: 'STANDARD',
        productId: '88888888-8888-4888-8888-888888888888',
        productName: 'Refrigerante',
        variantId: '12121212-1212-4121-8121-121212121211',
        variantName: 'Padrão',
        quantity: 1,
        unitPriceCents: 800,
        lineTotalCents: 800,
        notes: null,
        pizza: null,
        productionStatus: 'WAITING',
        ticketItemId,
        ticketItemVersion: 0,
      },
    ],
    ...overrides,
  };
}

export function makePizzaOrder() {
  return makeOrder({
    id: 'a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2',
    channel: 'COUNTER',
    tableId: null,
    tableServiceId: null,
    number: 13,
    subtotalCents: 7200,
    totalCents: 7200,
    ticketId: 'c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2',
    items: [
      {
        id: pizzaOrderItemId,
        kind: 'PIZZA',
        productId: pizzaProductId,
        productName: 'Pizza Grande',
        variantId: null,
        variantName: null,
        quantity: 1,
        unitPriceCents: 7200,
        lineTotalCents: 7200,
        notes: null,
        pizza: {
          sizeId: pizzaSizeId,
          sizeCode: 'grande',
          sizeName: 'Grande',
          strategy: 'HIGHEST',
          crust: { id: pizzaCrustId, name: 'Catupiry', priceCents: 800 },
          flavors: [
            { flavorId: pizzaFlavorId, name: 'Calabresa API', priceCents: 5800, numerator: 1, denominator: 1 },
          ],
          extras: [{ id: pizzaExtraId, name: 'Bacon', priceCents: 600 }],
        },
        productionStatus: 'WAITING',
        ticketItemId: pizzaTicketItemId,
        ticketItemVersion: 0,
      },
    ],
  });
}

export function ticketFromOrder(order: ReturnType<typeof makeOrder>) {
  return {
    id: order.ticketId,
    orderId: order.id,
    number: order.number,
    origin: order.channel === 'TABLE' ? 'Mesa 02' : 'Balcão',
    productionStatus: order.productionStatus,
    priority: 'NORMAL',
    version: 0,
    createdAt: order.placedAt,
    items: order.items,
  };
}
