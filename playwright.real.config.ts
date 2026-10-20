import { defineConfig, devices } from '@playwright/test';

const apiOrigin = process.env.SABLI_E2E_API ?? 'http://127.0.0.1:8080';

export default defineConfig({
  testDir: './e2e',
  testMatch: /real-cycle\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'real-api', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build:api && npx vite preview --outDir dist-api --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_SABLI_MODE: 'api',
      VITE_SABLI_API_BASE_URL: apiOrigin,
    },
  },
});
