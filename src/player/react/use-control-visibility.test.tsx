import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlVisibility } from './use-control-visibility';

describe('useControlVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides controls after inactivity when playing', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
  });

  it('resets hide timer on mousemove', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      result.current.onMouseMove({} as never);
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.visible).toBe(false);
  });

  it('resets hide timer on pointer move', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    act(() => {
      vi.advanceTimersByTime(1900);
      result.current.onPointerMove({} as never);
      vi.advanceTimersByTime(1900);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visible).toBe(false);
  });

  it('keeps controls visible when paused', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: false, timeoutMs: 2000 }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.visible).toBe(true);
  });

  it('shows controls again after hide on activity', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onPointerDown({} as never);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
  });

  it('shows on focus and key down', () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onFocusCapture({} as never);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onKeyDown({} as never);
    });
    expect(result.current.visible).toBe(true);
  });

  it('restarts timer when isPlaying toggles', () => {
    const { result, rerender } = renderHook(({ isPlaying }) => useControlVisibility({ isPlaying, timeoutMs: 2000 }), {
      initialProps: { isPlaying: false },
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.visible).toBe(true);
    rerender({ isPlaying: true });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(false);
    rerender({ isPlaying: false });
    expect(result.current.visible).toBe(true);
  });
});
