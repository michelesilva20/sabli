import { expect, test, type Page } from '@playwright/test';
import { signInApi } from './helpers';

const API = 'http://127.0.0.1:8080/api/v1';
const orgId = '22222222-2222-4222-8222-222222222222';
const estId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';
const categoryId = '77777777-7777-4777-8777-777777777777';
const productId = '88888888-8888-4888-8888-888888888888';
const sizeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const flavorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const me = {
  user: { id: userId, email: 'ana.e2e@example.com', name: 'Ana Costa', status: 'ACTIVE' },
  organizations: [{ id: orgId, name: 'Pizzaria Ana', slug: 'pizzaria-ana', status: 'ACTIVE' }],
  organizationMemberships: [{ organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  establishments: [{ id: estId, organizationId: orgId, name: 'Loja Centro', slug: 'loja-centro', status: 'ACTIVE' }],
  establishmentMemberships: [{ establishmentId: estId, organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  lastOrganizationId: orgId,
  lastEstablishmentId: estId,
};

const category = {
  id: categoryId,
  establishmentId: estId,
  name: 'Bebidas',
  slug: 'bebidas',
  sortOrder: 0,
  status: 'ACTIVE',
};

const product = {
  id: productId,
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
  variants: [
    {
      id: '12121212-1212-4121-8121-121212121211',
      productId,
      name: 'Padrão',
      priceCents: 800,
      available: true,
      status: 'ACTIVE',
      sortOrder: 0,
    },
  ],
};

async function mockCatalogApi(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
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
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/categories`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([category]) });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/products`)) {
      const parsed = new URL(url);
      const q = parsed.searchParams.get('q')?.toLowerCase() ?? '';
      const items = q && !product.name.toLowerCase().includes(q) ? [] : [product];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: 0, size: 12, total: items.length }),
      });
      return;
    }
    if (method === 'GET' && url.includes(`/establishments/${estId}/catalog/pizza`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          settings: { establishmentId: estId, strategy: 'HIGHEST', version: 0 },
          sizes: [
            {
              id: sizeId,
              code: 'grande',
              name: 'Grande',
              maxFlavors: 3,
              slices: 8,
              priceFactorNumerator: 1,
              priceFactorDenominator: 1,
              available: true,
              status: 'ACTIVE',
              sortOrder: 0,
            },
          ],
          flavors: [
            {
              id: flavorId,
              name: 'Calabresa API',
              slug: 'calabresa-api',
              description: '',
              available: true,
              status: 'ACTIVE',
              sortOrder: 0,
              pricesBySizeId: { [sizeId]: 5800 },
            },
          ],
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
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('catálogo real no modo API com cotação do servidor', async ({ page }) => {
  await mockCatalogApi(page);
  await signInApi(page);
  await page.goto('/produtos');
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await expect(page.getByText('Refrigerante')).toBeVisible();
  await expect(page.getByText(/marguerita/i)).toHaveCount(0);
  await page.getByLabel('Buscar produto').fill('xyz');
  await expect(page.getByText('Nenhum produto encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page.getByText('Refrigerante')).toBeVisible();
  await page.getByRole('button', { name: 'Cardápio de pizza' }).click();
  await expect(page.getByText('Calabresa API').first()).toBeVisible();
  await expect(page.getByText(/total r\$ 58,00/i)).toBeVisible();
  await page.goto('/pdv');
  await expect(page.getByText(/envio de pedido bloqueado/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar para cozinha' })).toBeDisabled();
});
