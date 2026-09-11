import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlVisibility } from './use-control-visibility';

describe('useControlVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('hides controls after inactivity when playing', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
  });

  it('resets hide timer on mousemove', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      result.current.onMouseMove({} as never);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(result.current.visible).toBe(false);
  });

  it('resets hide timer on pointer move', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1900);
      result.current.onPointerMove({} as never);
      await vi.advanceTimersByTimeAsync(1900);
    });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.visible).toBe(false);
  });

  it('keeps controls visible when paused', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: false, timeoutMs: 2000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.visible).toBe(true);
  });

  it('shows controls again after hide on activity', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onPointerDown({} as never);
    });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
  });

  it('shows on focus and key down', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onFocusCapture({} as never);
    });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
    act(() => {
      result.current.onKeyDown({} as never);
    });
    expect(result.current.visible).toBe(true);
  });

  it('restarts timer when isPlaying toggles', async () => {
    const { result, rerender } = renderHook(({ isPlaying }) => useControlVisibility({ isPlaying, timeoutMs: 2000 }), {
      initialProps: { isPlaying: false },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.visible).toBe(true);
    rerender({ isPlaying: true });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
    rerender({ isPlaying: false });
    expect(result.current.visible).toBe(true);
  });

  it('keeps controls visible while a drag is held without movement', async () => {
    const { result } = renderHook(() => useControlVisibility({ isPlaying: true, timeoutMs: 2000, holdVisible: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.visible).toBe(true);
  });

  it('resumes the hide timer after the hold is released', async () => {
    const { result, rerender } = renderHook(
      ({ holdVisible }) => useControlVisibility({ isPlaying: true, timeoutMs: 2000, holdVisible }),
      { initialProps: { holdVisible: true } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.visible).toBe(true);
    rerender({ holdVisible: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(result.current.visible).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.visible).toBe(false);
  });

  it('reveals controls when a hold starts after hide', async () => {
    const { result, rerender } = renderHook(
      ({ holdVisible }) => useControlVisibility({ isPlaying: true, timeoutMs: 2000, holdVisible }),
      { initialProps: { holdVisible: false } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.visible).toBe(false);
    rerender({ holdVisible: true });
    expect(result.current.visible).toBe(true);
  });
});
