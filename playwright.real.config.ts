import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const apiEnv = path.resolve('apps/api/.env');
if (existsSync(apiEnv)) {
  for (const raw of readFileSync(apiEnv, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value;
  }
}

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
