import { expect, test, type Page } from '@playwright/test';
import { signInApi } from './helpers';

const API = 'http://127.0.0.1:8080/api/v1';
const orgId = '22222222-2222-4222-8222-222222222222';
const estId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';
const tableId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a01';
const serviceId = '0b0b0b0b-0b0b-40bb-8bbb-0b0b0b0b0b01';

const me = {
  user: { id: userId, email: 'ana.e2e@example.com', name: 'Ana Costa', status: 'ACTIVE' },
  organizations: [{ id: orgId, name: 'Pizzaria Ana', slug: 'pizzaria-ana', status: 'ACTIVE' }],
  organizationMemberships: [{ organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  establishments: [{ id: estId, organizationId: orgId, name: 'Loja Centro', slug: 'loja-centro', status: 'ACTIVE' }],
  establishmentMemberships: [{ establishmentId: estId, organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  lastOrganizationId: orgId,
  lastEstablishmentId: estId,
};

type Service = {
  id: string;
  tableId: string;
  establishmentId: string;
  status: 'OPEN' | 'AWAITING_BILL' | 'CLOSED';
  guests: number;
  openedByUserId: string;
  hostName: string;
  openedAt: string;
  requestedBillAt: string | null;
  closedAt: string | null;
  version: number;
};

type Table = {
  id: string;
  establishmentId: string;
  number: number;
  name: string;
  seats: number;
  area: string;
  layoutX: number;
  layoutY: number;
  availability: 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE';
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt: string;
  updatedAt: string;
  service: Service | null;
};

function occupancy(table: Table) {
  if (table.status === 'INACTIVE' || table.availability === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (table.service && table.service.status !== 'CLOSED') {
    return table.service.status === 'AWAITING_BILL' ? 'AWAITING_BILL' : 'OCCUPIED';
  }
  if (table.availability === 'RESERVED') return 'RESERVED';
  return 'AVAILABLE';
}

function tablePayload(table: Table) {
  const { service, ...rest } = table;
  return {
    ...rest,
    occupancy: occupancy(table),
    activeService: service,
  };
}

async function mockDiningApi(page: Page) {
  const table: Table = {
    id: tableId,
    establishmentId: estId,
    number: 1,
    name: 'Janela',
    seats: 4,
    area: 'Salão Principal',
    layoutX: 36,
    layoutY: 32,
    availability: 'AVAILABLE',
    status: 'ACTIVE',
    version: 0,
    createdAt: '2026-10-19T12:00:00Z',
    updatedAt: '2026-10-19T12:00:00Z',
    service: null,
  };
  const history: Service[] = [];
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (method === 'POST' && url.endsWith('/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'sabli_refresh=e2e-refresh; HttpOnly; Path=/api/v1/auth; SameSite=Lax',
        },
        body: JSON.stringify({ accessToken: 'e2e-access', expiresInSeconds: 900, tokenType: 'Bearer' }),
      });
      return;
    }
    if (method === 'POST' && url.endsWith('/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'e2e-access', expiresInSeconds: 900, tokenType: 'Bearer' }),
      });
      return;
    }
    if (method === 'GET' && url.endsWith('/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(me),
      });
      return;
    }
    if (method === 'POST' && url.endsWith('/me/context')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: me.organizations[0],
          establishment: me.establishments[0],
          organizationRole: 'ADMIN',
          establishmentRole: 'ADMIN',
        }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/tables/${tableId}/services`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: history, page: 0, size: 10, total: history.length }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/table-services`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: history, page: 0, size: 20, total: history.length }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service/bill`)) {
      if (!table.service || table.service.status !== 'OPEN') {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 422, code: 'SERVICE_NOT_OPEN', title: 'Atendimento inválido' }),
        });
        return;
      }
      table.service = {
        ...table.service,
        status: 'AWAITING_BILL',
        requestedBillAt: '2026-10-19T12:40:00Z',
        version: table.service.version + 1,
      };
      history[0] = table.service;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table.service) });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service/reopen`)) {
      if (!table.service || table.service.status !== 'AWAITING_BILL') {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            status: 422,
            code: 'SERVICE_NOT_AWAITING_BILL',
            title: 'Atendimento inválido',
          }),
        });
        return;
      }
      table.service = { ...table.service, status: 'OPEN', version: table.service.version + 1 };
      history[0] = table.service;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table.service) });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service`)) {
      if (table.service && table.service.status !== 'CLOSED') {
        await route.fulfill({
          status: 409,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 409, code: 'TABLE_OCCUPIED', title: 'Mesa ocupada' }),
        });
        return;
      }
      const body = route.request().postDataJSON() as { guests?: number };
      table.service = {
        id: serviceId,
        tableId,
        establishmentId: estId,
        status: 'OPEN',
        guests: body.guests ?? 2,
        openedByUserId: userId,
        hostName: 'Ana Costa',
        openedAt: '2026-10-19T12:10:00Z',
        requestedBillAt: null,
        closedAt: null,
        version: 0,
      };
      history.unshift(table.service);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(table.service) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/tables/${tableId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tablePayload(table)) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/tables`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([tablePayload(table)]),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('abre mesa, pede conta e reabre o atendimento no modo API', async ({ page }) => {
  await mockDiningApi(page);
  await signInApi(page);
  await page.getByRole('link', { name: 'Mesas' }).click();
  await expect(page.getByRole('heading', { name: 'Mapa de mesas' })).toBeVisible();
  await expect(page.getByRole('button', { name: /mesa 01, disponível/i })).toBeVisible();
  await expect(page.getByText(/consumo ainda não conectado/i)).toBeVisible();
  await expect(page.getByText(/mariana/i)).toHaveCount(0);
  await page.getByRole('button', { name: /mesa 01, disponível/i }).click();
  const sheet = page.getByRole('dialog', { name: /mesa 01/i });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(sheet.getByText('Ana Costa', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await sheet.getByRole('button', { name: 'Pedir conta' }).click();
  await page.getByRole('button', { name: 'Confirmar pedido de conta' }).click();
  await expect(sheet.getByText(/a mesa continua ocupada até a quitação/i)).toBeVisible();
  await sheet.getByRole('button', { name: 'Reabrir atendimento' }).click();
  await page.getByRole('button', { name: 'Confirmar reabertura' }).click();
  await expect(sheet.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Encerrar atendimento' })).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('button', { name: /mesa 01, ocupada/i })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/mesas-api.png', fullPage: true });
});
