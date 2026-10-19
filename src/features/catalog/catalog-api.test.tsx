import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import {
  login,
  selectEstablishment,
  getAuthSnapshot,
  resetAuthSession,
} from '@/shared/auth/session';
import { appQueryClient } from '@/shared/api/query-client';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import {
  apiContext,
  apiEst,
  apiEstBairro,
  apiMe,
  apiOrg,
  apiTokens,
  jsonResponse,
  problem,
} from '@/test/api-fixtures';
import {
  bairroCategory,
  bairroProduct,
  centroCategory,
  centroProduct,
  pizzaMenu,
  pizzaQuote,
  unavailableProduct,
} from '@/test/catalog-fixtures';

type Role = 'ADMIN' | 'WAITER';

function stubCatalog(role: Role = 'ADMIN') {
  const catalogs = new Map([
    [apiEst.id, { categories: [centroCategory], products: [centroProduct, unavailableProduct] }],
    [apiEstBairro.id, { categories: [bairroCategory], products: [bairroProduct] }],
  ]);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url);
    const path = parsed.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    if (method === 'POST' && path === '/api/v1/auth/login') {
      return jsonResponse(apiTokens);
    }
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
    }
    if (method === 'GET' && path === '/api/v1/me') {
      return jsonResponse(apiMe);
    }
    if (method === 'POST' && path === '/api/v1/me/context') {
      const body = JSON.parse(bodyText || '{}') as { establishmentId: string };
      const establishment = body.establishmentId === apiEstBairro.id ? apiEstBairro : apiEst;
      return jsonResponse({
        ...apiContext,
        establishment,
        establishmentRole: role,
        organizationRole: role === 'ADMIN' ? 'ADMIN' : null,
      });
    }
    const catalogMatch = path.match(
      /^\/api\/v1\/establishments\/([0-9a-f-]+)\/catalog(?:\/(.*))?$/i,
    );
    if (!catalogMatch) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
    }
    const establishmentId = catalogMatch[1];
    const rest = catalogMatch[2] ?? '';
    if (establishmentId !== apiEst.id && establishmentId !== apiEstBairro.id) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
    }
    const bucket = catalogs.get(establishmentId)!;
    if (method === 'GET' && rest === 'categories') {
      return jsonResponse(bucket.categories);
    }
    if (method === 'GET' && rest === 'products') {
      const q = parsed.searchParams.get('q')?.toLowerCase() ?? '';
      const available = parsed.searchParams.get('available');
      const categoryId = parsed.searchParams.get('categoryId');
      const page = Number(parsed.searchParams.get('page') ?? '0');
      const size = Number(parsed.searchParams.get('size') ?? '20');
      let items = bucket.products.filter((item) => item.status === 'ACTIVE');
      if (q) items = items.filter((item) => item.name.toLowerCase().includes(q));
      if (available === 'true') items = items.filter((item) => item.available);
      if (available === 'false') items = items.filter((item) => !item.available);
      if (categoryId) items = items.filter((item) => item.categoryId === categoryId);
      const start = page * size;
      return jsonResponse({
        items: items.slice(start, start + size),
        page,
        size,
        total: items.length,
      });
    }
    if (method === 'POST' && rest === 'products') {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      const body = JSON.parse(bodyText || '{}') as { name: string; categoryId: string; priceCents: number };
      const created = {
        ...centroProduct,
        id: '14141414-1414-4141-8141-141414141414',
        establishmentId,
        categoryId: body.categoryId,
        name: body.name,
        priceCents: body.priceCents,
      };
      bucket.products = [...bucket.products, created];
      return jsonResponse(created, 201);
    }
    if (method === 'PATCH' && rest.startsWith('products/') && rest.endsWith('/availability')) {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      const productId = rest.split('/')[1];
      const body = JSON.parse(bodyText || '{}') as { available: boolean };
      bucket.products = bucket.products.map((item) =>
        item.id === productId ? { ...item, available: body.available, version: item.version + 1 } : item,
      );
      return jsonResponse(bucket.products.find((item) => item.id === productId));
    }
    if (method === 'PATCH' && rest.startsWith('products/') && rest.endsWith('/status')) {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      const productId = rest.split('/')[1];
      const body = JSON.parse(bodyText || '{}') as { status: 'ACTIVE' | 'INACTIVE' };
      bucket.products = bucket.products.map((item) =>
        item.id === productId ? { ...item, status: body.status } : item,
      );
      return jsonResponse(bucket.products.find((item) => item.id === productId));
    }
    if (method === 'PATCH' && rest.startsWith('products/')) {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      const productId = rest.split('/')[1];
      const body = JSON.parse(bodyText || '{}') as { name?: string; priceCents?: number };
      bucket.products = bucket.products.map((item) =>
        item.id === productId
          ? { ...item, name: body.name ?? item.name, priceCents: body.priceCents ?? item.priceCents }
          : item,
      );
      return jsonResponse(bucket.products.find((item) => item.id === productId));
    }
    if (method === 'GET' && rest === 'pizza') {
      return jsonResponse({ ...pizzaMenu, settings: { ...pizzaMenu.settings, establishmentId } });
    }
    if (method === 'PATCH' && rest === 'pizza/settings') {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      const body = JSON.parse(bodyText || '{}') as { strategy: string };
      return jsonResponse({ establishmentId, strategy: body.strategy, version: 1 });
    }
    if (method === 'PATCH' && rest.startsWith('pizza/flavors/')) {
      if (role === 'WAITER') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      return jsonResponse(pizzaMenu.flavors[0]);
    }
    if (method === 'POST' && rest === 'pizza/quotes') {
      return jsonResponse(pizzaQuote);
    }
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock de catálogo.');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

async function enterCentro() {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
  stubCatalog('ADMIN');
  await login('ana@example.com', 'password10');
  await selectEstablishment(apiOrg.id, apiEst.id);
}

describe('catálogo API', () => {
  it('lista produtos reais sem fixtures DEMO', async () => {
    await enterCentro();
    renderApp('/produtos');
    expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument();
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    expect(screen.getByText('Água com gás')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.queryByText(/margherita/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo produto' })).toBeInTheDocument();
  });

  it('filtra por busca e disponibilidade', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/produtos');
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Buscar produto'), 'água');
    expect(await screen.findByText('Água com gás')).toBeInTheDocument();
    expect(screen.queryByText('Refrigerante')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Buscar produto'));
    await user.click(screen.getByRole('button', { name: 'Indisponíveis' }));
    expect(await screen.findByText('Água com gás')).toBeInTheDocument();
    expect(screen.queryByText('Refrigerante')).not.toBeInTheDocument();
  });

  it('cria, edita preço e desativa com ADMIN', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/produtos');
    await user.click(await screen.findByRole('button', { name: 'Novo produto' }));
    await user.type(await screen.findByLabelText(/nome/i), 'Chá gelado');
    const priceField = screen.getByLabelText(/preço/i);
    await user.clear(priceField);
    await user.type(priceField, '6,50');
    await user.click(screen.getByRole('button', { name: 'Criar produto' }));
    expect(await screen.findByText('Chá gelado')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    const price = await screen.findByLabelText(/preço/i);
    await user.clear(price);
    await user.type(price, '9,90');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Refrigerante atualizado')).toBeInTheDocument();
    expect(screen.getByText('Chá gelado')).toBeInTheDocument();
  });

  it('esconde controles administrativos do WAITER e recusa escrita', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    const fetchMock = stubCatalog('WAITER');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    expect(getAuthSnapshot().context?.establishmentRole).toBe('WAITER');
    renderApp('/produtos');
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo produto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar indisponível' })).not.toBeInTheDocument();
    const writes = fetchMock.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      const method = (init?.method ?? 'GET').toUpperCase();
      return method !== 'GET' && method !== 'POST';
    });
    expect(writes.filter((call) => String(call[0]).includes('/catalog/')).length).toBe(0);
  });

  it('troca de estabelecimento limpa o cache do tenant anterior', async () => {
    await enterCentro();
    const first = renderApp('/produtos');
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['catalog', apiEst.id] }).length).toBeGreaterThan(0);
    await selectEstablishment(apiOrg.id, apiEstBairro.id);
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['catalog', apiEst.id] })).toHaveLength(0);
    first.unmount();
    renderApp('/produtos');
    expect(await screen.findByText('Suco de laranja')).toBeInTheDocument();
    expect(screen.queryByText('Refrigerante')).not.toBeInTheDocument();
  });

  it('carga a configuração de pizza e a cotação do servidor', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/produtos');
    await user.click(await screen.findByRole('button', { name: 'Cardápio de pizza' }));
    expect(await screen.findAllByText('Calabresa API')).not.toHaveLength(0);
    expect(await screen.findByText(/total r\$ 72,00/i)).toBeInTheDocument();
    expect(screen.getByText(/cotação informativa/i)).toBeInTheDocument();
  });

  it('mostra erro de rede sem cair no DEMO', async () => {
    await enterCentro();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    renderApp('/produtos');
    expect(await screen.findByText(/não foi possível carregar o cardápio/i)).toBeInTheDocument();
    expect(screen.queryByText(/marguerita/i)).not.toBeInTheDocument();
  });

  it('trata 401, 403 e 404 do catálogo', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    stubCatalog('ADMIN');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/catalog/products')) {
          return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
        }
        if (url.includes('/catalog/categories')) {
          return jsonResponse([centroCategory]);
        }
        return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
      }),
    );
    renderApp('/produtos');
    expect(await screen.findByText(/catálogo não encontrado/i)).toBeInTheDocument();
  });

  it('preserva o DEMO sem chamar a API de catálogo', async () => {
    configureRuntimeForTests({ mode: 'demo', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderApp('/produtos');
    expect(await screen.findByText(/cardápio da casa/i)).toBeInTheDocument();
    expect(await screen.findByText('Calabresa')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
