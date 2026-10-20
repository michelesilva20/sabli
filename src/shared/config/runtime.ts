export type SabliMode = 'demo' | 'api';

export interface RuntimeConfig {
  mode: SabliMode;
  apiBaseUrl: string;
}

let testOverride: RuntimeConfig | null = null;
let cached: RuntimeConfig | null = null;

export function runtime(): RuntimeConfig {
  if (testOverride) return testOverride;
  cached ??= resolveRuntime();
  return cached;
}

export function isDemoMode(): boolean {
  return runtime().mode === 'demo';
}

export function isApiMode(): boolean {
  return runtime().mode === 'api';
}

export function resolveRuntime(): RuntimeConfig {
  return parseRuntime(import.meta.env.VITE_SABLI_MODE, import.meta.env.VITE_SABLI_API_BASE_URL);
}

export function parseRuntime(modeRaw: string | undefined, apiBaseUrlRaw: string | undefined): RuntimeConfig {
  const raw = String(modeRaw ?? 'demo')
    .trim()
    .toLowerCase();
  if (raw !== 'demo' && raw !== 'api') {
    throw new Error('VITE_SABLI_MODE inválido. Use demo ou api.');
  }
  const apiBaseUrl = String(apiBaseUrlRaw ?? 'http://127.0.0.1:8080').trim();
  if (raw === 'api' && !apiBaseUrl) {
    throw new Error('VITE_SABLI_API_BASE_URL é obrigatória no modo api.');
  }
  return { mode: raw, apiBaseUrl: apiBaseUrl.replace(/\/$/, '') };
}

export function configureRuntimeForTests(config: RuntimeConfig | null): void {
  if (import.meta.env.MODE === 'production') {
    throw new Error('Não é permitido alterar o modo de operação em produção.');
  }
  testOverride = config;
  cached = null;
}
