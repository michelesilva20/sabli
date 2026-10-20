import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /auth\.spec\.ts|catalog\.spec\.ts|dining\.spec\.ts|orders\.spec\.ts|billing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts|catalog\.spec\.ts|dining\.spec\.ts|orders\.spec\.ts|billing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run build:api && npm run preview:api',
      url: 'http://127.0.0.1:4174',
      // Sempre reconstrói o dist-api. Reusar a porta 4174 servia um bundle velho e quebrava o F5.
      timeout: 180_000,
    },
  ],
});
