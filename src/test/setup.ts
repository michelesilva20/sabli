import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 5_000 });
import { appQueryClient } from '@/shared/api/query-client';
import { installSessionRefresh, resetAuthSession } from '@/shared/auth/session';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import { resetDemoSession } from '@/shared/demo/session';
import { resetPaymentAttempts } from '@/shared/billing/payment-attempt';
import { resetOrderDraft } from '@/shared/orders/order-draft';

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
  resetOrderDraft();
  resetPaymentAttempts();
  resetAuthSession();
  installSessionRefresh();
  configureRuntimeForTests(null);
  appQueryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
  globalThis.fetch = originalFetch;
});
