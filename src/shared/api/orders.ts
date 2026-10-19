import { z } from 'zod';
import { apiRequest } from '@/shared/api/http-client';
import type { PizzaComposition, SaleItem } from '@/shared/types/domain';
import type { KitchenStatus } from '@/shared/domain/kitchen';

export const orderChannelSchema = z.enum(['TABLE', 'COUNTER']);
export const commercialStatusSchema = z.enum(['CONFIRMED']);
export const productionStatusSchema = z.enum(['WAITING', 'PREPARING', 'READY', 'DELIVERED']);
export const ticketPrioritySchema = z.enum(['NORMAL', 'HIGH']);

const pricedOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int(),
});

const flavorSnapshotSchema = z.object({
  flavorId: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int(),
  numerator: z.number().int(),
  denominator: z.number().int(),
});

export const pizzaSnapshotSchema = z.object({
  sizeId: z.string().uuid(),
  sizeCode: z.string(),
  sizeName: z.string(),
  strategy: z.enum(['HIGHEST', 'AVERAGE']),
  crust: pricedOptionSchema.nullable().optional(),
  flavors: z.array(flavorSnapshotSchema),
  extras: z.array(pricedOptionSchema),
});

export const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['STANDARD', 'PIZZA']).nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  productName: z.string().nullable().optional(),
  variantId: z.string().uuid().nullable().optional(),
  variantName: z.string().nullable().optional(),
  quantity: z.number().int(),
  unitPriceCents: z.number().int(),
  lineTotalCents: z.number().int(),
  notes: z.string().nullable().optional(),
  pizza: pizzaSnapshotSchema.nullable().optional(),
  productionStatus: productionStatusSchema,
  ticketItemId: z.string().uuid().nullable().optional(),
  ticketItemVersion: z.number().int(),
});

export const orderSummarySchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  channel: orderChannelSchema,
  tableId: z.string().uuid().nullable().optional(),
  tableServiceId: z.string().uuid().nullable().optional(),
  number: z.number().int(),
  placedByName: z.string(),
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  commercialStatus: commercialStatusSchema,
  productionStatus: productionStatusSchema,
  placedAt: z.string(),
});

export const orderResponseSchema = orderSummarySchema.extend({
  placedByUserId: z.string().uuid(),
  notes: z.string().nullable().optional(),
  ticketId: z.string().uuid().nullable().optional(),
  items: z.array(orderItemResponseSchema),
});

export const orderPageSchema = z.object({
  items: z.array(orderSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});

export const ticketResponseSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  number: z.number().int(),
  origin: z.string(),
  productionStatus: productionStatusSchema,
  priority: ticketPrioritySchema,
  version: z.number().int(),
  createdAt: z.string(),
  items: z.array(orderItemResponseSchema),
});

export const ticketPageSchema = z.object({
  items: z.array(ticketResponseSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});

export type OrderChannel = z.infer<typeof orderChannelSchema>;
export type ProductionStatus = z.infer<typeof productionStatusSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;
export type TicketResponse = z.infer<typeof ticketResponseSchema>;
export type PizzaSnapshot = z.infer<typeof pizzaSnapshotSchema>;

export type PlaceOrderItem = {
  productId?: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  pizza?: {
    sizeId: string;
    flavorIds: string[];
    crustId?: string;
    extraIds?: string[];
  };
};

export type PlaceOrderBody = {
  channel: OrderChannel;
  tableServiceId?: string;
  notes?: string;
  expectedTotalCents: number;
  items: PlaceOrderItem[];
};

export type OrderListQuery = {
  tableServiceId?: string;
  productionStatus?: ProductionStatus;
  page?: number;
  size?: number;
};

function ordersPath(establishmentId: string, suffix = '') {
  return `/establishments/${establishmentId}/orders${suffix}`;
}

function kitchenPath(establishmentId: string, suffix = '') {
  return `/establishments/${establishmentId}/kitchen/tickets${suffix}`;
}

export function listOrders(establishmentId: string, query: OrderListQuery = {}) {
  return apiRequest(orderPageSchema, {
    path: ordersPath(establishmentId),
    query: {
      tableServiceId: query.tableServiceId,
      productionStatus: query.productionStatus,
      page: query.page ?? 0,
      size: query.size ?? 20,
    },
  });
}

export function getOrder(establishmentId: string, orderId: string) {
  return apiRequest(orderResponseSchema, {
    path: ordersPath(establishmentId, `/${orderId}`),
  });
}

export function placeOrder(establishmentId: string, body: PlaceOrderBody, idempotencyKey: string) {
  return apiRequest(orderResponseSchema, {
    path: ordersPath(establishmentId),
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function listKitchenTickets(
  establishmentId: string,
  query: { productionStatus?: ProductionStatus; page?: number; size?: number } = {},
) {
  return apiRequest(ticketPageSchema, {
    path: kitchenPath(establishmentId),
    query: {
      productionStatus: query.productionStatus,
      includeComposition: true,
      page: query.page ?? 0,
      size: query.size ?? 50,
    },
  });
}

export function getKitchenTicket(establishmentId: string, ticketId: string) {
  return apiRequest(ticketResponseSchema, {
    path: kitchenPath(establishmentId, `/${ticketId}`),
  });
}

export function advanceKitchenTicket(
  establishmentId: string,
  ticketId: string,
  version: number,
) {
  return apiRequest(ticketResponseSchema, {
    path: kitchenPath(establishmentId, `/${ticketId}/advance`),
    method: 'POST',
    body: { version },
  });
}

export function advanceKitchenItem(
  establishmentId: string,
  ticketId: string,
  itemId: string,
  version: number,
) {
  return apiRequest(ticketResponseSchema, {
    path: kitchenPath(establishmentId, `/${ticketId}/items/${itemId}/advance`),
    method: 'POST',
    body: { version },
  });
}

export function productionToKitchen(status: ProductionStatus): KitchenStatus {
  if (status === 'WAITING') return 'waiting';
  if (status === 'PREPARING') return 'preparing';
  if (status === 'READY') return 'ready';
  return 'delivered';
}

export function kitchenToProduction(status: KitchenStatus): ProductionStatus {
  if (status === 'waiting') return 'WAITING';
  if (status === 'preparing') return 'PREPARING';
  if (status === 'ready') return 'READY';
  return 'DELIVERED';
}

export function toPizzaComposition(pizza: PizzaSnapshot | null | undefined): PizzaComposition | undefined {
  if (!pizza) return undefined;
  return {
    sizeId: pizza.sizeId,
    sizeName: pizza.sizeName,
    flavors: pizza.flavors.map((flavor) => ({
      id: flavor.flavorId,
      name: flavor.name,
      numerator: flavor.numerator,
      denominator: flavor.denominator,
    })),
    crust: pizza.crust ?? { id: pizza.sizeId, name: 'tradicional', priceCents: 0 },
    extras: pizza.extras,
  };
}

export function toSaleItem(item: OrderItemResponse): SaleItem {
  return {
    lineId: item.id,
    productId: item.productId ?? undefined,
    name: item.productName ?? 'Item',
    quantity: item.quantity,
    unit: 'un',
    unitPriceCents: item.unitPriceCents,
    totalCents: item.lineTotalCents,
    notes: item.notes ?? undefined,
    pizza: toPizzaComposition(item.pizza),
    productionStatus: productionToKitchen(item.productionStatus),
  };
}

export function channelLabel(channel: OrderChannel): string {
  return channel === 'TABLE' ? 'Mesa' : 'Balcão';
}
