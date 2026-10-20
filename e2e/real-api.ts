import { expect, type APIRequestContext } from '@playwright/test';

export const API = process.env.SABLI_E2E_API ?? 'http://127.0.0.1:8080';
export const API_V1 = `${API}/api/v1`;

export type RealTenant = {
  email: string;
  password: string;
  accessToken: string;
  organizationId: string;
  establishmentId: string;
  tableId: string;
  productName: string;
};

export async function waitForApi(request: APIRequestContext) {
  let last = '';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request.get(`${API}/actuator/health`);
      last = await response.text();
      if (response.ok() && last.includes('"status":"UP"')) return;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`API real não subiu em ${API}. Última resposta: ${last}`);
}

export async function provisionRealTenant(request: APIRequestContext): Promise<RealTenant> {
  await waitForApi(request);
  const stamp = `${Date.now()}`;
  const email = `e2e-${stamp}@example.com`;
  const password = 'password10';
  const bootstrapToken = process.env.SABLI_BOOTSTRAP_SIGNUP_TOKEN?.trim();
  const register = await request.post(`${API_V1}/auth/register-organization`, {
    data: {
      organizationName: `Org E2E ${stamp}`,
      organizationSlug: `org-e2e-${stamp}`,
      establishmentName: `Loja E2E ${stamp}`,
      establishmentSlug: `loja-e2e-${stamp}`,
      name: 'Ana E2E',
      email,
      password,
      ...(bootstrapToken ? { bootstrapToken } : {}),
    },
  });
  expect(register.ok(), await register.text()).toBeTruthy();
  const tokens = (await register.json()) as { accessToken: string };
  expect(tokens.accessToken).toBeTruthy();
  const auth = { Authorization: `Bearer ${tokens.accessToken}` };
  const meResponse = await request.get(`${API_V1}/me`, { headers: auth });
  expect(meResponse.ok()).toBeTruthy();
  const me = (await meResponse.json()) as {
    organizations: { id: string }[];
    establishments: { id: string }[];
  };
  const organizationId = me.organizations[0].id;
  const establishmentId = me.establishments[0].id;
  const category = await request.post(`${API_V1}/establishments/${establishmentId}/catalog/categories`, {
    headers: auth,
    data: { name: 'Bebidas', slug: `bebidas-${stamp}` },
  });
  expect(category.ok(), await category.text()).toBeTruthy();
  const categoryId = ((await category.json()) as { id: string }).id;
  const productName = 'Refrigerante';
  const product = await request.post(`${API_V1}/establishments/${establishmentId}/catalog/products`, {
    headers: auth,
    data: { categoryId, name: productName, priceCents: 800, available: true },
  });
  expect(product.ok(), await product.text()).toBeTruthy();
  const table = await request.post(`${API_V1}/establishments/${establishmentId}/tables`, {
    headers: auth,
    data: { number: 1, name: 'Janela', seats: 4, area: 'Salão' },
  });
  expect(table.ok(), await table.text()).toBeTruthy();
  const tableId = ((await table.json()) as { id: string }).id;
  return {
    email,
    password,
    accessToken: tokens.accessToken,
    organizationId,
    establishmentId,
    tableId,
    productName,
  };
}
