import { loadLocalEnv, requireEnv } from './env.mjs';

loadLocalEnv();

const api = (process.env.SABLI_E2E_API ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const apiV1 = `${api}/api/v1`;
const email = requireEnv('SABLI_DEV_EMAIL');
const password = requireEnv('SABLI_DEV_PASSWORD');
const bootstrapToken = process.env.SABLI_BOOTSTRAP_SIGNUP_TOKEN?.trim() ?? '';
const orgSlug = process.env.SABLI_DEV_ORG_SLUG?.trim() || 'sabli-dev';
const estSlug = process.env.SABLI_DEV_EST_SLUG?.trim() || 'loja-dev';

if (password.length < 10) {
  throw new Error('SABLI_DEV_PASSWORD precisa ter pelo menos 10 caracteres.');
}

async function json(path, options = {}) {
  const response = await fetch(`${apiV1}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { ok: response.ok, status: response.status, body };
}

async function waitHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${api}/actuator/health`);
      const text = await response.text();
      if (response.ok && text.includes('"status":"UP"')) return;
    } catch {
      /* still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`API não respondeu em ${api}/actuator/health`);
}

await waitHealth();

const register = await json('/auth/register-organization', {
  method: 'POST',
  body: JSON.stringify({
    organizationName: 'Sabli Dev',
    organizationSlug: orgSlug,
    establishmentName: 'Loja Dev',
    establishmentSlug: estSlug,
    name: 'Dev Local',
    email,
    password,
    bootstrapToken: bootstrapToken || undefined,
  }),
});

let accessToken = register.body?.accessToken;
if (!accessToken) {
  const login = await json('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    throw new Error(
      `Não foi possível cadastrar nem entrar. Cadastro HTTP ${register.status}. Login HTTP ${login.status}.`,
    );
  }
  accessToken = login.body.accessToken;
  console.log('Organização já existia. Login reutilizado.');
} else {
  console.log('Organização de desenvolvimento criada.');
}

const auth = { Authorization: `Bearer ${accessToken}` };
const me = await json('/me', { headers: auth });
if (!me.ok) throw new Error(`GET /me falhou (${me.status}).`);
const establishmentId = me.body.establishments?.[0]?.id;
if (!establishmentId) throw new Error('A conta não tem estabelecimento.');

const categories = await json(`/establishments/${establishmentId}/catalog/categories`, { headers: auth });
const existingCategory = Array.isArray(categories.body)
  ? categories.body.find((item) => item.slug === 'bebidas-dev' || item.name === 'Bebidas')
  : null;
let categoryId = existingCategory?.id;
if (!categoryId) {
  const created = await json(`/establishments/${establishmentId}/catalog/categories`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: 'Bebidas', slug: 'bebidas-dev' }),
  });
  if (!created.ok) throw new Error(`Categoria HTTP ${created.status}`);
  categoryId = created.body.id;
  console.log('Categoria mínima criada.');
}

const products = await json(`/establishments/${establishmentId}/catalog/products`, { headers: auth });
const productList = Array.isArray(products.body) ? products.body : (products.body?.items ?? []);
const hasDrink = productList.some((item) => item.name === 'Refrigerante');
if (!hasDrink) {
  const created = await json(`/establishments/${establishmentId}/catalog/products`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      categoryId,
      name: 'Refrigerante',
      priceCents: 800,
      available: true,
    }),
  });
  if (!created.ok) throw new Error(`Produto HTTP ${created.status}`);
  console.log('Produto mínimo criado.');
}

const tables = await json(`/establishments/${establishmentId}/tables`, { headers: auth });
const tableList = Array.isArray(tables.body) ? tables.body : [];
if (!tableList.some((item) => item.number === 1)) {
  const created = await json(`/establishments/${establishmentId}/tables`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ number: 1, name: 'Janela', seats: 4, area: 'Salão' }),
  });
  if (!created.ok) throw new Error(`Mesa HTTP ${created.status}`);
  console.log('Mesa 01 criada.');
}

console.log(`Pronto. Entre em http://127.0.0.1:5173/entrar com ${email}.`);
console.log('A senha não é impressa. Use o valor de SABLI_DEV_PASSWORD do seu .env.');
