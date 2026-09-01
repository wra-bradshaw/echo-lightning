import { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createLightningRuntime } from './runtime';

function gateway() {
  return {
    getCourses: vi.fn(),
    getSectionSyllabus: vi.fn(),
    getPlayerProperties: vi.fn(),
    savePlayerPosition: vi.fn(),
  };
}

describe('LightningRuntime', () => {
  it('mounts once and disposes React, navigation, queries, and resources', async () => {
    const navigation = {
      getSnapshot: () => window.location.href,
      subscribe: () => () => undefined,
      navigate: vi.fn(),
      dispose: vi.fn(),
    };
    const queryClient = new QueryClient();
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries');
    const clear = vi.spyOn(queryClient, 'clear');
    const cleanup = vi.fn();
    const container = document.createElement('div');
    const runtime = createLightningRuntime({
      window,
      sendMessage: vi.fn(async () => ({ ok: true as const, mode: 'replacement' as const })),
      navigationFactory: () => navigation,
      queryClientFactory: () => queryClient,
      gatewayFactory: () => gateway(),
      cleanup,
    });

    runtime.mount(container);
    runtime.mount(container);
    await waitFor(() => expect(container.querySelector('.min-h-screen')).toBeTruthy());
    runtime.dispose();
    runtime.dispose();

    expect(container).toBeEmptyDOMElement();
    expect(navigation.dispose).toHaveBeenCalledOnce();
    expect(cancelQueries).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
