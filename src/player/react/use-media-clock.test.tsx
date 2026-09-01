import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMediaClock } from './use-media-clock';

function mediaAt(position: number): HTMLVideoElement {
  const media = document.createElement('video');
  Object.defineProperty(media, 'currentTime', { configurable: true, value: position, writable: true });
  return media;
}

describe('useMediaClock', () => {
  it('starts from the media position and reacts to time updates', () => {
    const media = mediaAt(12);
    const { result } = renderHook(() => useMediaClock(media));

    expect(result.current).toBe(12);

    act(() => {
      media.currentTime = 24;
      media.dispatchEvent(new Event('timeupdate'));
    });

    expect(result.current).toBe(24);
  });

  it('keeps the last position while a replacement media element is initializing', () => {
    const first = mediaAt(12);
    const second = mediaAt(0);
    const { result, rerender } = renderHook(({ media }) => useMediaClock(media), {
      initialProps: { media: first },
    });

    rerender({ media: second });

    expect(result.current).toBe(12);
  });
});
