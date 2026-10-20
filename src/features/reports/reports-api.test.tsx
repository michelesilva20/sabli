import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import { login, resetAuthSession, selectEstablishment, getAuthSnapshot } from '@/shared/auth/session';
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
  bairroOverview,
  emptyOperations,
  emptyOverview,
  emptyPayments,
  emptyProducts,
  emptyRevenue,
  emptySales,
  makeOperations,
  makeOverview,
  makePayments,
  makeProducts,
  makeRevenue,
  makeSales,
} from '@/test/reports-fixtures';

type Role = 'ADMIN' | 'CASHIER' | 'WAITER';
type Scenario = 'ok' | 'empty' | 'error';

function stubReports(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
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
    const match = path.match(/^\/api\/v1\/establishments\/([0-9a-f-]+)\/reports\/([a-z]+)$/i);
    if (!match) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
    }
    const establishmentId = match[1];
    const resource = match[2];
    if (role === 'WAITER') {
      return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
    }
    if (role === 'CASHIER' && ['sales', 'revenue', 'products'].includes(resource)) {
      return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
    }
    if (establishmentId !== apiEst.id && establishmentId !== apiEstBairro.id) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
    }
    if (scenario === 'error') {
      return problem(500, 'API_UNAVAILABLE', 'Serviço indisponível', 'Falha.');
    }
    if (establishmentId === apiEstBairro.id) {
      if (resource === 'overview') return jsonResponse(bairroOverview);
      if (resource === 'payments') {
        return jsonResponse({
          ...emptyPayments(),
          receivedCents: 500,
          paymentCount: 1,
          byMethod: [
            { method: 'PIX', count: 1, receivedCents: 500, percent: 100 },
            { method: 'CASH', count: 0, receivedCents: 0, percent: 0 },
            { method: 'DEBIT_CARD', count: 0, receivedCents: 0, percent: 0 },
            { method: 'CREDIT_CARD', count: 0, receivedCents: 0, percent: 0 },
          ],
        });
      }
      if (resource === 'operations') return jsonResponse(emptyOperations());
      if (resource === 'sales') {
        return jsonResponse({
          ...emptySales(),
          salesCount: 1,
          soldCents: 500,
          averageTicketCents: 500,
        });
      }
      if (resource === 'revenue') {
        return jsonResponse({ ...emptyRevenue(), receivedCents: 500, paymentCount: 1 });
      }
      if (resource === 'products') {
        return jsonResponse({
          ...emptyProducts(),
          total: 1,
          items: [{ productId: null, productName: 'Suco de laranja', quantity: 1, soldCents: 500 }],
        });
      }
    }
    if (scenario === 'empty') {
      if (resource === 'overview') return jsonResponse(emptyOverview());
      if (resource === 'sales') return jsonResponse(emptySales());
      if (resource === 'revenue') return jsonResponse(emptyRevenue());
      if (resource === 'products') return jsonResponse(emptyProducts());
      if (resource === 'payments') return jsonResponse(emptyPayments());
      if (resource === 'operations') return jsonResponse(emptyOperations());
    }
    if (resource === 'overview') return jsonResponse(makeOverview());
    if (resource === 'sales') return jsonResponse(makeSales());
    if (resource === 'revenue') return jsonResponse(makeRevenue());
    if (resource === 'products') return jsonResponse(makeProducts());
    if (resource === 'payments') return jsonResponse(makePayments());
    if (resource === 'operations') return jsonResponse(makeOperations());
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock de relatório.');
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

async function enterCentro(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
  const fetchMock = stubReports(role, scenario);
  await login('ana@example.com', 'password10');
  await selectEstablishment(apiOrg.id, apiEst.id);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetAuthSession();
  appQueryClient.clear();
});

describe('dashboard e relatórios API', () => {
  it('mostra indicadores reais no início sem fixtures DEMO', async () => {
    await enterCentro();
    renderApp('/inicio');
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(await screen.findByText('Faturamento recebido')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 39,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Vendas confirmadas')).toBeInTheDocument();
    expect(screen.getByText('por pedido confirmado')).toBeInTheDocument();
    expect(screen.getByText('Contas pendentes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Formas de pagamento' })).toBeInTheDocument();
    expect(screen.queryByText(/operação ainda não conectada/i)).not.toBeInTheDocument();
  });

  it('exibe estado vazio sem série fictícia', async () => {
    await enterCentro('ADMIN', 'empty');
    renderApp('/inicio');
    expect(await screen.findByText('Nenhuma venda no período')).toBeInTheDocument();
    expect(screen.getByText('Nenhum recebimento no período')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 0,00').length).toBeGreaterThan(0);
  });

  it('filtra o período e pede a API de novo', async () => {
    const fetchMock = await enterCentro();
    const user = userEvent.setup();
    renderApp('/inicio');
    expect(await screen.findByText('Faturamento recebido')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '7 dias' }));
    await waitFor(() => {
      const reportCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/reports/overview'));
      expect(reportCalls.some((call) => String(call[0]).includes('from='))).toBe(true);
    });
  });

  it('mostra relatórios com tabelas e gráficos reais', async () => {
    await enterCentro();
    renderApp('/relatorios');
    expect(await screen.findByRole('heading', { name: 'Relatórios' })).toBeInTheDocument();
    expect(await screen.findByText('Vendas e recebimentos por dia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produtos mais vendidos' })).toBeInTheDocument();
    expect(screen.getAllByText('Pizza').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Operação de mesas' })).toBeInTheDocument();
    expect(screen.queryByText(/consolidação oficial virá da API/i)).not.toBeInTheDocument();
  });

  it('recusa waiter nos indicadores e nos relatórios', async () => {
    await enterCentro('WAITER');
    const home = renderApp('/inicio');
    expect(await screen.findByText('Indicadores gerenciais indisponíveis')).toBeInTheDocument();
    expect(screen.queryByText('Faturamento recebido')).not.toBeInTheDocument();
    home.unmount();
    renderApp('/relatorios');
    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
  });

  it('caixa vê overview e pagamentos, sem produtos gerenciais', async () => {
    await enterCentro('CASHIER');
    expect(getAuthSnapshot().context?.establishmentRole).toBe('CASHIER');
    const home = renderApp('/inicio');
    expect(await screen.findByText('Faturamento recebido')).toBeInTheDocument();
    expect(screen.queryByText('Vendas por dia')).not.toBeInTheDocument();
    home.unmount();
    renderApp('/relatorios');
    expect(await screen.findByRole('heading', { name: 'Métodos de pagamento' })).toBeInTheDocument();
    expect(screen.queryByText('Produtos mais vendidos')).not.toBeInTheDocument();
  });

  it('mostra erro HTTP sem cair em fixture', async () => {
    await enterCentro('ADMIN', 'error');
    renderApp('/inicio');
    expect(await screen.findByText('Não foi possível carregar os indicadores')).toBeInTheDocument();
    expect(screen.queryByText('R$ 39,00')).not.toBeInTheDocument();
  });

  it('troca de estabelecimento isola o cache', async () => {
    await enterCentro();
    const first = renderApp('/inicio');
    expect(await screen.findByText('Faturamento recebido')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 39,00').length).toBeGreaterThan(0);
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['reports', apiEst.id] }).length).toBeGreaterThan(0);
    await selectEstablishment(apiOrg.id, apiEstBairro.id);
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['reports', apiEst.id] })).toHaveLength(0);
    first.unmount();
    renderApp('/inicio');
    expect(await screen.findByText('Faturamento recebido')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 5,00').length).toBeGreaterThan(0);
    expect(screen.queryByText('R$ 39,00')).not.toBeInTheDocument();
  });
});

describe('relatórios DEMO', () => {
  it('preserva a leitura ilustrativa no modo demonstração', async () => {
    configureRuntimeForTests({ mode: 'demo', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    renderApp('/relatorios');
    expect(await screen.findByRole('heading', { name: 'Relatórios' })).toBeInTheDocument();
    expect(screen.getByText(/consolidação oficial virá da API/i)).toBeInTheDocument();
  });
});
