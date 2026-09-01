import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMediaVolume } from './use-media-volume';

describe('useMediaVolume', () => {
  it('keeps a media element at the requested volume', () => {
    const media = document.createElement('video');
    const { rerender } = renderHook(({ volume }) => useMediaVolume(media, volume), { initialProps: { volume: 0.4 } });

    expect(media.volume).toBe(0.4);
    rerender({ volume: 0.8 });
    expect(media.volume).toBe(0.8);
  });
});
