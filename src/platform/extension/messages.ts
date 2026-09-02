import type { TabMode } from './mode-store';

export type ExtensionMessage =
  | { type: 'getMode' }
  | { type: 'bootstrap'; url: string; isLoggedOut?: boolean; domLoggedOut?: boolean; isLoggedOutFromDOM?: boolean }
  | { type: 'routeChanged'; url: string; isLoggedOut?: boolean; domLoggedOut?: boolean; isLoggedOutFromDOM?: boolean }
  | { type: 'reportLoggedOut'; url: string }
  | { type: 'enableReplacement' }
  | { type: 'disableReplacement' }
  | { type: 'useOriginal'; url?: string };

export type ExtensionResponse =
  { ok: true; mode: TabMode; reloaded?: boolean; injected?: boolean } | { ok: false; error: string };

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === 'getMode' ||
    type === 'bootstrap' ||
    type === 'routeChanged' ||
    type === 'reportLoggedOut' ||
    type === 'enableReplacement' ||
    type === 'disableReplacement' ||
    type === 'useOriginal'
  );
}
