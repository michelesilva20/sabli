import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import { login, selectEstablishment, getAuthSnapshot, resetAuthSession } from '@/shared/auth/session';
import { appQueryClient } from '@/shared/api/query-client';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import {
  addDraftLine,
  ensureIdempotencyKey,
  getOrderDraft,
  setDraftContext,
} from '@/shared/orders/order-draft';
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
import { bairroTable, centroOccupied, makeTable } from '@/test/dining-fixtures';
import { makeOrder, makePizzaOrder, pizzaProductOf, ticketFromOrder } from '@/test/orders-fixtures';
import type { TableResponse } from '@/shared/api/dining';

type Role = 'ADMIN' | 'WAITER' | 'KITCHEN';
type Scenario = 'ok' | 'quote-fail' | 'price-changed' | 'timeout-once' | 'place-error' | 'stale-kitchen';

function occupancyOf(table: TableResponse): TableResponse['occupancy'] {
  if (table.activeService && table.activeService.status === 'OPEN') return 'OCCUPIED';
  return table.occupancy;
}

function stubOrders(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
  const catalogs = new Map([
    [apiEst.id, { categories: [centroCategory], products: [centroProduct, unavailableProduct, pizzaProductOf(apiEst.id)] }],
    [apiEstBairro.id, { categories: [bairroCategory], products: [bairroProduct] }],
  ]);
  const tables = new Map<string, TableResponse[]>([
    [apiEst.id, [structuredClone(centroOccupied), makeTable()]],
    [apiEstBairro.id, [structuredClone(bairroTable)]],
  ]);
  const orders: ReturnType<typeof makeOrder>[] = [];
  const keys = new Map<string, string>();
  let timedOut = scenario === 'timeout-once';
  let priceOnce = scenario === 'price-changed';
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url);
    const path = parsed.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const headers = new Headers(init?.headers);
    if (method === 'POST' && path === '/api/v1/auth/login') return jsonResponse(apiTokens);
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
    }
    if (method === 'GET' && path === '/api/v1/me') return jsonResponse(apiMe);
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
    const match = path.match(/^\/api\/v1\/establishments\/([0-9a-f-]+)\/(.*)$/i);
    if (!match) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
    const establishmentId = match[1];
    const rest = match[2];
    if (establishmentId !== apiEst.id && establishmentId !== apiEstBairro.id) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
    }
    if (method === 'GET' && rest === 'catalog/categories') {
      return jsonResponse(catalogs.get(establishmentId)?.categories ?? []);
    }
    if (method === 'GET' && rest === 'catalog/products') {
      const items = catalogs.get(establishmentId)?.products ?? [];
      return jsonResponse({ items, page: 0, size: 40, total: items.length });
    }
    if (method === 'GET' && rest === 'catalog/pizza') {
      return jsonResponse({ ...pizzaMenu, settings: { ...pizzaMenu.settings, establishmentId } });
    }
    if (method === 'POST' && rest === 'catalog/pizza/quotes') {
      if (scenario === 'quote-fail') return problem(503, 'API_UNAVAILABLE', 'Indisponível', 'Falha');
      return jsonResponse(pizzaQuote);
    }
    if (method === 'GET' && rest === 'tables') {
      return jsonResponse((tables.get(establishmentId) ?? []).map((table) => ({ ...table, occupancy: occupancyOf(table) })));
    }
    if (method === 'POST' && rest === 'orders') {
      if (role === 'KITCHEN') return problem(403, 'FORBIDDEN', 'Acesso negado', 'Cozinha não cria pedido.');
      const key = headers.get('Idempotency-Key') ?? '';
      const body = JSON.parse(bodyText || '{}') as {
        channel: string;
        tableServiceId?: string;
        expectedTotalCents: number;
        items: { productId?: string; quantity: number }[];
      };
      if (establishmentId !== apiEst.id && body.tableServiceId) {
        return problem(404, 'NOT_FOUND', 'Não encontrado', 'Atendimento de outro estabelecimento.');
      }
      if (timedOut) {
        timedOut = false;
        throw new TypeError('Failed to fetch');
      }
      if (scenario === 'place-error') {
        return problem(422, 'ITEMS_REQUIRED', 'Não processável', 'Falha recuperável.');
      }
      if (priceOnce) {
        priceOnce = false;
        return problem(409, 'PRICE_CHANGED', 'Preço atualizado', 'Diferente', {
          expectedTotalCents: body.expectedTotalCents,
          actualTotalCents: 900,
        });
      }
      const existing = keys.get(`${establishmentId}:${key}`);
      if (existing) {
        const replayed = orders.find((item) => item.id === existing)!;
        return jsonResponse(replayed);
      }
      const created =
        body.items[0]?.productId === pizzaProductOf(apiEst.id).id || body.items[0]?.productId === undefined
          ? makePizzaOrder()
          : makeOrder({
              channel: body.channel,
              tableServiceId: body.tableServiceId ?? null,
              tableId: body.channel === 'TABLE' ? centroOccupied.id : null,
              totalCents: body.expectedTotalCents,
              subtotalCents: body.expectedTotalCents,
            });
      orders.push(created);
      keys.set(`${establishmentId}:${key}`, created.id);
      return jsonResponse(created, 201);
    }
    if (method === 'GET' && rest === 'orders') {
      const items = orders
        .filter((item) => item.establishmentId === establishmentId)
        .map((item) => ({
          id: item.id,
          establishmentId: item.establishmentId,
          channel: item.channel,
          tableId: item.tableId,
          tableServiceId: item.tableServiceId,
          number: item.number,
          placedByName: item.placedByName,
          subtotalCents: item.subtotalCents,
          discountCents: item.discountCents,
          totalCents: item.totalCents,
          commercialStatus: item.commercialStatus,
          productionStatus: item.productionStatus,
          placedAt: item.placedAt,
        }));
      return jsonResponse({ items, page: 0, size: 20, total: items.length });
    }
    if (method === 'GET' && rest.startsWith('orders/')) {
      const id = rest.split('/')[1];
      const found = orders.find((item) => item.id === id && item.establishmentId === establishmentId);
      if (!found) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Pedido ausente.');
      return jsonResponse(found);
    }
    if (method === 'GET' && rest.startsWith('kitchen/tickets')) {
      const items = orders
        .filter((item) => item.establishmentId === establishmentId)
        .map((item) => ticketFromOrder(item));
      if (rest === 'kitchen/tickets') {
        return jsonResponse({ items, page: 0, size: 50, total: items.length });
      }
    }
    const ticketAdvance = rest.match(/^kitchen\/tickets\/([0-9a-f-]+)(?:\/items\/([0-9a-f-]+))?\/advance$/i);
    if (method === 'POST' && ticketAdvance) {
      if (role === 'WAITER') return problem(403, 'FORBIDDEN', 'Acesso negado', 'Garçom não avança produção.');
      if (scenario === 'stale-kitchen') {
        return problem(409, 'STALE_VERSION', 'Versão desatualizada', 'Outra operação alterou o ticket.');
      }
      const ticket = ticketAdvance[1];
      const itemId = ticketAdvance[2];
      const order = orders.find((item) => item.ticketId === ticket);
      if (!order) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Ticket ausente.');
      const nextStatus = (current: string) =>
        current === 'WAITING' ? 'PREPARING' : current === 'PREPARING' ? 'READY' : 'DELIVERED';
      if (itemId) {
        order.items = order.items.map((item) =>
          item.ticketItemId === itemId
            ? { ...item, productionStatus: nextStatus(item.productionStatus), ticketItemVersion: item.ticketItemVersion + 1 }
            : item,
        );
      } else {
        order.items = order.items.map((item) => ({
          ...item,
          productionStatus: nextStatus(item.productionStatus),
          ticketItemVersion: item.ticketItemVersion + 1,
        }));
      }
      order.productionStatus = order.items[0]?.productionStatus ?? 'PREPARING';
      return jsonResponse(ticketFromOrder(order));
    }
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock de pedidos.');
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, orders };
}

function renderApp(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

async function enterCentro(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
  const stub = stubOrders(role, scenario);
  await login('ana@example.com', 'password10');
  await selectEstablishment(apiOrg.id, apiEst.id);
  return stub;
}

describe('pedidos e KDS API', () => {
  it('confirma pedido de mesa e não aplica o desconto ilustrativo', async () => {
    const { fetchMock } = await enterCentro();
    const user = userEvent.setup();
    renderApp('/pdv');
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mesa 02' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Refrigerante' }));
    expect(screen.getByText('Itens do pedido')).toBeInTheDocument();
    expect(screen.queryByText(/desconto ilustrativo/i)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect((await screen.findAllByText('#12')).length).toBeGreaterThan(0);
    const placed = fetchMock.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined;
      return (init?.method ?? 'GET').toUpperCase() === 'POST' && String(call[0]).includes('/orders');
    });
    expect(placed).toBeTruthy();
    const body = JSON.parse(String((placed?.[1] as RequestInit).body));
    expect(body.channel).toBe('TABLE');
    expect(body.expectedTotalCents).toBe(800);
    expect(body.items[0].quantity).toBe(1);
    expect(body.items[0].unitPriceCents).toBeUndefined();
    expect(getOrderDraft().lines).toHaveLength(0);
  });

  it('confirma pedido de balcão', async () => {
    const { fetchMock } = await enterCentro();
    const user = userEvent.setup();
    renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getByRole('button', { name: 'Venda de balcão' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect((await screen.findAllByText('#12')).length).toBeGreaterThan(0);
    const placed = fetchMock.mock.calls.find((call) => String(call[0]).includes('/orders') && (call[1] as RequestInit)?.method === 'POST');
    expect(JSON.parse(String((placed?.[1] as RequestInit).body)).channel).toBe('COUNTER');
  });

  it('avisa na troca de estabelecimento com rascunho', async () => {
    await enterCentro();
    const user = userEvent.setup();
    const view = renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    expect(getOrderDraft().lines).toHaveLength(1);
    view.unmount();
    renderApp('/selecionar-estabelecimento');
    await user.click(screen.getAllByRole('button', { name: 'Entrar' })[1]);
    expect(await screen.findByText('Descartar o rascunho?')).toBeInTheDocument();
    expect(getOrderDraft().lines).toHaveLength(1);
  });

  it('cota pizza real, bloqueia cotação falha e adiciona composição', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/pdv/montar-pizza');
    await user.click(await screen.findByRole('button', { name: /calabresa api/i }));
    expect(await screen.findByText(/total r\$ 72,00/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
    expect(await screen.findByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
    expect(screen.getByText(/pizza grande/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/1 calabresa api/i)).toBeInTheDocument();
  });

  it('bloqueia adicionar pizza se a cotação falhar', async () => {
    await enterCentro('ADMIN', 'quote-fail');
    const user = userEvent.setup();
    renderApp('/pdv/montar-pizza');
    await user.click(await screen.findByRole('button', { name: /calabresa api/i }));
    expect(await screen.findByText(/falha na cotação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar ao pedido' })).toBeDisabled();
  });

  it('pede nova confirmação quando o preço muda e não duplica', async () => {
    const { fetchMock } = await enterCentro('ADMIN', 'price-changed');
    const user = userEvent.setup();
    renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByText('O preço mudou')).toBeInTheDocument();
    expect(getOrderDraft().lines).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /confirmar r\$ 9,00/i }));
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect((await screen.findAllByText('#12')).length).toBeGreaterThan(0);
    const posts = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/orders') && (call[1] as RequestInit)?.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(new Headers((posts[0][1] as RequestInit).headers).get('Idempotency-Key')).toBe(
      new Headers((posts[1][1] as RequestInit).headers).get('Idempotency-Key'),
    );
  });

  it('reusa a chave no retry após timeout ambíguo e preserva o rascunho no erro', async () => {
    const { fetchMock } = await enterCentro('ADMIN', 'timeout-once');
    const user = userEvent.setup();
    renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByText(/não confirmamos se o pedido chegou/i)).toBeInTheDocument();
    expect(getOrderDraft().lines).toHaveLength(1);
    const firstKey = getOrderDraft().idempotencyKey;
    expect(firstKey).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect((await screen.findAllByText('#12')).length).toBeGreaterThan(0);
    const posts = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/orders') && (call[1] as RequestInit)?.method === 'POST');
    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(new Headers((posts[0][1] as RequestInit).headers).get('Idempotency-Key')).toBe(firstKey);
    expect(new Headers((posts[1][1] as RequestInit).headers).get('Idempotency-Key')).toBe(firstKey);
  });

  it('não dispara dois POST no duplo clique', async () => {
    const { fetchMock } = await enterCentro();
    const user = userEvent.setup();
    renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    const send = screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0];
    await Promise.all([user.click(send), user.click(send)]);
    const posts = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/orders') && (call[1] as RequestInit)?.method === 'POST');
    expect(posts).toHaveLength(1);
  });

  it('preserva o rascunho em erro recuperável', async () => {
    await enterCentro('ADMIN', 'place-error');
    const user = userEvent.setup();
    renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect(await screen.findByText(/falha recuperável|não processável|não foi possível/i)).toBeInTheDocument();
    expect(getOrderDraft().lines).toHaveLength(1);
  });

  it('lista pedido persistido com composição e atualiza no KDS', async () => {
    await enterCentro();
    const user = userEvent.setup();
    setDraftContext({
      establishmentId: apiEst.id,
      channel: 'COUNTER',
      tableId: null,
      tableServiceId: null,
      tableNumber: null,
    });
    addDraftLine({
      productId: pizzaProductOf(apiEst.id).id,
      kind: 'PIZZA',
      name: 'Pizza Grande',
      quantity: 1,
      quotedUnitCents: 7200,
      pizza: {
        sizeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        sizeName: 'Grande',
        flavorIds: ['cccccccc-cccc-4ccc-8ccc-cccccccccccc'],
        flavors: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Calabresa API' }],
        extraIds: [],
        extras: [],
      },
    });
    const view = renderApp('/pdv');
    await user.click(await screen.findAllByRole('button', { name: 'Enviar para cozinha' }).then((buttons) => buttons[0]));
    expect((await screen.findAllByText('#13')).length).toBeGreaterThan(0);
    await user.click(screen.getAllByText('#13')[0]);
    const sheet = await screen.findByRole('dialog', { name: /pedido #13/i });
    expect(within(sheet).getByText(/1\/1 calabresa api/i)).toBeInTheDocument();
    expect(within(sheet).queryByText(/desconto ilustrativo/i)).not.toBeInTheDocument();
    view.unmount();
    renderApp('/cozinha');
    expect(await screen.findByText('#13')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /avançar pizza grande/i }));
    expect(await screen.findByRole('button', { name: /marcar pronto/i })).toBeInTheDocument();
  });

  it('trata conflito 409 no KDS sem avançar por conta própria', async () => {
    await enterCentro('ADMIN', 'stale-kitchen');
    const user = userEvent.setup();
    const view = renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    view.unmount();
    renderApp('/cozinha');
    expect(await screen.findByText('#12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /iniciar preparo/i }));
    expect(await screen.findByText(/a fila mudou/i)).toBeInTheDocument();
  });

  it('WAITER cria pedido e KITCHEN não cria, mas avança produção', async () => {
    await enterCentro('WAITER');
    expect(getAuthSnapshot().context?.establishmentRole).toBe('WAITER');
    const user = userEvent.setup();
    const first = renderApp('/pdv');
    await user.click(await screen.findByRole('button', { name: 'Adicionar Refrigerante' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar para cozinha' })[0]);
    expect((await screen.findAllByText('#12')).length).toBeGreaterThan(0);
    first.unmount();
    resetAuthSession();
    appQueryClient.clear();
    stubOrders('KITCHEN');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    renderApp('/pdv');
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Refrigerante' })).not.toBeInTheDocument();
  });

  it('preserva o DEMO sem chamar a API de pedidos', async () => {
    configureRuntimeForTests({ mode: 'demo', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderApp('/pdv');
    expect(await screen.findByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('chave de idempotência', () => {
  it('reusa a mesma chave enquanto o rascunho não muda', () => {
    setDraftContext({
      establishmentId: apiEst.id,
      channel: 'COUNTER',
      tableId: null,
      tableServiceId: null,
      tableNumber: null,
    });
    addDraftLine({
      productId: centroProduct.id,
      kind: 'STANDARD',
      name: 'Refrigerante',
      quantity: 1,
      quotedUnitCents: 800,
    });
    expect(ensureIdempotencyKey()).toBe(ensureIdempotencyKey());
  });
});
