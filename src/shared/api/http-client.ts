import { z, type ZodType } from 'zod';
import { problemDetailSchema } from '@/shared/api/contracts';
import { readAccessToken } from '@/shared/auth/token-memory';
import { runtime } from '@/shared/config/runtime';

const DEFAULT_TIMEOUT_MS = 15_000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;

  constructor(status: number, code: string, title: string, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.title = title;
  }
}

export class ApiUnavailableError extends ApiError {
  constructor(detail = 'O serviço está indisponível.') {
    super(0, 'API_UNAVAILABLE', 'Serviço indisponível', detail);
    this.name = 'ApiUnavailableError';
  }
}

type RefreshHandler = () => Promise<string | null>;

let refreshHandler: RefreshHandler | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function registerAccessRefresh(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export function apiUrl(path: string): string {
  const prefix = '/api/v1';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${runtime().apiBaseUrl}${prefix}${normalized}`;
}

export async function apiRequest<T>(
  schema: ZodType<T>,
  options: {
    path: string;
    method?: HttpMethod;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
    auth?: boolean;
    retryOnUnauthorized?: boolean;
  },
): Promise<T> {
  const method = options.method ?? 'GET';
  const auth = options.auth ?? true;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cleanup } = mergeAbort(timeoutMs, options.signal);

  try {
    const headers = new Headers();
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (auth) {
      const token = readAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(apiUrl(options.path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal,
    });

    if (response.status === 401 && auth && options.retryOnUnauthorized !== false) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiRequest(schema, { ...options, retryOnUnauthorized: false });
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      if (response.status >= 500) {
        throw new ApiUnavailableError();
      }
      throw toApiError(response.status, payload);
    }
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof z.ZodError) {
      throw new ApiError(0, 'CONTRACT', 'Contrato inválido', 'A resposta da API não pôde ser validada.');
    }
    throw new ApiUnavailableError();
  } finally {
    cleanup();
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshHandler) return null;
  refreshInFlight ??= refreshHandler().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function mergeAbort(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  external?.addEventListener('abort', onAbort);
  if (external?.aborted) controller.abort();
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const problem = problemDetailSchema.safeParse(payload);
  const code = problem.success ? (problem.data.code ?? defaultCode(status)) : defaultCode(status);
  const title = problem.success ? (problem.data.title ?? defaultTitle(status)) : defaultTitle(status);
  const detail =
    problem.success && problem.data.detail
      ? problem.data.detail
      : 'A solicitação não pôde ser concluída.';
  return new ApiError(status, code, title, detail);
}

function defaultCode(status: number): string {
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status >= 500) return 'API_UNAVAILABLE';
  return 'REQUEST_FAILED';
}

function defaultTitle(status: number): string {
  if (status === 401) return 'Não autenticado';
  if (status === 403) return 'Acesso negado';
  if (status >= 500) return 'Serviço indisponível';
  return 'Falha na solicitação';
}
