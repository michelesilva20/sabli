import type { ContextResponse, MeResponse, TokenResponse } from '@/shared/api/contracts';

export const API_BASE = 'http://127.0.0.1:8080';

export const apiOrg = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Pizzaria Ana',
  slug: 'pizzaria-ana',
  status: 'ACTIVE',
};

export const apiOrgB = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Grupo Beta',
  slug: 'grupo-beta',
  status: 'ACTIVE',
};

export const apiEst = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: apiOrg.id,
  name: 'Loja Centro',
  slug: 'loja-centro',
  status: 'ACTIVE',
};

export const apiEstBairro = {
  id: '55555555-5555-4555-8555-555555555555',
  organizationId: apiOrg.id,
  name: 'Loja Bairro',
  slug: 'loja-bairro',
  status: 'ACTIVE',
};

export const apiEstSuspended = {
  id: '66666666-6666-4666-8666-666666666666',
  organizationId: apiOrg.id,
  name: 'Loja Suspensa',
  slug: 'loja-suspensa',
  status: 'SUSPENDED',
};

export const apiMe: MeResponse = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
    name: 'Ana Costa',
    status: 'ACTIVE',
  },
  organizations: [apiOrg],
  organizationMemberships: [
    { organizationId: apiOrg.id, userId: '11111111-1111-4111-8111-111111111111', role: 'ADMIN', status: 'ACTIVE' },
  ],
  establishments: [apiEst, apiEstBairro],
  establishmentMemberships: [
    {
      establishmentId: apiEst.id,
      organizationId: apiOrg.id,
      userId: '11111111-1111-4111-8111-111111111111',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      establishmentId: apiEstBairro.id,
      organizationId: apiOrg.id,
      userId: '11111111-1111-4111-8111-111111111111',
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  ],
};

export const apiTokens: TokenResponse = {
  accessToken: 'access-ephemeral',
  expiresInSeconds: 900,
  tokenType: 'Bearer',
};

export const apiContext: ContextResponse = {
  organization: apiOrg,
  establishment: apiEst,
  organizationRole: 'ADMIN',
  establishmentRole: 'ADMIN',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json',
    },
  });
}

export function problem(status: number, code: string, title: string, detail: string): Response {
  return jsonResponse({ status, code, title, detail }, status);
}
