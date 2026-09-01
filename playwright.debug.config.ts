import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
process.env.HEADED = process.env.ECHO360_DEBUG_HEADLESS === '0' ? '1' : '0';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 0,
  workers: 1,
  expect: { timeout: 30_000 },
  reporter: 'line',
  use: {
    trace: process.env.ECHO360_DEBUG_TRACE === '1' ? 'on' : 'off',
  },
  projects: [{ name: 'debug', testMatch: /debug\.seed\.spec\.ts/ }],
});
