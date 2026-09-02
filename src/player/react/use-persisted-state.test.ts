import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePersistedPlaybackRate } from './use-persisted-playback-rate';
import { usePersistedVolume } from './use-persisted-volume';

type Case = {
  name: string;
  useHook: (saved: number | undefined, onChange: (value: number) => void) => readonly [number, (value: number) => void];
  defaultValue: number;
  validValue: number;
  upperBound: number;
  lowerBound: number;
};

const cases: Case[] = [
  {
    name: 'volume',
    useHook: usePersistedVolume,
    defaultValue: 1,
    validValue: 2.5,
    upperBound: 5,
    lowerBound: 0,
  },
  {
    name: 'playback rate',
    useHook: usePersistedPlaybackRate,
    defaultValue: 1,
    validValue: 1.75,
    upperBound: 10,
    lowerBound: 0.25,
  },
];

describe.each(cases)('$name persistence', ({ useHook, defaultValue, validValue, upperBound, lowerBound }) => {
  it('initializes, follows saved changes, and does not persist hydration', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ saved }) => useHook(saved, onChange), {
      initialProps: { saved: validValue as number | undefined },
    });
    expect(result.current[0]).toBe(validValue);
    rerender({ saved: defaultValue + 1 });
    expect(result.current[0]).toBe(defaultValue + 1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses its default and clamps updates', () => {
    const { result } = renderHook(() => useHook(undefined, vi.fn()));
    expect(result.current[0]).toBe(defaultValue);
    act(() => result.current[1](upperBound + 100));
    expect(result.current[0]).toBe(upperBound);
    act(() => result.current[1](lowerBound - 100));
    expect(result.current[0]).toBe(lowerBound);
  });

  it('persists updates and isolates hook instances', () => {
    const onChangeA = vi.fn();
    const onChangeB = vi.fn();
    const { result: resultA } = renderHook(() => useHook(defaultValue, onChangeA));
    const { result: resultB } = renderHook(() => useHook(defaultValue + 1, onChangeB));
    act(() => resultA.current[1](validValue));
    expect(onChangeA).toHaveBeenCalledWith(validValue);
    expect(onChangeB).not.toHaveBeenCalled();
    expect(resultB.current[0]).toBe(defaultValue + 1);
  });
});
