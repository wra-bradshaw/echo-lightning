import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMediaPlaybackRate } from './use-media-playback-rate';

describe('useMediaPlaybackRate', () => {
  it('keeps a media element at the requested playback rate', () => {
    const media = document.createElement('video');
    const { rerender } = renderHook(({ rate }) => useMediaPlaybackRate(media, rate), {
      initialProps: { rate: 1 },
    });

    expect(media.playbackRate).toBe(1);

    rerender({ rate: 1.5 });
    expect(media.playbackRate).toBe(1.5);

    rerender({ rate: 2 });
    expect(media.playbackRate).toBe(2);
  });

  it('does nothing when media is null', () => {
    const { rerender } = renderHook(({ rate }) => useMediaPlaybackRate(null, rate), {
      initialProps: { rate: 1 },
    });
    expect(() => rerender({ rate: 2 })).not.toThrow();
  });
});
