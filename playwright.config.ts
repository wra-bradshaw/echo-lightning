import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Node 24 can load an ignored local .env without adding a runtime dependency.
// Existing shell/CI variables remain authoritative.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  workers: 1,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    trace: 'off',
  },
  projects: [
    { name: 'extension', testMatch: /(?:extension|lightning)\.spec\.ts/ },
    { name: 'discovery', testMatch: /discovery\.spec\.ts/ },
    {
      name: 'debug',
      testMatch: /debug\.seed\.spec\.ts/,
      timeout: 0,
      expect: { timeout: 30_000 },
      use: { trace: process.env.ECHO360_DEBUG_TRACE === '1' ? 'on' : 'off' },
    },
  ],
});
