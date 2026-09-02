import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EchoGateway } from '../../domain';
import { usePlaybackSync } from './use-playback-sync';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

function mediaAt(position: number): HTMLVideoElement {
  const media = document.createElement('video');
  Object.defineProperty(media, 'currentTime', { configurable: true, value: position, writable: true });
  Object.defineProperty(media, 'duration', { configurable: true, value: 100 });
  return media;
}

describe('usePlaybackSync', () => {
  it('saves the leader on pause, completed seek, and page exit', async () => {
    const gateway = { savePlayerPosition: vi.fn(async () => undefined) } as unknown as EchoGateway;
    const media = mediaAt(12.9);
    renderHook(() => usePlaybackSync({ gateway, mediaId: 'media-1', leader: media, duration: 100 }), { wrapper });

    await act(async () => {
      media.dispatchEvent(new Event('timeupdate'));
      media.dispatchEvent(new Event('pause'));
      await Promise.resolve();
    });
    await waitFor(() => expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-1', 12));

    media.currentTime = 24.8;
    media.dispatchEvent(new Event('timeupdate'));
    media.dispatchEvent(new Event('seeked'));
    await waitFor(() => expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-1', 24));

    media.currentTime = 150.4;
    media.dispatchEvent(new Event('timeupdate'));
    window.dispatchEvent(new Event('pagehide'));
    await waitFor(() => expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-1', 100, { keepalive: true }));
  });

  it('saves via beacon on visibility hidden and beforeunload', async () => {
    const gateway = { savePlayerPosition: vi.fn(async () => undefined) } as unknown as EchoGateway;
    const media = mediaAt(42.2);
    renderHook(() => usePlaybackSync({ gateway, mediaId: 'media-2', leader: media, duration: 100 }), { wrapper });

    media.dispatchEvent(new Event('timeupdate'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden', writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-2', 42, { keepalive: true }));
    vi.mocked(gateway.savePlayerPosition).mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible', writable: true });

    media.currentTime = 55.9;
    media.dispatchEvent(new Event('timeupdate'));
    window.dispatchEvent(new Event('beforeunload'));
    await waitFor(() => expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-2', 55, { keepalive: true }));
  });

  it('periodically saves while playing and skips when paused', async () => {
    vi.useFakeTimers();
    try {
      const gateway = { savePlayerPosition: vi.fn(async () => undefined) } as unknown as EchoGateway;
      const media = mediaAt(10);
      Object.defineProperty(media, 'paused', { configurable: true, value: false, writable: true });
      renderHook(
        () => usePlaybackSync({ gateway, mediaId: 'media-3', leader: media, duration: 100, periodicIntervalMs: 100 }),
        { wrapper },
      );

      media.dispatchEvent(new Event('timeupdate'));
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
      expect(gateway.savePlayerPosition).toHaveBeenCalledWith('media-3', 10);
      vi.mocked(gateway.savePlayerPosition).mockClear();

      Object.defineProperty(media, 'paused', { configurable: true, value: true });
      media.currentTime = 20;
      media.dispatchEvent(new Event('timeupdate'));
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
      expect(gateway.savePlayerPosition).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
