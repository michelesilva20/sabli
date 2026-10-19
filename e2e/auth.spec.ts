import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:8080/api/v1';
const orgId = '22222222-2222-4222-8222-222222222222';
const estId = '33333333-3333-4333-8333-333333333333';
const estBairroId = '55555555-5555-4555-8555-555555555555';
const userId = '11111111-1111-4111-8111-111111111111';

const me = {
  user: { id: userId, email: 'ana.e2e@example.com', name: 'Ana Costa', status: 'ACTIVE' },
  organizations: [{ id: orgId, name: 'Pizzaria Ana', slug: 'pizzaria-ana', status: 'ACTIVE' }],
  organizationMemberships: [{ organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' }],
  establishments: [
    { id: estId, organizationId: orgId, name: 'Loja Centro', slug: 'loja-centro', status: 'ACTIVE' },
    { id: estBairroId, organizationId: orgId, name: 'Loja Bairro', slug: 'loja-bairro', status: 'ACTIVE' },
  ],
  establishmentMemberships: [
    { establishmentId: estId, organizationId: orgId, userId, role: 'ADMIN', status: 'ACTIVE' },
    { establishmentId: estBairroId, organizationId: orgId, userId, role: 'MANAGER', status: 'ACTIVE' },
  ],
};

async function mockApi(page: Page, signedIn = false, lastContext = false) {
  let session = signedIn;
  let lastOrganizationId = lastContext ? orgId : undefined;
  let lastEstablishmentId = lastContext ? estId : undefined;
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = new URL(url).pathname.replace(/\/$/, '');
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:4174',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'authorization,content-type',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        },
        body: '',
      });
      return;
    }
    if (method === 'POST' && path.endsWith('/auth/login')) {
      const body = route.request().postDataJSON() as { email?: string; password?: string };
      if (body.email !== 'ana.e2e@example.com' || body.password !== 'password10') {
        await route.fulfill({
          status: 401,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            status: 401,
            code: 'INVALID_CREDENTIALS',
            title: 'Credenciais inválidas',
            detail: 'Não foi possível autenticar.',
          }),
        });
        return;
      }
      session = true;
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
    if (method === 'POST' && path.endsWith('/auth/refresh')) {
      if (!session) {
        await route.fulfill({
          status: 401,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 401, code: 'UNAUTHENTICATED', title: 'Não autenticado' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'e2e-access', expiresInSeconds: 900, tokenType: 'Bearer' }),
      });
      return;
    }
    if (method === 'POST' && path.endsWith('/auth/logout')) {
      session = false;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (method === 'GET' && path.endsWith('/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ...me, lastOrganizationId, lastEstablishmentId }),
      });
      return;
    }
    if (method === 'DELETE' && path.endsWith('/me/context')) {
      lastOrganizationId = undefined;
      lastEstablishmentId = undefined;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (method === 'POST' && path.endsWith('/me/context')) {
      const body = route.request().postDataJSON() as { establishmentId?: string };
      const establishment =
        body.establishmentId === estBairroId ? me.establishments[1] : me.establishments[0];
      lastOrganizationId = orgId;
      lastEstablishmentId = establishment.id;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: me.organizations[0],
          establishment,
          organizationRole: 'ADMIN',
          establishmentRole: 'ADMIN',
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('login e seleção de estabelecimento no modo API', async ({ page }) => {
  await mockApi(page);
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/login-claro.png', fullPage: true });
  await page.getByRole('radio', { name: 'Escuro' }).click();
  await page.screenshot({ path: 'docs/screenshots/login-escuro.png', fullPage: true });
  await page.getByLabel(/e-mail/i).fill('ana.e2e@example.com');
  await page.getByLabel(/senha/i).fill('password10');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Onde você vai operar?' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/estabelecimento.png', fullPage: true });
  await page.getByRole('button', { name: 'Entrar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.locator('#conteudo').getByText('Loja Centro', { exact: true })).toBeVisible();
  await expect(page.getByText(/mariana/i)).toHaveCount(0);
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(JSON.stringify(storage)).not.toContain('e2e-access');
  expect(JSON.stringify(storage)).not.toContain('e2e-refresh');
});

test('restaura o estabelecimento autorizado após recarregar', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) {
      apiCalls.push(`${request.method()} ${request.url()}`);
    }
  });
  await mockApi(page);
  await page.goto('/entrar');
  await page.getByLabel(/e-mail/i).fill('ana.e2e@example.com');
  await page.getByLabel(/senha/i).fill('password10');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Onde você vai operar?' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  apiCalls.length = 0;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  expect(apiCalls.some((call) => call.includes('/me/context'))).toBeTruthy();
  await expect(page.locator('#conteudo').getByText('Loja Centro', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Onde você vai operar?' })).toHaveCount(0);
});

test('rejeita credenciais inválidas sem cair na demonstração', async ({ page }) => {
  await mockApi(page);
  await page.goto('/entrar');
  await page.getByLabel(/e-mail/i).fill('ana.e2e@example.com');
  await page.getByLabel(/senha/i).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText(/verifique o e-mail e a senha/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});
