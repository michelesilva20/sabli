import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { appQueryClient } from '@/shared/api/query-client';
import { installSessionRefresh, resetAuthSession } from '@/shared/auth/session';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import { resetDemoSession } from '@/shared/demo/session';

const originalFetch = globalThis.fetch;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  resetDemoSession();
  resetAuthSession();
  installSessionRefresh();
  configureRuntimeForTests(null);
  appQueryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
  globalThis.fetch = originalFetch;
});
