import { describe, expect, it } from 'vitest';
import {
  configuredAuthStatePath,
  extractSessionName,
  parseDebugAppArgs,
} from '../.agents/skills/debug-authenticated-app/scripts/debug-app.ts';

describe('authenticated debug controller helpers', () => {
  it('parses the package-manager argument separator and debug modes', () => {
    expect(parseDebugAppArgs(['--', '--fresh', '--stock', '--trace'])).toEqual({
      fresh: true,
      stock: true,
      trace: true,
    });
  });

  it('extracts only a Playwright tw session name', () => {
    expect(extractSessionName('Run "playwright-cli attach tw-a1b2c3"')).toBe('tw-a1b2c3');
    expect(extractSessionName('No session was created')).toBeUndefined();
  });

  it('resolves the configured auth-state path without reading it', () => {
    expect(configuredAuthStatePath('/tmp/echo-auth.json')).toBe('/tmp/echo-auth.json');
  });
});
