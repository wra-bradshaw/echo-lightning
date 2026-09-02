import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePersistedVolume } from './use-persisted-volume';

describe('usePersistedVolume', () => {
  it('initializes from saved volume and updates when saved changes', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ saved }) => usePersistedVolume(saved, onChange), {
      initialProps: { saved: 2 as number | undefined },
    });

    expect(result.current[0]).toBe(2);

    rerender({ saved: 4 });
    expect(result.current[0]).toBe(4);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('defaults to 1 when no saved volume', () => {
    const { result } = renderHook(() => usePersistedVolume(undefined, vi.fn()));
    expect(result.current[0]).toBe(1);
  });

  it('persists volume changes per course via callback', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ saved }) => usePersistedVolume(saved, onChange), {
      initialProps: { saved: 1 as number | undefined },
    });

    act(() => {
      result.current[1](2.5);
    });
    expect(result.current[0]).toBe(2.5);
    expect(onChange).toHaveBeenCalledWith(2.5);

    rerender({ saved: 2 });
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      result.current[1](4);
    });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('clamps volume to 0-5', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePersistedVolume(1, onChange));

    act(() => {
      result.current[1](10);
    });
    expect(result.current[0]).toBe(5);

    act(() => {
      result.current[1](-1);
    });
    expect(result.current[0]).toBe(0);
  });

  it('isolates changes between courses', () => {
    const onChangeA = vi.fn();
    const onChangeB = vi.fn();
    const { result: resultA, rerender: rerenderA } = renderHook(({ saved }) => usePersistedVolume(saved, onChangeA), {
      initialProps: { saved: 1 as number | undefined },
    });
    const { result: resultB } = renderHook(({ saved }) => usePersistedVolume(saved, onChangeB), {
      initialProps: { saved: 3 as number | undefined },
    });

    expect(resultA.current[0]).toBe(1);
    expect(resultB.current[0]).toBe(3);

    act(() => {
      resultA.current[1](2);
    });
    expect(onChangeA).toHaveBeenCalledWith(2);
    expect(onChangeB).not.toHaveBeenCalled();

    rerenderA({ saved: 3 });
    expect(resultA.current[0]).toBe(3);
  });
});
