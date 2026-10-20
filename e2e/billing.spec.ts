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
const variantId = '12121212-1212-4121-8121-121212121211';
const orderId = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';
const orderItemId = 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1';
const billId = 'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1';
const cashId = 'e3e3e3e3-e3e3-43e3-83e3-e3e3e3e3e3e3';

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
  return 'AVAILABLE';
}

function tablePayload(table: Table) {
  const { service, ...rest } = table;
  return { ...rest, occupancy: occupancy(table), activeService: service };
}

async function mockBillingApi(page: Page) {
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
  const orderKeys = new Map<string, Record<string, unknown>>();
  const payKeys = new Map<string, Record<string, unknown>>();
  let bill = {
    id: billId,
    establishmentId: estId,
    kind: 'TABLE' as const,
    tableId,
    tableNumber: 1,
    tableServiceId: serviceId,
    orderId: null as string | null,
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    paidCents: 0,
    remainingCents: 0,
    status: 'SETTLED' as 'OPEN' | 'PARTIALLY_PAID' | 'SETTLED',
    settled: true,
    settledAt: '2026-10-19T12:10:00Z' as string | null,
    version: 0,
    orders: [] as unknown[],
    payments: [] as unknown[],
  };
  let cash: Record<string, unknown> | null = null;

  function refreshBillStatus() {
    bill.remainingCents = bill.totalCents - bill.paidCents;
    if (bill.remainingCents === 0) {
      bill.status = 'SETTLED';
      bill.settled = true;
      bill.settledAt = '2026-10-19T13:00:00Z';
    } else if (bill.paidCents > 0) {
      bill.status = 'PARTIALLY_PAID';
      bill.settled = false;
      bill.settledAt = null;
    } else {
      bill.status = 'OPEN';
      bill.settled = false;
      bill.settledAt = null;
    }
  }

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
    if (method === 'GET' && url.includes('/catalog/categories')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: categoryId, establishmentId: estId, name: 'Bebidas', slug: 'bebidas', status: 'ACTIVE', sortOrder: 0 }]),
      });
      return;
    }
    if (method === 'GET' && url.includes('/catalog/products')) {
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
              variants: [{ id: variantId, productId: drinkId, name: 'Padrão', priceCents: 800, available: true, status: 'ACTIVE', sortOrder: 0 }],
            },
          ],
          page: 0,
          size: 40,
          total: 1,
        }),
      });
      return;
    }
    if (method === 'GET' && url.includes('/catalog/pizza')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ settings: { establishmentId: estId, strategy: 'HIGHEST', version: 0 }, sizes: [], flavors: [], crusts: [], extras: [] }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/establishments/${estId}/orders`) && !url.includes('/bill')) {
      const key = route.request().headers()['idempotency-key'] ?? '';
      if (orderKeys.has(key)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orderKeys.get(key)) });
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
        subtotalCents: 800,
        discountCents: 0,
        totalCents: 800,
        commercialStatus: 'CONFIRMED',
        productionStatus: 'WAITING',
        placedAt: '2026-10-19T12:30:00Z',
        ticketId: 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
        items: [
          {
            id: orderItemId,
            kind: 'STANDARD',
            productId: drinkId,
            productName: 'Refrigerante',
            variantId,
            variantName: 'Padrão',
            quantity: 1,
            unitPriceCents: 800,
            lineTotalCents: 800,
            notes: null,
            pizza: null,
            productionStatus: 'WAITING',
            ticketItemId: 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1',
            ticketItemVersion: 0,
          },
        ],
      };
      orderKeys.set(key, order);
      bill = {
        ...bill,
        subtotalCents: 800,
        totalCents: 800,
        paidCents: 0,
        remainingCents: 800,
        status: 'OPEN',
        settled: false,
        settledAt: null,
        orders: [
          {
            id: orderId,
            number: 21,
            subtotalCents: 800,
            discountCents: 0,
            totalCents: 800,
            placedAt: '2026-10-19T12:30:00Z',
            items: (order as { items: unknown[] }).items,
          },
        ],
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(order) });
      return;
    }
    if (method === 'GET' && url.includes(`/orders/${orderId}/bill`)) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return;
    }
    if (method === 'GET' && (url.includes(`/table-services/${serviceId}/bill`) || url.includes(`/bills/${billId}`))) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bill) });
      return;
    }
    if (method === 'GET' && url.includes(`/bills/${billId}/payments`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: bill.payments }),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/bills/${billId}/payments`)) {
      const key = route.request().headers()['idempotency-key'] ?? '';
      if (payKeys.has(key)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payKeys.get(key)) });
        return;
      }
      if (!cash) {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 422, code: 'CASH_SESSION_NOT_OPEN', title: 'Caixa fechado', detail: 'Abra o caixa.' }),
        });
        return;
      }
      const body = route.request().postDataJSON() as { method: string; tenderedCents: number };
      const applied = body.method === 'CASH' ? Math.min(body.tenderedCents, bill.remainingCents) : body.tenderedCents;
      const change = body.method === 'CASH' ? Math.max(0, body.tenderedCents - bill.remainingCents) : 0;
      const payment = {
        id: 'e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2',
        billId,
        cashSessionId: cashId,
        method: body.method,
        captureKind: 'MANUAL_DECLARED',
        tenderedCents: body.tenderedCents,
        appliedCents: applied,
        changeCents: change,
        recordedByName: 'Ana Costa',
        notes: null,
        recordedAt: '2026-10-19T12:50:00Z',
        version: 0,
      };
      bill.paidCents += applied;
      bill.payments = [...bill.payments, payment];
      bill.version += 1;
      refreshBillStatus();
      payKeys.set(key, payment);
      const totals = { ...(cash.totalsByMethod as Record<string, number>) };
      totals[body.method] = (totals[body.method] ?? 0) + applied;
      const drawer = Number(cash.drawerCashCents) + (body.method === 'CASH' ? applied : 0);
      cash = { ...cash, totalsByMethod: totals, drawerCashCents: drawer, expectedCashCents: drawer };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(payment) });
      return;
    }
    if (method === 'GET' && url.includes('/cash/sessions/current')) {
      if (!cash) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 404, code: 'NOT_FOUND' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cash) });
      return;
    }
    if (method === 'POST' && url.endsWith('/cash/sessions')) {
      const body = route.request().postDataJSON() as { openingFloatCents: number };
      cash = {
        id: cashId,
        establishmentId: estId,
        scope: 'ESTABLISHMENT',
        status: 'OPEN',
        openedByName: 'Ana Costa',
        openedAt: '2026-10-19T12:40:00Z',
        closedAt: null,
        closedByName: null,
        openingFloatCents: body.openingFloatCents,
        expectedCashCents: body.openingFloatCents,
        drawerCashCents: body.openingFloatCents,
        totalsByMethod: {},
        version: 0,
        notes: null,
        movements: [
          {
            id: 'e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5',
            type: 'OPENING',
            method: null,
            amountCents: body.openingFloatCents,
            paymentId: null,
            recordedByName: 'Ana Costa',
            notes: 'Abertura',
            recordedAt: '2026-10-19T12:40:00Z',
          },
        ],
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(cash) });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service/close`)) {
      if (!bill.settled || bill.totalCents <= 0) {
        await route.fulfill({
          status: 409,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 409, code: 'CLOSE_REQUIRES_SETTLEMENT', title: 'Conta em aberto' }),
        });
        return;
      }
      const closed = table.service
        ? {
            ...table.service,
            status: 'CLOSED' as const,
            closedAt: '2026-10-19T13:10:00Z',
            closedByUserId: userId,
            closedByName: 'Ana Costa',
            closeKind: 'SETTLED' as const,
            closeReason: null,
          }
        : null;
      table.service = null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(closed),
      });
      return;
    }
    if (method === 'POST' && url.includes(`/tables/${tableId}/service/bill`)) {
      if (table.service) {
        table.service = { ...table.service, status: 'AWAITING_BILL', requestedBillAt: '2026-10-19T12:45:00Z' };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table.service) });
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
    if (method === 'GET' && url.includes(`/tables/${tableId}/services`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: table.service ? [table.service] : [], page: 0, size: 10, total: table.service ? 1 : 0 }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/tables`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([tablePayload(table)]) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/orders`)) {
      const items = order
        ? [{
            id: order.id,
            establishmentId: estId,
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
        body: JSON.stringify({ items, page: 0, size: 50, total: items.length }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('abre mesa, confirma pedido, quita a comanda e libera o salão', async ({ page }) => {
  await mockBillingApi(page);
  await signInApi(page);
  await page.getByRole('link', { name: 'Mesas' }).click();
  await page.getByRole('button', { name: /mesa 01, disponível/i }).click();
  await page.getByRole('dialog', { name: /mesa 01/i }).getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(page.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar itens' }).click();
  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await page.getByRole('button', { name: /refrigerante/i }).click();
  await page.getByRole('button', { name: 'Enviar para cozinha' }).first().click();
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await page.getByRole('link', { name: 'Comandas' }).click();
  await expect(page.getByRole('heading', { name: 'Comandas' })).toBeVisible();
  await expect(page.getByText('Pedido #21', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 8,00').first()).toBeVisible();
  await expect(page.getByText(/10%/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Receber pagamento' }).click();
  await expect(page.getByRole('heading', { name: 'Abrir caixa' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir turno' }).click();
  await expect(page.getByRole('heading', { name: 'Caixa do turno' })).toBeVisible();
  await page.getByRole('radio', { name: 'Dinheiro' }).click();
  await page.getByLabel('Valor recebido em dinheiro').fill('1200');
  await expect(page.getByText(/prévia: aplicado r\$ 8,00 · troco r\$ 4,00/i)).toBeVisible();
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(page.getByText(/quitada/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar atendimento' }).click();
  await expect(page.getByText(/liberada/i).first()).toBeVisible();
  await page.getByRole('link', { name: 'Mesas' }).click();
  await expect(page.getByRole('button', { name: /mesa 01, disponível/i })).toBeVisible();
});
