import type { ServiceResponse, TableResponse } from '@/shared/api/dining';
import { apiEst, apiEstBairro, apiMe } from '@/test/api-fixtures';

export const tableAvailableId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a01';
export const tableOccupiedId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a02';
export const tableReservedId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a03';
export const tableBairroId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0b01';
export const serviceOpenId = '0b0b0b0b-0b0b-40bb-8bbb-0b0b0b0b0b01';
export const serviceHistoryId = '0b0b0b0b-0b0b-40bb-8bbb-0b0b0b0b0b02';

const stamp = '2026-10-19T12:00:00Z';

export function makeService(overrides: Partial<ServiceResponse> = {}): ServiceResponse {
  return {
    id: serviceOpenId,
    tableId: tableOccupiedId,
    establishmentId: apiEst.id,
    status: 'OPEN',
    guests: 3,
    openedByUserId: apiMe.user.id,
    hostName: 'Ana Costa',
    openedAt: '2026-10-19T12:10:00Z',
    requestedBillAt: null,
    closedAt: null,
    version: 0,
    ...overrides,
  };
}

export function makeTable(overrides: Partial<TableResponse> = {}): TableResponse {
  return {
    id: tableAvailableId,
    establishmentId: apiEst.id,
    number: 1,
    name: 'Janela',
    seats: 4,
    area: 'Salão Principal',
    layoutX: 22,
    layoutY: 28,
    availability: 'AVAILABLE',
    status: 'ACTIVE',
    occupancy: 'AVAILABLE',
    version: 0,
    createdAt: stamp,
    updatedAt: stamp,
    activeService: null,
    ...overrides,
  };
}

export const centroAvailable = makeTable();
export const centroOccupied = makeTable({
  id: tableOccupiedId,
  number: 2,
  name: 'Centro',
  layoutX: 44,
  layoutY: 28,
  occupancy: 'OCCUPIED',
  activeService: makeService(),
});
export const centroReserved = makeTable({
  id: tableReservedId,
  number: 3,
  name: 'Varanda',
  layoutX: 66,
  layoutY: 28,
  availability: 'RESERVED',
  occupancy: 'RESERVED',
});
export const bairroTable = makeTable({
  id: tableBairroId,
  establishmentId: apiEstBairro.id,
  number: 8,
  name: 'Bairro',
  occupancy: 'AVAILABLE',
  activeService: null,
});
