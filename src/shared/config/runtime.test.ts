import { describe, expect, it } from 'vitest';
import {
  configureRuntimeForTests,
  isApiMode,
  isDemoMode,
  parseRuntime,
  resolveRuntime,
} from '@/shared/config/runtime';

describe('runtime', () => {
  it('usa demo por padrão', () => {
    expect(resolveRuntime().mode).toBe('demo');
    expect(isDemoMode()).toBe(true);
    expect(isApiMode()).toBe(false);
  });

  it('rejeita modo inválido', () => {
    expect(() => parseRuntime('prod', 'http://127.0.0.1:8080')).toThrow(/VITE_SABLI_MODE inválido/);
    expect(() => parseRuntime('api', '')).toThrow(/VITE_SABLI_API_BASE_URL/);
  });

  it('não troca para DEMO por configuração de teste em produção', () => {
    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    expect(isApiMode()).toBe(true);
    expect(isDemoMode()).toBe(false);
  });
});
