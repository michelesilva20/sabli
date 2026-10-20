import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import {
  bootstrapSession,
  login,
  logout,
  resetAuthSession,
  selectEstablishment,
  getAuthSnapshot,
} from '@/shared/auth/session';
import { readAccessToken } from '@/shared/auth/token-memory';
import { configureRuntimeForTests, isApiMode, isDemoMode } from '@/shared/config/runtime';
import {
  apiContext,
  apiEst,
  apiEstBairro,
  apiEstSuspended,
  apiMe,
  apiOrg,
  apiTokens,
  jsonResponse,
  problem,
} from '@/test/api-fixtures';

function stubApi(
  scenario: 'ok' | 'restore' | 'invalid' | 'down' | 'revoked' | 'suspended' | 'refresh-fail' | 'forbidden',
) {
  let access = scenario === 'restore' ? 'access-ephemeral' : '';
  let signedIn = scenario === 'restore';
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = new URL(url).pathname;
    const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase();
    const headerList = new Headers(init?.headers ?? (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    if (scenario === 'down') throw new TypeError('Failed to fetch');
    if (method === 'POST' && path === '/api/v1/auth/login') {
      if (scenario === 'invalid') {
        return problem(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas', 'Não foi possível autenticar.');
      }
      signedIn = true;
      access = 'access-ephemeral';
      return jsonResponse(apiTokens);
    }
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      if (scenario === 'refresh-fail' || !signedIn) {
        return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
      }
      access = 'access-refreshed';
      return jsonResponse({ ...apiTokens, accessToken: access });
    }
    if (method === 'POST' && path === '/api/v1/auth/logout') {
      signedIn = false;
      access = '';
      return new Response(null, { status: 204 });
    }
    if (method === 'GET' && path === '/api/v1/me') {
      const auth = headerList.get('Authorization');
      if (auth !== `Bearer ${access}`) {
        return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
      }
      if (scenario === 'revoked') {
        return jsonResponse({ ...apiMe, establishments: [], establishmentMemberships: [] });
      }
      return jsonResponse(apiMe);
    }
    if (method === 'POST' && path === '/api/v1/me/context') {
      const body = JSON.parse(bodyText || '{}') as {
        organizationId: string;
        establishmentId: string;
      };
      if (scenario === 'forbidden') {
        return problem(403, 'FORBIDDEN', 'Acesso negado', 'Você não pode executar esta ação.');
      }
      if (body.establishmentId === apiEstSuspended.id) {
        return problem(403, 'TENANT_SUSPENDED', 'Tenant suspenso', 'A organização ou o estabelecimento está suspenso.');
      }
      if (scenario === 'revoked' || body.establishmentId !== apiEst.id && body.establishmentId !== apiEstBairro.id) {
        return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
      }
      const establishment = body.establishmentId === apiEstBairro.id ? apiEstBairro : apiEst;
      return jsonResponse({
        ...apiContext,
        establishment,
      });
    }
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, ...view };
}

function useApi() {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
}

describe('sessão API', () => {
  it(
    'faz login válido e escolhe estabelecimento',
    async () => {
    useApi();
    stubApi('ok');
    const user = userEvent.setup();
    renderApp('/entrar');
    await user.type(await screen.findByLabelText(/e-mail/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password10');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Onde você vai operar?' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Entrar' })[0]);
    await waitFor(() => {
      expect(getAuthSnapshot().context?.establishment?.id).toBe(apiEst.id);
    });
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.getAllByText(/loja centro/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/mariana/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(readAccessToken()).toBeTruthy();
    expect(JSON.stringify(localStorage)).not.toMatch(/access-ephemeral|refresh/i);
    },
    15_000,
  );

  it('mostra erro genérico para credenciais inválidas', async () => {
    useApi();
    stubApi('invalid');
    const user = userEvent.setup();
    renderApp('/entrar');
    await user.type(await screen.findByLabelText(/e-mail/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/verifique o e-mail e a senha/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(readAccessToken()).toBeNull();
  });

  it('faz logout e revoga a sessão', async () => {
    useApi();
    stubApi('ok');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    await logout();
    expect(getAuthSnapshot().status).toBe('anonymous');
    expect(readAccessToken()).toBeNull();
  });

  it('renova o access token expirado', async () => {
    useApi();
    stubApi('restore');
    await bootstrapSession();
    expect(readAccessToken()).toBe('access-refreshed');
    expect(getAuthSnapshot().me?.user.email).toBe('ana@example.com');
  });

  it('trata falha de refresh como sessão expirada', async () => {
    useApi();
    stubApi('refresh-fail');
    await bootstrapSession();
    expect(getAuthSnapshot().status).toBe('anonymous');
    expect(readAccessToken()).toBeNull();
  });

  it('seleciona organização e troca o contexto', async () => {
    useApi();
    stubApi('ok');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    expect(getAuthSnapshot().context?.establishment?.id).toBe(apiEst.id);
    await selectEstablishment(apiOrg.id, apiEstBairro.id);
    expect(getAuthSnapshot().context?.establishment?.id).toBe(apiEstBairro.id);
  });

  it('bloqueia membership revogada e tenant suspenso', async () => {
    useApi();
    stubApi('revoked');
    await login('ana@example.com', 'password10');
    expect(getAuthSnapshot().me?.establishments).toHaveLength(0);
    await expect(selectEstablishment(apiOrg.id, apiEst.id)).rejects.toMatchObject({ status: 404 });
    stubApi('ok');
    await login('ana@example.com', 'password10');
    await expect(selectEstablishment(apiOrg.id, apiEstSuspended.id)).rejects.toMatchObject({
      code: 'TENANT_SUSPENDED',
    });
  });

  it('protege rota privada e responde 401', async () => {
    useApi();
    stubApi('refresh-fail');
    renderApp('/inicio');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Início' })).not.toBeInTheDocument();
  });

  it('não faz fallback silencioso para DEMO quando a API cai', async () => {
    useApi();
    stubApi('down');
    const user = userEvent.setup();
    renderApp('/entrar');
    await user.type(await screen.findByLabelText(/e-mail/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password10');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/serviço de autenticação está indisponível/i)).toBeInTheDocument();
    expect(isApiMode()).toBe(true);
    expect(isDemoMode()).toBe(false);
    expect(screen.queryByText(/mariana/i)).not.toBeInTheDocument();
  });

  it('mostra 403 sem dados operacionais', async () => {
    useApi();
    stubApi('forbidden');
    await login('ana@example.com', 'password10');
    await expect(selectEstablishment(apiOrg.id, apiEst.id)).rejects.toMatchObject({ status: 403 });
    expect(getAuthSnapshot().context).toBeNull();
  });
});

describe('modo DEMO', () => {
  it('preserva a sessão demonstrativa sem chamar a API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderApp('/inicio');
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.getByText(/mariana\./i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('módulo operacional no modo API', () => {
  it('não apresenta fixtures do PDV', async () => {
    useApi();
    stubApi('ok');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    renderApp('/pdv');
    expect(await screen.findByText(/ainda não disponível no modo api/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Calabresa' })).not.toBeInTheDocument();
  });
});
