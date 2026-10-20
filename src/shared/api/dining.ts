import { z } from 'zod';
import { apiRequest } from '@/shared/api/http-client';
import type { TableStatus } from '@/shared/types/domain';

const diningStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const tableAvailabilitySchema = z.enum(['AVAILABLE', 'RESERVED', 'UNAVAILABLE']);
const tableOccupancySchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'AWAITING_BILL',
  'RESERVED',
  'UNAVAILABLE',
]);
const serviceStatusSchema = z.enum(['OPEN', 'AWAITING_BILL', 'CLOSED']);

export const serviceCloseKindSchema = z.enum(['SETTLED', 'EMPTY']);

export const serviceResponseSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid(),
  establishmentId: z.string().uuid(),
  status: serviceStatusSchema,
  guests: z.number().int(),
  openedByUserId: z.string().uuid(),
  hostName: z.string(),
  openedAt: z.string(),
  requestedBillAt: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
  closedByUserId: z.string().uuid().nullable().optional(),
  closedByName: z.string().nullable().optional(),
  closeReason: z.string().nullable().optional(),
  closeKind: serviceCloseKindSchema.nullable().optional(),
  version: z.number().int(),
});

export const tableResponseSchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  number: z.number().int(),
  name: z.string().nullable().optional(),
  seats: z.number().int(),
  area: z.string().nullable().optional(),
  layoutX: z.number().int().nullable().optional(),
  layoutY: z.number().int().nullable().optional(),
  availability: tableAvailabilitySchema,
  status: diningStatusSchema,
  occupancy: tableOccupancySchema,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeService: serviceResponseSchema.nullable().optional(),
});

export const servicePageSchema = z.object({
  items: z.array(serviceResponseSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});

export type TableAvailability = z.infer<typeof tableAvailabilitySchema>;
export type TableOccupancy = z.infer<typeof tableOccupancySchema>;
export type DiningTableStatus = z.infer<typeof diningStatusSchema>;
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
export type TableResponse = z.infer<typeof tableResponseSchema>;
export type ServiceResponse = z.infer<typeof serviceResponseSchema>;
export type ServicePage = z.infer<typeof servicePageSchema>;

export interface TableWriteBody {
  number: number;
  name?: string;
  seats: number;
  area?: string;
  layoutX?: number | null;
  layoutY?: number | null;
  availability?: TableAvailability;
  version?: number;
}

export interface DiningMapTable {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  guests: number;
  billCents: number;
  openedAt: string | null;
  area: string;
  x: number;
  y: number;
}

const occupancyMap: Record<TableOccupancy, TableStatus> = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  AWAITING_BILL: 'awaiting_bill',
  RESERVED: 'reserved',
  UNAVAILABLE: 'unavailable',
};

function diningPath(establishmentId: string, suffix: string): string {
  return `/establishments/${establishmentId}${suffix}`;
}

export function occupancyToStatus(occupancy: TableOccupancy): TableStatus {
  return occupancyMap[occupancy];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Posição só para o mapa. Não persiste coordenadas inventadas. */
export function displayPosition(table: Pick<TableResponse, 'layoutX' | 'layoutY' | 'number'>, index: number) {
  if (table.layoutX != null && table.layoutY != null) {
    return {
      x: clamp(table.layoutX, 10, 90),
      y: clamp(table.layoutY, 14, 86),
    };
  }
  const cols = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 18 + col * 20,
    y: 24 + row * 20,
  };
}

export function toDiningMapTable(table: TableResponse, index: number): DiningMapTable {
  const service = table.activeService;
  const place = displayPosition(table, index);
  return {
    id: table.id,
    number: table.number,
    seats: table.seats,
    status: occupancyToStatus(table.occupancy),
    guests: service?.guests ?? 0,
    billCents: 0,
    openedAt: service?.openedAt ?? null,
    area: table.area?.trim() || 'Salão',
    x: place.x,
    y: place.y,
  };
}

export function listTables(establishmentId: string, includeInactive = false) {
  return apiRequest(z.array(tableResponseSchema), {
    path: diningPath(establishmentId, '/tables'),
    query: { includeInactive },
  });
}

export function getTable(establishmentId: string, tableId: string) {
  return apiRequest(tableResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}`),
  });
}

export function createTable(establishmentId: string, body: TableWriteBody) {
  return apiRequest(tableResponseSchema, {
    path: diningPath(establishmentId, '/tables'),
    method: 'POST',
    body,
  });
}

export function updateTable(establishmentId: string, tableId: string, body: TableWriteBody) {
  return apiRequest(tableResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}`),
    method: 'PATCH',
    body,
  });
}

export function changeTableAvailability(
  establishmentId: string,
  tableId: string,
  body: { availability: TableAvailability; version: number },
) {
  return apiRequest(tableResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/availability`),
    method: 'PATCH',
    body,
  });
}

export function changeTableStatus(
  establishmentId: string,
  tableId: string,
  body: { status: DiningTableStatus; version?: number },
) {
  return apiRequest(tableResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/status`),
    method: 'PATCH',
    body,
  });
}

export function getActiveService(establishmentId: string, tableId: string) {
  return apiRequest(serviceResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/service`),
  });
}

export function openService(establishmentId: string, tableId: string, guests: number) {
  return apiRequest(serviceResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/service`),
    method: 'POST',
    body: { guests },
  });
}

export function requestBill(establishmentId: string, tableId: string) {
  return apiRequest(serviceResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/service/bill`),
    method: 'POST',
  });
}

export function reopenService(establishmentId: string, tableId: string) {
  return apiRequest(serviceResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/service/reopen`),
    method: 'POST',
  });
}

export type CloseServiceBody = {
  empty?: boolean;
  reason?: string;
};

export function closeService(establishmentId: string, tableId: string, body: CloseServiceBody = {}) {
  return apiRequest(serviceResponseSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/service/close`),
    method: 'POST',
    body,
  });
}

export function listTableHistory(establishmentId: string, tableId: string, page = 0, size = 10) {
  return apiRequest(servicePageSchema, {
    path: diningPath(establishmentId, `/tables/${tableId}/services`),
    query: { page, size },
  });
}

export function listEstablishmentServices(
  establishmentId: string,
  query: { tableId?: string; page?: number; size?: number } = {},
) {
  return apiRequest(servicePageSchema, {
    path: diningPath(establishmentId, '/table-services'),
    query: {
      tableId: query.tableId,
      page: query.page ?? 0,
      size: query.size ?? 20,
    },
  });
}
