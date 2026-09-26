import { afterEach, describe, expect, it } from 'vitest';
import { e2eBrowser, extensionOutputDir } from './browser-env';

afterEach(() => {
  delete process.env.E2E_BROWSER;
});

describe('e2eBrowser', () => {
  it('defaults to chromium when unset', () => {
    expect(e2eBrowser()).toBe('chromium');
  });

  it('selects firefox case-insensitively with whitespace', () => {
    process.env.E2E_BROWSER = '  FireFox ';
    expect(e2eBrowser()).toBe('firefox');
  });

  it('falls back to chromium for unknown values', () => {
    process.env.E2E_BROWSER = 'safari';
    expect(e2eBrowser()).toBe('chromium');
  });
});

describe('extensionOutputDir', () => {
  it('resolves the chromium mv3 output', () => {
    expect(extensionOutputDir('chromium')).toMatch(/(^|[\\/])\.output[\\/]chrome-mv3$/);
  });

  it('resolves the firefox mv3 output', () => {
    expect(extensionOutputDir('firefox')).toMatch(/(^|[\\/])\.output[\\/]firefox-mv3$/);
  });
});
