import { expect, test, type Page } from '@playwright/test';
import { signInApi } from './helpers';

const orgId = '22222222-2222-4222-8222-222222222222';
const estId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';

const me = {
  user: { id: userId, email: 'ana.e2e@example.com', name: 'Ana Costa', status: 'ACTIVE' },
  organizations: [{ id: orgId, name: 'Pizzaria Ana', slug: 'pizzaria-ana', status: 'ACTIVE' }],
  organizationMemberships: [{ organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  establishments: [{ id: estId, organizationId: orgId, name: 'Loja Centro', slug: 'loja-centro', status: 'ACTIVE' }],
  establishmentMemberships: [{ establishmentId: estId, organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  lastOrganizationId: orgId,
  lastEstablishmentId: estId,
};

function period() {
  return {
    from: '2026-10-14',
    to: '2026-10-20',
    timezone: 'America/Sao_Paulo',
    timezoneSource: 'QUERY',
    fromInclusive: '2026-10-14T03:00:00Z',
    toExclusive: '2026-10-21T03:00:00Z',
    channel: null,
    saleDateField: 'placed_at',
    receiptDateField: 'recorded_at',
  };
}

async function mockReportsApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === 'POST' && path === '/api/v1/auth/login') {
      await route.fulfill({
        json: { accessToken: 'access-e2e', expiresInSeconds: 900, tokenType: 'Bearer' },
      });
      return;
    }
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        json: { status: 401, code: 'UNAUTHENTICATED', title: 'Não autenticado' },
      });
      return;
    }
    if (method === 'GET' && path === '/api/v1/me') {
      await route.fulfill({ json: me });
      return;
    }
    if (method === 'POST' && path === '/api/v1/me/context') {
      await route.fulfill({
        json: {
          organization: me.organizations[0],
          establishment: me.establishments[0],
          organizationRole: 'ADMIN',
          establishmentRole: 'ADMIN',
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/overview`) {
      await route.fulfill({
        json: {
          period: period(),
          receivedCents: 3900,
          soldCents: 8500,
          salesCount: 6,
          averageTicketCents: 1416,
          averageTicketUnit: 'CONFIRMED_ORDER',
          inProductionOrders: 2,
          occupiedTables: 3,
          totalTables: 8,
          pendingBills: 2,
          pendingCents: 3800,
          metricScope: { receivedCents: 'PERIOD', occupiedTables: 'CURRENT' },
          definitions: { receivedCents: 'applied_cents' },
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/payments`) {
      await route.fulfill({
        json: {
          period: period(),
          receivedCents: 3900,
          paymentCount: 5,
          byMethod: [
            { method: 'CASH', count: 1, receivedCents: 800, percent: 21 },
            { method: 'PIX', count: 3, receivedCents: 2300, percent: 59 },
            { method: 'DEBIT_CARD', count: 0, receivedCents: 0, percent: 0 },
            { method: 'CREDIT_CARD', count: 1, receivedCents: 800, percent: 21 },
          ],
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/sales`) {
      await route.fulfill({
        json: {
          period: period(),
          salesCount: 6,
          soldCents: 8500,
          averageTicketCents: 1416,
          averageTicketUnit: 'CONFIRMED_ORDER',
          byDay: [
            { date: '2026-10-20', count: 2, cents: 1600 },
            { date: '2026-10-19', count: 4, cents: 6900 },
          ],
          byChannel: [
            { channel: 'TABLE', count: 2, cents: 1600 },
            { channel: 'COUNTER', count: 4, cents: 6900 },
          ],
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/revenue`) {
      await route.fulfill({
        json: {
          period: period(),
          receivedCents: 3900,
          paymentCount: 5,
          byDay: [{ date: '2026-10-20', count: 5, cents: 3900 }],
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/products`) {
      await route.fulfill({
        json: {
          period: period(),
          total: 1,
          page: 0,
          size: 10,
          items: [{ productId: null, productName: 'Pizza', quantity: 2, soldCents: 9000 }],
        },
      });
      return;
    }
    if (path === `/api/v1/establishments/${estId}/reports/operations`) {
      await route.fulfill({
        json: {
          period: period(),
          inProductionOrders: 2,
          occupiedTables: 3,
          occupiedOpen: 2,
          awaitingBill: 1,
          totalTables: 8,
          pendingBills: 2,
          pendingCents: 3800,
          servicesOpenedInPeriod: 4,
          servicesClosedInPeriod: 1,
        },
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      json: { status: 404, code: 'NOT_FOUND', title: 'Não encontrado' },
    });
  });
}

test('login, dashboard e relatórios com período', async ({ page }) => {
  await mockReportsApi(page);
  await signInApi(page);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByText('Faturamento recebido')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Indicadores' }).getByText('R$ 39,00')).toBeVisible();
  await page.getByRole('radio', { name: '7 dias' }).click();
  await expect(page.getByText('Vendas confirmadas')).toBeVisible();
  await page.getByRole('link', { name: 'Relatórios' }).click();
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Produtos mais vendidos' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Produtos mais vendidos' }).getByText('Pizza')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operação de mesas' })).toBeVisible();
});
