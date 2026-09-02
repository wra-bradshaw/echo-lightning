import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePersistedPlaybackRate } from './use-persisted-playback-rate';

describe('usePersistedPlaybackRate', () => {
  it('initializes from saved rate and updates when saved changes', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ saved }) => usePersistedPlaybackRate(saved, onChange), {
      initialProps: { saved: 1.5 as number | undefined },
    });

    expect(result.current[0]).toBe(1.5);

    rerender({ saved: 2 });
    expect(result.current[0]).toBe(2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('defaults to 1 when no saved rate', () => {
    const { result } = renderHook(() => usePersistedPlaybackRate(undefined, vi.fn()));
    expect(result.current[0]).toBe(1);
  });

  it('persists rate changes per course via callback', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ saved }) => usePersistedPlaybackRate(saved, onChange), {
      initialProps: { saved: 1 as number | undefined },
    });

    act(() => {
      result.current[1](1.75);
    });
    expect(result.current[0]).toBe(1.75);
    expect(onChange).toHaveBeenCalledWith(1.75);

    rerender({ saved: 2 });
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      result.current[1](0.5);
    });
    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it('clamps playback rate to 0.25-10', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePersistedPlaybackRate(1, onChange));

    act(() => {
      result.current[1](20);
    });
    expect(result.current[0]).toBe(10);

    act(() => {
      result.current[1](0);
    });
    expect(result.current[0]).toBe(0.25);
  });

  it('isolates changes between courses', () => {
    const onChangeA = vi.fn();
    const onChangeB = vi.fn();
    const { result: resultA, rerender: rerenderA } = renderHook(
      ({ saved }) => usePersistedPlaybackRate(saved, onChangeA),
      { initialProps: { saved: 1 as number | undefined } },
    );
    const { result: resultB } = renderHook(({ saved }) => usePersistedPlaybackRate(saved, onChangeB), {
      initialProps: { saved: 2 as number | undefined },
    });

    expect(resultA.current[0]).toBe(1);
    expect(resultB.current[0]).toBe(2);

    act(() => {
      resultA.current[1](1.25);
    });
    expect(onChangeA).toHaveBeenCalledWith(1.25);
    expect(onChangeB).not.toHaveBeenCalled();

    rerenderA({ saved: 2 });
    expect(resultA.current[0]).toBe(2);
  });
});
