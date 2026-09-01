import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackPositionQueue } from './playback-sync';

describe('playback position queue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces concurrent positions and keeps the latest unsaved value', async () => {
    let resolveFirst: (() => void) | undefined;
    const write = vi
      .fn<(seconds: number) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const queue = createPlaybackPositionQueue(write, { retryBaseDelayMs: 10, retryMaxDelayMs: 20 });

    queue.save(10.9, 100);
    queue.save(20.8, 100);
    queue.save(30.7, 100);
    expect(write).toHaveBeenCalledWith(10);

    resolveFirst?.();
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(write).toHaveBeenLastCalledWith(30);
    queue.close();
  });

  it('retries failures with bounded backoff and stops after closing', async () => {
    vi.useFakeTimers();
    const write = vi.fn<(seconds: number) => Promise<void>>().mockRejectedValue(new Error('offline'));
    const queue = createPlaybackPositionQueue(write, { retryBaseDelayMs: 10, retryMaxDelayMs: 20 });

    queue.save(40.5, 45);
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(10);
    expect(write).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(20);
    expect(write).toHaveBeenCalledTimes(3);
    queue.close();
    await vi.advanceTimersByTimeAsync(100);
    expect(write).toHaveBeenCalledTimes(3);
  });
});
