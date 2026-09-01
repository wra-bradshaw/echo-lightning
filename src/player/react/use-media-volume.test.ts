import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaVolume } from './use-media-volume';

describe('useMediaVolume', () => {
  it('keeps a media element at the requested volume', () => {
    const media = document.createElement('video');
    const { rerender } = renderHook(({ volume }) => useMediaVolume(media, volume), { initialProps: { volume: 0.4 } });

    expect(media.volume).toBe(0.4);
    rerender({ volume: 0.8 });
    expect(media.volume).toBe(0.8);
  });

  it('uses a gain node when the requested volume exceeds the media limit', () => {
    const media = document.createElement('video');
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const gain = { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } };
    const audioContext = {
      createGain: vi.fn(() => gain),
      createMediaElementSource: vi.fn(() => source),
      destination: {},
      resume: vi.fn(() => Promise.resolve()),
    };
    const audioContextConstructor = vi.fn(function () {
      return audioContext;
    });
    const descriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: audioContextConstructor,
      writable: true,
    });

    try {
      const { rerender, unmount } = renderHook(({ volume }) => useMediaVolume(media, volume), {
        initialProps: { volume: 2.5 },
      });

      expect(media.volume).toBe(1);
      expect(gain.gain.value).toBe(2.5);
      expect(source.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(audioContext.destination);

      rerender({ volume: 5 });
      expect(gain.gain.value).toBe(5);

      unmount();
      expect(source.disconnect).toHaveBeenCalled();
      expect(gain.disconnect).toHaveBeenCalled();
    } finally {
      if (descriptor) Object.defineProperty(window, 'AudioContext', descriptor);
      else delete (window as Window & { AudioContext?: unknown }).AudioContext;
    }
  });
});
