import { describe, expect, it, vi } from 'vitest';
import { createBackgroundController } from '../src/platform/extension/background-controller';
import { createRuntimeInjector } from '../src/platform/extension/runtime-injector';
import type { TabModeStore } from '../src/platform/extension/mode-store';
import type { ReplacementPolicy } from '../src/platform/extension/replacement-policy';

function deps(getTab: () => Promise<{ url?: string }> = async () => ({ url: 'https://echo360.net.au/courses' })) {
  let mode: 'stock' | 'replacement' = 'stock';
  const events: string[] = [];
  const calls = { reload: 0, update: [] as Array<{ tabId: number; url: string }>, inject: 0 };
  const modes: TabModeStore = {
    read: async () => mode,
    set: async (_tabId, next) => {
      mode = next;
      events.push(`mode:${next}`);
    },
    clear: async () => {
      mode = 'stock';
      events.push('mode:stock');
    },
    enumerate: async () => (mode === 'replacement' ? [{ tabId: 4, mode }] : []),
  };
  const policy: ReplacementPolicy = {
    calculate: () => [],
    sync: async () => {
      events.push('policy:sync');
    },
    remove: async () => {
      events.push('policy:remove');
    },
  };
  const injector = createRuntimeInjector(async () => {
    calls.inject += 1;
  });
  const action = {
    setBadgeText: vi.fn(async () => undefined),
    setBadgeBackgroundColor: vi.fn(async () => undefined),
    setTitle: vi.fn(async () => undefined),
  };
  const value = createBackgroundController({
    modes,
    policy,
    injector,
    isEchoUrl: (url) => url.includes('echo360.net.au'),
    isAuthUrl: (url) => url.includes('login.'),
    isReplacementRoute: (url) => url.endsWith('/courses'),
    tabs: {
      reload: async () => {
        calls.reload += 1;
      },
      update: async (tabId, properties) => {
        calls.update.push({ tabId, url: properties.url });
      },
      get: getTab,
    },
    action,
  });
  return { value, calls, events, action };
}

describe('background replacement controller', () => {
  it('uses session mode as truth and toggles only the clicked Echo tab', async () => {
    const { value, calls, events } = deps();
    await expect(value.toolbarClick({ id: 4, url: 'https://echo360.net.au/courses' })).resolves.toBe('replacement');
    await expect(value.message({ type: 'getMode' }, 4)).resolves.toMatchObject({ mode: 'replacement' });
    await expect(value.toolbarClick({ id: 4, url: 'https://echo360.net.au/courses' })).resolves.toBe('stock');
    expect(events.slice(0, 3)).toEqual(['mode:replacement', 'policy:sync', 'mode:stock']);
    expect(calls.reload).toBe(2);
  });

  it('opens Echo when clicked outside the site', async () => {
    const { value, calls } = deps();
    await value.toolbarClick({ id: 8, url: 'https://example.com/' });
    expect(calls.update).toEqual([{ tabId: 8, url: 'https://echo360.net.au/' }]);
  });

  it('leaves the official login page in stock mode', async () => {
    const { value, calls } = deps();
    await value.toolbarClick({ id: 9, url: 'https://login.echo360.net.au/login' });
    expect(calls.update).toEqual([]);
    expect(calls.reload).toBe(0);
  });

  it('reconstructs the active badge from session storage', async () => {
    const { value, action } = deps();
    await value.toolbarClick({ id: 12, url: 'https://echo360.net.au/courses' });
    await value.reconstruct();
    expect(action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 4, text: 'ON' });
  });

  it('injects only once during one document lifecycle', async () => {
    const { value, calls } = deps();
    await value.toolbarClick({ id: 4, url: 'https://echo360.net.au/courses' });
    await value.bootstrap(4, 'https://echo360.net.au/courses');
    await value.bootstrap(4, 'https://echo360.net.au/courses');
    expect(calls.inject).toBe(1);
  });

  it('clears mode before removing rules and reloading the original location', async () => {
    const { value, calls, events } = deps();
    await value.toolbarClick({ id: 13, url: 'https://echo360.net.au/courses' });
    await value.message({ type: 'useOriginal', url: 'https://echo360.net.au/courses' }, 13);
    expect(calls.update.at(-1)).toEqual({ tabId: 13, url: 'https://echo360.net.au/courses' });
    expect(calls.reload).toBe(1);
    expect(events.slice(-2)).toEqual(['mode:stock', 'policy:remove']);
  });

  it('cleans removed tabs without updating their badge', async () => {
    const { value, action, events } = deps();

    await value.tabRemoved(14);

    expect(events).toEqual(['mode:stock', 'policy:remove']);
    expect(action.setBadgeText).not.toHaveBeenCalled();
  });

  it('clears modes for tabs that cannot be reconstructed', async () => {
    const { value, action, events } = deps(async () => {
      throw new Error('Tab no longer exists.');
    });

    await value.toolbarClick({ id: 15, url: 'https://echo360.net.au/courses' });
    await value.reconstruct();

    expect(await value.message({ type: 'getMode' }, 15)).toMatchObject({ mode: 'stock' });
    expect(events.slice(-2)).toEqual(['mode:stock', 'policy:remove']);
    expect(action.setBadgeText).toHaveBeenCalledTimes(1);
  });
});
