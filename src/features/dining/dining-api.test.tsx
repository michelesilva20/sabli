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
import type { ServiceResponse, TableResponse } from '@/shared/api/dining';
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
  bairroTable,
  centroAvailable,
  centroOccupied,
  centroReserved,
  makeService,
  makeTable,
  serviceOpenId,
  tableAvailableId,
  tableOccupiedId,
  tableReservedId,
} from '@/test/dining-fixtures';

type Role = 'ADMIN' | 'WAITER' | 'KITCHEN';

function occupancyOf(table: TableResponse): TableResponse['occupancy'] {
  if (table.status === 'INACTIVE' || table.availability === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (table.activeService && table.activeService.status !== 'CLOSED') {
    return table.activeService.status === 'AWAITING_BILL' ? 'AWAITING_BILL' : 'OCCUPIED';
  }
  if (table.availability === 'RESERVED') return 'RESERVED';
  return 'AVAILABLE';
}

function withOccupancy(table: TableResponse): TableResponse {
  return { ...table, occupancy: occupancyOf(table) };
}

function stubDining(role: Role = 'ADMIN', scenario: 'ok' | 'suspended' | 'stale' = 'ok') {
  const stores = new Map<string, TableResponse[]>([
    [apiEst.id, [structuredClone(centroAvailable), structuredClone(centroOccupied), structuredClone(centroReserved)]],
    [apiEstBairro.id, [structuredClone(bairroTable)]],
  ]);
  const history = new Map<string, ServiceResponse[]>([
    [tableOccupiedId, [structuredClone(centroOccupied.activeService!)]],
    [tableAvailableId, []],
    [tableReservedId, []],
  ]);
  let staleOnce = scenario === 'stale';
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url);
    const path = parsed.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : '';
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
    const match = path.match(
      /^\/api\/v1\/establishments\/([0-9a-f-]+)\/(tables|table-services)(?:\/(.*))?$/i,
    );
    if (!match) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
    const establishmentId = match[1];
    const resource = match[2];
    const rest = match[3] ?? '';
    if (establishmentId !== apiEst.id && establishmentId !== apiEstBairro.id) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
    }
    if (scenario === 'suspended') {
      return problem(403, 'TENANT_SUSPENDED', 'Tenant suspenso', 'O estabelecimento está suspenso.');
    }
    const bucket = stores.get(establishmentId) ?? [];
    const canManage = role === 'ADMIN';
    const canOperate = role === 'ADMIN' || role === 'WAITER';
    if (resource === 'table-services' && method === 'GET' && rest.endsWith('/bill')) {
      const serviceId = rest.split('/')[0];
      const owner = bucket.find((item) => item.activeService?.id === serviceId);
      if (!owner?.activeService) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Conta ausente.');
      const occupied = serviceId === serviceOpenId;
      return jsonResponse({
        id: occupied ? 'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1' : 'e6e6e6e6-e6e6-46e6-86e6-e6e6e6e6e6e6',
        establishmentId,
        kind: 'TABLE',
        tableId: owner.id,
        tableNumber: owner.number,
        tableServiceId: serviceId,
        orderId: null,
        subtotalCents: occupied ? 800 : 0,
        discountCents: 0,
        totalCents: occupied ? 800 : 0,
        paidCents: 0,
        remainingCents: occupied ? 800 : 0,
        status: occupied ? 'OPEN' : 'SETTLED',
        settled: !occupied,
        settledAt: occupied ? null : '2026-10-20T12:00:00Z',
        version: 0,
        orders: occupied
          ? [
              {
                id: 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
                number: 12,
                subtotalCents: 800,
                discountCents: 0,
                totalCents: 800,
                placedAt: '2026-10-19T12:20:00Z',
                items: [
                  {
                    id: 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1',
                    kind: 'STANDARD',
                    productId: '88888888-8888-4888-8888-888888888888',
                    productName: 'Refrigerante',
                    quantity: 1,
                    unitPriceCents: 800,
                    lineTotalCents: 800,
                    productionStatus: 'WAITING',
                    ticketItemId: 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1',
                    ticketItemVersion: 0,
                  },
                ],
              },
            ]
          : [],
        payments: [],
      });
    }
    if (resource === 'table-services' && method === 'GET') {
      const items = [...history.values()].flat().filter((item) => item.establishmentId === establishmentId);
      return jsonResponse({ items, page: 0, size: 20, total: items.length });
    }
    if (method === 'GET' && rest === '') {
      const includeInactive = parsed.searchParams.get('includeInactive') === 'true';
      const items = bucket
        .filter((item) => includeInactive || item.status === 'ACTIVE')
        .map(withOccupancy);
      return jsonResponse(items);
    }
    if (method === 'POST' && rest === '') {
      if (!canManage) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      const body = JSON.parse(bodyText || '{}') as { number: number; seats: number; name?: string; area?: string };
      const created = withOccupancy(
        makeTable({
          id: '0c0c0c0c-0c0c-40cc-8ccc-0c0c0c0c0c01',
          establishmentId,
          number: body.number,
          name: body.name ?? null,
          seats: body.seats,
          area: body.area ?? 'Salão Principal',
          occupancy: 'AVAILABLE',
        }),
      );
      stores.set(establishmentId, [...bucket, created]);
      return jsonResponse(created, 201);
    }
    const [tableId, ...tail] = rest.split('/');
    const tableIndex = bucket.findIndex((item) => item.id === tableId);
    if (tableIndex < 0) return problem(404, 'NOT_FOUND', 'Não encontrado', 'A mesa não está neste estabelecimento.');
    let table = bucket[tableIndex];
    const writeTable = (next: TableResponse) => {
      const copy = [...(stores.get(establishmentId) ?? [])];
      copy[tableIndex] = withOccupancy({ ...next, version: next.version });
      stores.set(establishmentId, copy);
      table = copy[tableIndex];
    };
    if (method === 'GET' && tail.length === 0) return jsonResponse(withOccupancy(table));
    if (method === 'PATCH' && tail.length === 0) {
      if (!canManage) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      const body = JSON.parse(bodyText || '{}') as { number: number; seats: number; version?: number; name?: string; area?: string; availability?: TableResponse['availability'] };
      if (staleOnce || (body.version != null && body.version !== table.version)) {
        staleOnce = false;
        return problem(409, 'STALE_VERSION', 'Versão desatualizada', 'A mesa mudou no servidor.');
      }
      writeTable({
        ...table,
        number: body.number,
        seats: body.seats,
        name: body.name ?? table.name,
        area: body.area ?? table.area,
        availability: body.availability ?? table.availability,
        version: table.version + 1,
      });
      return jsonResponse(withOccupancy(table));
    }
    if (method === 'PATCH' && tail[0] === 'availability') {
      if (!canManage) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      const body = JSON.parse(bodyText || '{}') as { availability: TableResponse['availability']; version?: number };
      if (body.version != null && body.version !== table.version) {
        return problem(409, 'STALE_VERSION', 'Versão desatualizada', 'A mesa mudou no servidor.');
      }
      writeTable({ ...table, availability: body.availability, version: table.version + 1 });
      return jsonResponse(withOccupancy(table));
    }
    if (method === 'PATCH' && tail[0] === 'status') {
      if (!canManage) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      const body = JSON.parse(bodyText || '{}') as { status: TableResponse['status'] };
      writeTable({ ...table, status: body.status, version: table.version + 1 });
      return jsonResponse(withOccupancy(table));
    }
    if (tail[0] === 'service' && tail[1] === 'bill' && method === 'POST') {
      if (!canOperate) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      if (!table.activeService || table.activeService.status !== 'OPEN') {
        return problem(422, 'SERVICE_NOT_OPEN', 'Atendimento inválido', 'Só é possível pedir conta em atendimento aberto.');
      }
      const billed = {
        ...table.activeService,
        status: 'AWAITING_BILL' as const,
        requestedBillAt: '2026-10-19T12:40:00Z',
        version: table.activeService.version + 1,
      };
      writeTable({ ...table, activeService: billed });
      history.set(table.id, [billed, ...(history.get(table.id) ?? []).filter((item) => item.id !== billed.id)]);
      return jsonResponse(billed);
    }
    if (tail[0] === 'service' && tail[1] === 'close' && method === 'POST') {
      if (!canOperate) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      if (table.activeService?.id === serviceOpenId) {
        return problem(
          409,
          'CLOSE_REQUIRES_SETTLEMENT',
          'Conta em aberto',
          'O atendimento só pode ser encerrado com a conta quitada.',
        );
      }
      const closed = table.activeService
        ? { ...table.activeService, status: 'CLOSED' as const, closedAt: '2026-10-20T13:00:00Z' }
        : null;
      writeTable({ ...table, activeService: null });
      return jsonResponse(closed);
    }
    if (tail[0] === 'service' && tail[1] === 'reopen' && method === 'POST') {
      if (!canOperate) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      if (!table.activeService || table.activeService.status !== 'AWAITING_BILL') {
        return problem(
          422,
          'SERVICE_NOT_AWAITING_BILL',
          'Atendimento inválido',
          'Só é possível reabrir um atendimento que aguarda a conta.',
        );
      }
      const reopened = { ...table.activeService, status: 'OPEN' as const, version: table.activeService.version + 1 };
      writeTable({ ...table, activeService: reopened });
      return jsonResponse(reopened);
    }
    if (tail[0] === 'service' && method === 'GET' && tail.length === 1) {
      if (!table.activeService) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem atendimento ativo.');
      return jsonResponse(table.activeService);
    }
    if (tail[0] === 'service' && method === 'POST' && tail.length === 1) {
      if (!canOperate) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      if (table.activeService && table.activeService.status !== 'CLOSED') {
        return problem(409, 'TABLE_OCCUPIED', 'Mesa ocupada', 'A mesa já possui um atendimento ativo.');
      }
      const body = JSON.parse(bodyText || '{}') as { guests: number };
      if (body.guests > table.seats) {
        return problem(422, 'GUESTS_EXCEED_CAPACITY', 'Capacidade excedida', 'A quantidade de pessoas excede a capacidade da mesa.');
      }
      const opened = makeService({
        id: '0d0d0d0d-0d0d-40dd-8ddd-0d0d0d0d0d01',
        tableId: table.id,
        establishmentId,
        guests: body.guests,
        status: 'OPEN',
      });
      writeTable({
        ...table,
        availability: table.availability === 'RESERVED' ? 'AVAILABLE' : table.availability,
        activeService: opened,
      });
      history.set(table.id, [opened, ...(history.get(table.id) ?? [])]);
      return jsonResponse(opened, 201);
    }
    if (tail[0] === 'services' && method === 'GET') {
      const items = history.get(table.id) ?? [];
      return jsonResponse({ items, page: 0, size: 10, total: items.length });
    }
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock de mesas.');
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

async function enterCentro(role: Role = 'ADMIN', scenario: 'ok' | 'suspended' | 'stale' = 'ok') {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
  const fetchMock = stubDining(role, scenario);
  await login('ana@example.com', 'password10');
  await selectEstablishment(apiOrg.id, apiEst.id);
  return fetchMock;
}

describe('mesas API', () => {
  it('lista ocupação real do servidor sem fixtures DEMO', async () => {
    await enterCentro();
    renderApp('/mesas');
    expect(await screen.findByRole('heading', { name: 'Mapa de mesas' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /mesa 01, disponível/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mesa 02, ocupada/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mesa 03, reservada/i })).toBeInTheDocument();
    expect(screen.getByText(/em atendimento/i)).toBeInTheDocument();
    expect(screen.queryByText(/consumo ainda não conectado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mariana/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova mesa' })).toBeInTheDocument();
  });

  it('abre mesa disponível, pede conta e reabre o atendimento', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/mesas');
    await user.click(await screen.findByRole('button', { name: /mesa 01, disponível/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 01/i });
    await user.click(within(sheet).getByRole('button', { name: 'Abrir atendimento' }));
    expect(await screen.findByText(/atendimento aberto na mesa 01/i)).toBeInTheDocument();
    expect(await within(sheet).findByText('Ana Costa')).toBeInTheDocument();
    expect(within(sheet).getByText('Há um atendimento aberto nesta mesa.')).toBeInTheDocument();
    expect(await within(sheet).findByText(/quitado/i)).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Pedir conta' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido de conta' }));
    expect(await within(sheet).findByText(/a mesa continua ocupada até a quitação/i)).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Reabrir atendimento' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar reabertura' }));
    expect(await within(sheet).findByText('Há um atendimento aberto nesta mesa.')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Encerrar atendimento' })).toBeInTheDocument();
  });

  it('exige confirmação para mesa reservada e recusa dupla abertura', async () => {
    const fetchMock = await enterCentro();
    const user = userEvent.setup();
    renderApp('/mesas');
    await user.click(await screen.findByRole('button', { name: /mesa 03, reservada/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 03/i });
    await user.click(within(sheet).getByRole('button', { name: 'Abrir atendimento' }));
    expect(await screen.findByRole('heading', { name: 'Abrir mesa reservada' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar abertura' }));
    expect(await within(sheet).findByText('Há um atendimento aberto nesta mesa.')).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Abrir atendimento' })).not.toBeInTheDocument();
    const opens = fetchMock.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      const url = String(call[0]);
      return (init?.method ?? 'GET') === 'POST' && url.includes('/service') && !url.includes('/bill') && !url.includes('/reopen');
    });
    expect(opens).toHaveLength(1);
  });

  it('mostra mesa ocupada, conflito 409 e atualiza a versão', async () => {
    const fetchMock = await enterCentro('ADMIN', 'stale');
    const user = userEvent.setup();
    renderApp('/mesas');
    await user.click(await screen.findByRole('button', { name: /mesa 02, ocupada/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 02/i });
    expect(within(sheet).getByText('Há um atendimento aberto nesta mesa.')).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Abrir atendimento' })).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Editar mesa' }));
    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText(/a mesa mudou no servidor/i)).toBeInTheDocument();
    const patches = fetchMock.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      return (init?.method ?? 'GET') === 'PATCH' && String(call[0]).includes(`/tables/${tableOccupiedId}`);
    });
    expect(patches.length).toBeGreaterThan(0);
  });

  it('esconde administração do WAITER e operação da KITCHEN', async () => {
    await enterCentro('WAITER');
    const waiterView = renderApp('/mesas');
    expect(await screen.findByRole('button', { name: /mesa 01, disponível/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova mesa' })).not.toBeInTheDocument();
    const waiter = userEvent.setup();
    await waiter.click(screen.getByRole('button', { name: /mesa 01, disponível/i }));
    expect(within(await screen.findByRole('dialog', { name: /mesa 01/i })).getByRole('button', { name: 'Abrir atendimento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar mesa' })).not.toBeInTheDocument();
    waiterView.unmount();

    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    appQueryClient.clear();
    stubDining('KITCHEN');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    expect(getAuthSnapshot().context?.establishmentRole).toBe('KITCHEN');
    renderApp('/mesas');
    await userEvent.setup().click(await screen.findByRole('button', { name: /mesa 01, disponível/i }));
    const kitchenSheet = await screen.findByRole('dialog', { name: /mesa 01/i });
    expect(within(kitchenSheet).queryByRole('button', { name: 'Abrir atendimento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova mesa' })).not.toBeInTheDocument();
  });

  it('isola o cache ao trocar de estabelecimento', async () => {
    await enterCentro();
    const first = renderApp('/mesas');
    expect(await screen.findByRole('button', { name: /mesa 01, disponível/i })).toBeInTheDocument();
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['dining', apiEst.id] }).length).toBeGreaterThan(0);
    await selectEstablishment(apiOrg.id, apiEstBairro.id);
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['dining', apiEst.id] })).toHaveLength(0);
    first.unmount();
    renderApp('/mesas');
    expect(await screen.findByRole('button', { name: /mesa 08, disponível/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mesa 01, disponível/i })).not.toBeInTheDocument();
  });

  it('trata tenant suspenso e erro de rede sem cair no DEMO', async () => {
    await enterCentro('ADMIN', 'suspended');
    const suspendedView = renderApp('/mesas');
    expect(await screen.findByText(/estabelecimento suspenso/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mesa 01/i })).not.toBeInTheDocument();
    suspendedView.unmount();

    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    appQueryClient.clear();
    stubDining('ADMIN');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    renderApp('/mesas');
    expect(await screen.findByText(/não foi possível carregar as mesas/i)).toBeInTheDocument();
    expect(screen.queryByText(/mariana/i)).not.toBeInTheDocument();
  });

  it('preserva o DEMO sem chamar a API de mesas', async () => {
    configureRuntimeForTests({ mode: 'demo', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderApp('/mesas');
    expect(await screen.findByText(/toque uma mesa para abrir o atendimento/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /mesa 01, disponível/i })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('cliente de mesas', () => {
  it('não inventa consumo a partir da ocupação', async () => {
    await enterCentro();
    renderApp('/mesas');
    await userEvent.setup().click(await screen.findByRole('button', { name: /mesa 02, ocupada/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 02/i });
    expect(await within(sheet).findByText(/pendente/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/r\$ 8,00/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/desconto persistido r\$ 0,00/i)).toBeInTheDocument();
    expect(screen.queryByText(/saldo demonstrativo/i)).not.toBeInTheDocument();
  });
});
