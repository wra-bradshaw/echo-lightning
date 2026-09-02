/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function usePersistedPlaybackRate(
  savedPlaybackRate: number | undefined,
  onPlaybackRateChange?: (rate: number) => void,
): readonly [number, (rate: number) => void] {
  const [playbackRate, setPlaybackRateState] = useState(savedPlaybackRate ?? 1);
  const onChangeRef = useRef(onPlaybackRateChange);
  const hasHydrated = useRef(false);

  useLayoutEffect(() => {
    onChangeRef.current = onPlaybackRateChange;
  }, [onPlaybackRateChange]);

  useLayoutEffect(() => {
    setPlaybackRateState(savedPlaybackRate ?? 1);
    hasHydrated.current = false;
  }, [savedPlaybackRate]);

  useLayoutEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    onChangeRef.current?.(playbackRate);
  }, [playbackRate]);

  const setPlaybackRate = useCallback((nextRate: number) => {
    const safe = Number.isFinite(nextRate) ? Math.min(10, Math.max(0.25, nextRate)) : 1;
    setPlaybackRateState(safe);
  }, []);

  return [playbackRate, setPlaybackRate] as const;
}
