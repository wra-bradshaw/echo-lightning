import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type E2EBrowser = 'chromium' | 'firefox';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export function e2eBrowser(): E2EBrowser {
  return process.env.E2E_BROWSER?.trim().toLowerCase() === 'firefox' ? 'firefox' : 'chromium';
}

export function extensionOutputDir(browser: E2EBrowser): string {
  return path.resolve(projectRoot, '../../.output', browser === 'firefox' ? 'firefox-mv3' : 'chrome-mv3');
}
