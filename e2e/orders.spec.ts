import { expect, test, type Page } from '@playwright/test';
import { signInApi } from './helpers';

const API = 'http://127.0.0.1:8080/api/v1';
const orgId = '22222222-2222-4222-8222-222222222222';
const estId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';
const tableId = '0a0a0a0a-0a0a-40aa-8aaa-0a0a0a0a0a01';
const serviceId = '0b0b0b0b-0b0b-40bb-8bbb-0b0b0b0b0b01';
const categoryId = '77777777-7777-4777-8777-777777777777';
const drinkId = '88888888-8888-4888-8888-888888888888';
const pizzaId = 'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1';
const sizeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const flavorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const orderId = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';
const orderItemId = 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1';
const ticketId = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1';
const ticketItemId = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';

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
  if (table.service && table.service.status !== 'CLOSED') {
    return table.service.status === 'AWAITING_BILL' ? 'AWAITING_BILL' : 'OCCUPIED';
  }
  return table.availability === 'RESERVED' ? 'RESERVED' : 'AVAILABLE';
}

function tablePayload(table: Table) {
  const { service, ...rest } = table;
  return { ...rest, occupancy: occupancy(table), activeService: service };
}

async function mockOrdersApi(page: Page) {
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
  let order: Record<string, unknown> | null = null;
  const keys = new Map<string, Record<string, unknown>>();

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
        body: JSON.stringify({ items: table.service ? [table.service] : [], page: 0, size: 10, total: table.service ? 1 : 0 }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service`)) {
      table.service = {
        id: serviceId,
        tableId,
        establishmentId: estId,
        status: 'OPEN',
        guests: 2,
        openedByUserId: userId,
        hostName: 'Ana Costa',
        openedAt: '2026-10-19T12:10:00Z',
        requestedBillAt: null,
        closedAt: null,
        version: 0,
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(table.service) });
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
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/categories`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: categoryId, establishmentId: estId, name: 'Pizzas', slug: 'pizzas', sortOrder: 0, status: 'ACTIVE' }]),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/products`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: drinkId,
              establishmentId: estId,
              categoryId,
              name: 'Refrigerante',
              slug: 'refrigerante',
              description: '',
              kind: 'STANDARD',
              available: true,
              status: 'ACTIVE',
              sortOrder: 0,
              version: 0,
              priceCents: 800,
              variants: [{ id: '12121212-1212-4121-8121-121212121211', productId: drinkId, name: 'Padrão', priceCents: 800, available: true, status: 'ACTIVE', sortOrder: 0 }],
            },
            {
              id: pizzaId,
              establishmentId: estId,
              categoryId,
              name: 'Pizza',
              slug: 'pizza',
              description: '',
              kind: 'PIZZA',
              available: true,
              status: 'ACTIVE',
              sortOrder: 1,
              version: 0,
              priceCents: null,
              variants: [],
            },
          ],
          page: 0,
          size: 40,
          total: 2,
        }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/pizza`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          settings: { establishmentId: estId, strategy: 'HIGHEST', version: 0 },
          sizes: [{ id: sizeId, code: 'grande', name: 'Grande', maxFlavors: 3, slices: 8, priceFactorNumerator: 1, priceFactorDenominator: 1, available: true, status: 'ACTIVE', sortOrder: 0 }],
          flavors: [{ id: flavorId, name: 'Calabresa API', slug: 'calabresa-api', description: '', available: true, status: 'ACTIVE', sortOrder: 0, pricesBySizeId: { [sizeId]: 5800 } }],
          crusts: [],
          extras: [],
        }),
      });
      return;
    }
    if (method === 'POST' && url.endsWith('/pizza/quotes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          size: { id: sizeId, name: 'Grande' },
          flavors: [{ id: flavorId, name: 'Calabresa API' }],
          extras: [],
          quantity: 1,
          strategy: 'HIGHEST',
          flavorsCents: 5800,
          crustCents: 0,
          extrasCents: 0,
          unitCents: 5800,
          totalCents: 5800,
          breakdown: [{ code: 'FLAVORS', label: 'Sabores', cents: 5800 }],
        }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/establishments/${estId}/orders`) && !url.includes('/kitchen')) {
      const key = route.request().headers()['idempotency-key'] ?? '';
      if (keys.has(key)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(keys.get(key)) });
        return;
      }
      order = {
        id: orderId,
        establishmentId: estId,
        channel: 'TABLE',
        tableId,
        tableServiceId: serviceId,
        number: 21,
        placedByUserId: userId,
        placedByName: 'Ana Costa',
        notes: null,
        subtotalCents: 5800,
        discountCents: 0,
        totalCents: 5800,
        commercialStatus: 'CONFIRMED',
        productionStatus: 'WAITING',
        placedAt: '2026-10-19T12:30:00Z',
        ticketId,
        items: [
          {
            id: orderItemId,
            kind: 'PIZZA',
            productId: pizzaId,
            productName: 'Pizza Grande',
            variantId: null,
            variantName: null,
            quantity: 1,
            unitPriceCents: 5800,
            lineTotalCents: 5800,
            notes: null,
            pizza: {
              sizeId,
              sizeCode: 'grande',
              sizeName: 'Grande',
              strategy: 'HIGHEST',
              crust: null,
              flavors: [{ flavorId, name: 'Calabresa API', priceCents: 5800, numerator: 1, denominator: 1 }],
              extras: [],
            },
            productionStatus: 'WAITING',
            ticketItemId,
            ticketItemVersion: 0,
          },
        ],
      };
      keys.set(key, order);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(order) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/orders/${orderId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/orders`)) {
      const summary = order
        ? [{
            id: order.id,
            establishmentId: order.establishmentId,
            channel: order.channel,
            tableId: order.tableId,
            tableServiceId: order.tableServiceId,
            number: order.number,
            placedByName: order.placedByName,
            subtotalCents: order.subtotalCents,
            discountCents: order.discountCents,
            totalCents: order.totalCents,
            commercialStatus: order.commercialStatus,
            productionStatus: order.productionStatus,
            placedAt: order.placedAt,
          }]
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: summary, page: 0, size: 20, total: summary.length }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/kitchen/tickets/${ticketId}/items/${ticketItemId}/advance`)) {
      const current = order as { items: Array<Record<string, unknown>>; productionStatus: string };
      current.items[0] = { ...current.items[0], productionStatus: 'PREPARING', ticketItemVersion: 1 };
      current.productionStatus = 'PREPARING';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: ticketId,
          orderId,
          number: 21,
          origin: 'Mesa 01',
          productionStatus: 'PREPARING',
          priority: 'NORMAL',
          version: 1,
          createdAt: '2026-10-19T12:30:00Z',
          items: current.items,
        }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/kitchen/tickets/${ticketId}`)) {
      const current = order as { items: unknown[]; productionStatus: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: ticketId,
          orderId,
          number: 21,
          origin: 'Mesa 01',
          productionStatus: current.productionStatus,
          priority: 'NORMAL',
          version: 0,
          createdAt: '2026-10-19T12:30:00Z',
          items: current.items,
        }),
      });
      return;
    }
    if (method === 'GET' && url.includes('/kitchen/tickets')) {
      const current = order as { items: unknown[]; productionStatus: string } | null;
      const items = current
        ? [{
            id: ticketId,
            orderId,
            number: 21,
            origin: 'Mesa 01',
            productionStatus: current.productionStatus,
            priority: 'NORMAL',
            version: 0,
            createdAt: '2026-10-19T12:30:00Z',
            items: current.items,
          }]
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: 0, size: 50, total: items.length }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('confirma pedido real, lista em Pedidos e avança no KDS', async ({ page }) => {
  await mockOrdersApi(page);
  await signInApi(page);
  await page.getByRole('link', { name: 'Mesas' }).click();
  await page.getByRole('button', { name: /mesa 01, disponível/i }).click();
  await page.getByRole('dialog', { name: /mesa 01/i }).getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(page.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar itens' }).click();
  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Montar pizza' }).click();
  await page.getByRole('button', { name: /calabresa api/i }).click();
  await expect(page.getByText(/total r\$ 58,00/i)).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click();
  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para cozinha' }).first().click();
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await expect(page.getByRole('table').getByText('#21')).toBeVisible();
  await page.getByRole('table').getByText('#21').click();
  await expect(page.getByRole('dialog', { name: /pedido #21/i }).getByText(/1\/1 calabresa api/i)).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('link', { name: 'Cozinha' }).click();
  await expect(page.locator('article').getByText('#21')).toBeVisible();
  await page.getByRole('button', { name: /avançar pizza grande/i }).click();
  await expect(page.getByRole('button', { name: /marcar pronto/i })).toBeVisible();
});
