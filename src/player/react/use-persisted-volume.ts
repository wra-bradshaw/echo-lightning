/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function usePersistedVolume(
  savedVolume: number | undefined,
  onVolumeChange?: (volume: number) => void,
): readonly [number, (volume: number) => void] {
  const [volume, setVolumeState] = useState(savedVolume ?? 1);
  const onChangeRef = useRef(onVolumeChange);
  const hasHydrated = useRef(false);

  useLayoutEffect(() => {
    onChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  useLayoutEffect(() => {
    setVolumeState(savedVolume ?? 1);
    hasHydrated.current = false;
  }, [savedVolume]);

  useLayoutEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    onChangeRef.current?.(volume);
  }, [volume]);

  const setVolume = useCallback((nextVolume: number) => {
    const safe = Number.isFinite(nextVolume) ? Math.min(5, Math.max(0, nextVolume)) : 0;
    setVolumeState(safe);
  }, []);

  return [volume, setVolume] as const;
}
