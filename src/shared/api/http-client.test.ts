import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { type ApiError, ApiUnavailableError, apiRequest, registerAccessRefresh } from '@/shared/api/http-client';
import { writeAccessToken } from '@/shared/auth/token-memory';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import { jsonResponse, problem } from '@/test/api-fixtures';

describe('cliente HTTP', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    writeAccessToken(null);
    registerAccessRefresh(async () => null);
  });

  it('envia credenciais, timeout e trata 401 com refresh', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    writeAccessToken('expired-access');
    registerAccessRefresh(async () => {
      writeAccessToken('fresh-access');
      return 'fresh-access';
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const auth = request.headers.get('Authorization');
      if (auth === 'Bearer expired-access') {
        return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
      }
      expect(auth).toBe('Bearer fresh-access');
      expect(init?.credentials ?? request.credentials).toBe('include');
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await apiRequest(z.object({ ok: z.boolean() }), { path: '/me' });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('propaga 403 sem cair no modo DEMO', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    writeAccessToken('access-ephemeral');
    vi.stubGlobal('fetch', vi.fn(async () => problem(403, 'FORBIDDEN', 'Acesso negado', 'Bloqueado.')));
    await expect(apiRequest(z.object({}), { path: '/me' })).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    } satisfies Partial<ApiError>);
  });

  it('sinaliza API indisponível em falha de rede e 5xx', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await expect(apiRequest(z.object({}), { path: '/me', auth: false })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ title: 'erro' }, 503)));
    await expect(apiRequest(z.object({}), { path: '/me', auth: false })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
  });

  it('envia Idempotency-Key e lê PRICE_CHANGED', async () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    writeAccessToken('access-ephemeral');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('abc');
      return problem(409, 'PRICE_CHANGED', 'Preço atualizado', 'Diferente', {
        expectedTotalCents: 700,
        actualTotalCents: 800,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      apiRequest(z.object({}), {
        path: '/establishments/1/orders',
        method: 'POST',
        body: {},
        headers: { 'Idempotency-Key': 'abc' },
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PRICE_CHANGED',
      expectedTotalCents: 700,
      actualTotalCents: 800,
    } satisfies Partial<ApiError>);
  });
});
